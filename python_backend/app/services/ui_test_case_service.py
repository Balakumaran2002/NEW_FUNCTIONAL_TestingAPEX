import os
import json
import io
import urllib.parse
from pathlib import Path
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa
from app.config import app_config
from app.ai.ai_factory import AIFactory

class UITestCaseService:
    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / "templates"
        self.env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        self.reports_dir = app_config.workspace_directory / "reports"

    def _get_project_data(self, project_id: str):
        from app.database import SessionLocal
        from app.db_models import Repository, Analysis
        db = SessionLocal()
        try:
            repo = db.query(Repository).filter(Repository.name == project_id).first()
            if not repo:
                repo = db.query(Repository).filter(Repository.repo_url == project_id).first()
            if repo:
                analysis = db.query(Analysis).filter(Analysis.repository_id == repo.id).order_by(Analysis.created_at.desc()).first()
                if analysis:
                    return {
                        "repoUrl": repo.repo_url,
                        "projectType": analysis.project_type,
                        "isJava": analysis.project_type.lower() == "java" if analysis.project_type else False,
                        "analysis_id": analysis.id
                    }
            raise Exception(f"No analysis data found for {project_id}. Please run repository analysis first.")
        finally:
            db.close()

    def _extract_ui_code(self, repo_path: Path, is_java: bool) -> str:
        print(f"\n[UI Scanner] Scanning project extracted to: {repo_path}")
        code_chunks = []
        extensions = [".html", ".jsp", ".jsx", ".tsx", ".vue", ".ts", ".js"]
        
        # Determine specific paths to scan
        scan_paths = [repo_path]
        if is_java:
            print("[UI Scanner] Java project detected. Prioritizing Spring Boot template folders.")
            spring_paths = [
                repo_path / "src" / "main" / "resources" / "templates",
                repo_path / "src" / "main" / "webapp",
                repo_path / "src" / "main" / "resources" / "static",
                repo_path / "src" / "main" / "resources" / "public"
            ]
            valid_spring_paths = [p for p in spring_paths if p.exists()]
            if valid_spring_paths:
                scan_paths = valid_spring_paths
            else:
                print("[UI Scanner] Standard Spring Boot folders not found. Scanning entire repository.")

        total_files_scanned = 0
        ui_files_found = []

        for base_path in scan_paths:
            for root, dirs, files in os.walk(base_path):
                if any(skip in root for skip in [".git", "node_modules", "target", "build", "venv", "__pycache__"]):
                    continue
                for file in files:
                    total_files_scanned += 1
                    ext = os.path.splitext(file)[1]
                    if ext in extensions:
                        file_path = Path(root) / file
                        try:
                            content = file_path.read_text(encoding="utf-8")
                            
                            # Simple heuristic to include file if it looks like a UI view or component
                            if ext in [".html", ".jsp", ".vue"] or "<html" in content or "<div" in content or "export default" in content or "<template>" in content or "React" in content:
                                ui_files_found.append(file_path.relative_to(repo_path).as_posix())
                                code_chunks.append(f"--- File: {file_path.name} ---\n{content[:2500]}") # Truncate to avoid massive prompts
                        except Exception:
                            pass
                            
        print(f"[UI Scanner] Total files found: {total_files_scanned}")
        print(f"[UI Scanner] Total UI files identified: {len(ui_files_found)}")
        if ui_files_found:
            print(f"[UI Scanner] UI files:\n - " + "\n - ".join(ui_files_found[:15]) + ("\n...and more" if len(ui_files_found) > 15 else ""))
            
        if not code_chunks:
            error_msg = f"No UI source code detected for analysis. Searched in: {', '.join([str(p.relative_to(repo_path)) if p != repo_path else 'Root directory' for p in scan_paths])}. Ensure project contains supported UI files (.html, .jsp, .jsx, .vue)."
            print(f"[UI Scanner] {error_msg}")
            raise Exception(error_msg)
            
        return "\n\n".join(code_chunks[:25]) # Limit to top 25 UI files to fit in prompt

    def generate_ui_test_cases(self, project_id: str, api_key: str, model_name: str, force_regenerate: bool = False) -> str:
        print(f"\n========== STARTING UI TEST CASE GENERATION ==========")
        project_data = self._get_project_data(project_id)
        repo_url = project_data.get("repoUrl", project_id)
        project_name = repo_url.split("/")[-1].replace(".git", "") if "/" in repo_url else "Analyzed Project"
        project_type = project_data.get("projectType", "Java")
        is_java = project_data.get("isJava", False)
        
        safe_dir_name = urllib.parse.quote(project_name, safe='')
        project_dir = self.reports_dir / safe_dir_name
        project_dir.mkdir(parents=True, exist_ok=True)

        html_path = project_dir / "ui-functional-test-scope.html"
        pdf_path = project_dir / "ui-functional-test-scope.pdf"
        json_path = project_dir / "ui-functional-test-scope.json"

        # ── DISK CACHE CHECK ──────────────────────────────────────────────────
        # If JSON cache exists on disk with real test cases, skip the LLM call entirely
        if not force_regenerate and json_path.exists() and html_path.exists():
            try:
                cached = json.loads(json_path.read_text(encoding="utf-8"))
                cached_cases = cached.get("test_cases", [])
                if len(cached_cases) > 0:
                    print(f"[UI Scanner] CACHE HIT — {len(cached_cases)} cached test cases on disk. Skipping LLM. ⚡")
                    print(f"========== COMPLETED UI TEST CASE GENERATION (from disk cache) ==========\n")
                    return str(html_path)
            except Exception:
                pass  # Fall through to LLM if cache is corrupt

        # ── DATABASE CACHE CHECK ─────────────────────────────────────────────
        if not force_regenerate:
            try:
                from app.database import SessionLocal
                from app.db_models import TestCase
                db = SessionLocal()
                try:
                    analysis_id = project_data.get("analysis_id")
                    if analysis_id:
                        db_cases = db.query(TestCase).filter(
                            TestCase.analysis_id == analysis_id,
                            TestCase.test_type == "UI"
                        ).all()
                        if len(db_cases) > 0:
                            print(f"[UI Scanner] DB CACHE HIT — {len(db_cases)} UI test cases in database. Skipping LLM. ⚡")
                            # Rebuild JSON cache from DB so next check is disk-based (faster)
                            if not json_path.exists():
                                cached_data = {
                                    "summary": [],
                                    "metrics": {"pages_to_test": len(db_cases), "detected_routes": 0, "forms_detected": 0, "data_tables": 0},
                                    "test_cases": [
                                        {"route": tc.file_path or "/", "scenario": tc.name, "steps": tc.description or "", "type": "UI", "interaction": "Yes"}
                                        for tc in db_cases
                                    ]
                                }
                                json_path.write_text(json.dumps(cached_data, indent=2), encoding="utf-8")
                            print(f"========== COMPLETED UI TEST CASE GENERATION (from DB cache) ==========\n")
                            return str(html_path) if html_path.exists() else ""
                finally:
                    db.close()
            except Exception as e:
                print(f"[UI Scanner] DB cache check failed (non-fatal): {e}")
        # ── END CACHE CHECKS ─────────────────────────────────────────────────

        # Fix repo_path resolution: analysis_service clones to workspace_directory / project_name
        repo_path = app_config.get_project_dir(project_name)
        if not repo_path.exists():
            repo_path = Path(repo_url) if os.path.isabs(repo_url) else repo_path
            
        if not repo_path.exists():
            raise Exception(f"Repository directory not found at {repo_path}. Please run repository analysis first.")

        # Extract UI Code. This will raise an Exception if no files are found.
        code_context = self._extract_ui_code(repo_path, is_java)

        system_instruction = (
            "You are an expert QA Automation Architect. "
            "Analyze the provided source code (JSP, React, Vue, HTML, etc) and generate comprehensive, project-specific UI Functional Test Cases. "
            "For every page detected, you MUST generate business test scenarios automatically (e.g. 'Register new customer'). "
            "You MUST accurately detect specific elements: Routes, Forms, Input fields, Buttons, Links, Tables, Dropdowns, Checkboxes, Radio buttons, Date pickers, File uploads. "
            "Provide realistic, step-by-step test execution steps representing a business workflow. "
            "Format the output strictly as a JSON object. Do not use markdown wrappers like ```json. "
            "The JSON object MUST have the following keys exactly:\n"
            "'summary': A list of objects with keys: 'scenario', 'purpose', 'expected', 'migration_result' (value 'Passed'), 'status' (value 'Pass').\n"
            "'metrics': An object with keys: 'pages_to_test' (integer), 'detected_routes' (integer), 'forms_detected' (integer), 'data_tables' (integer).\n"
            "'test_cases': A list of objects with keys: 'route', 'type' (e.g. JSP Page, React Component), 'scenario', 'interaction' (e.g. 'Yes', 'Page load only'), 'steps' (string, e.g. '1. Enter username 2. Enter password 3. Click Login 4. Verify Dashboard')."
        )

        user_prompt = (
            f"Generate business scenario UI test cases for the following source code.\n"
            f"Make sure the numbers in 'metrics' reflect the actual forms, routes, and tables found in the code.\n\n"
            f"Source Code:\n{code_context}\n"
        )

        user_prompt = user_prompt[:25000]
        
        print("[UI Scanner] Calling LLM to generate test cases (no cache found)...")
        try:
            ai_client = AIFactory.get_client()
            ai_result = ai_client.generate(user_prompt, system_instruction, api_key, model_name)
            cleaned_json = ai_result.replace("```json", "").replace("```", "").strip()
            result_data = json.loads(cleaned_json)
        except Exception as e:
            print(f"[UI Scanner Error] LLM generation failed: {e}. Using empty data.")
            result_data = {
                "summary": [],
                "metrics": {"pages_to_test": 0, "detected_routes": 0, "forms_detected": 0, "data_tables": 0},
                "test_cases": []
            }
            
        # JSON Validation against expected keys
        if not isinstance(result_data, dict) or "metrics" not in result_data or "test_cases" not in result_data:
            raise Exception("LLM returned an invalid JSON schema missing 'metrics' or 'test_cases'.")
            
        metrics = result_data.get("metrics", {})
        print(f"[UI Scanner] Validation Summary: Pages={metrics.get('pages_to_test', 0)}, Routes={metrics.get('detected_routes', 0)}, Forms={metrics.get('forms_detected', 0)}, Tables={metrics.get('data_tables', 0)}")
        
        test_cases = result_data.get("test_cases", [])
        print(f"[UI Scanner] Generated test cases: {len(test_cases)}")
        for tc in test_cases[:3]:
            print(f" - Scenario: {tc.get('scenario')} ({tc.get('route')})")

        template_vars = {
            "project_name": project_name,
            "generated_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "app_type": f"{project_type}_UI",
            "validation_summary": result_data.get("summary", []),
            "pages_to_test": metrics.get("pages_to_test", 0),
            "detected_routes": metrics.get("detected_routes", 0),
            "forms_detected": metrics.get("forms_detected", 0),
            "data_tables": metrics.get("data_tables", 0),
            "validation_scopes": [], # Use template defaults
            "test_cases": test_cases
        }

        # 1. Generate HTML
        template = self.env.get_template("ui_test_cases_template.html")
        html_out = template.render(template_vars)
        html_path.write_text(html_out, encoding="utf-8")

        # 2. Save to Postgres (and JSON cache)
        analysis_id = project_data.get("analysis_id")
        if analysis_id:
            from app.database import SessionLocal
            from app.db_models import TestCase
            db = SessionLocal()
            try:
                for tc in test_cases:
                    new_tc = TestCase(
                        analysis_id=analysis_id,
                        name=tc.get("scenario", "Unnamed Scenario"),
                        description=tc.get("steps", ""),
                        test_type="UI",
                        tool="Playwright/Selenium",
                        is_ai_generated=True,
                        status="Pending",
                        file_path=tc.get("route", "")
                    )
                    db.add(new_tc)
                db.commit()
            except Exception as e:
                print(f"[UI DB Error] {e}")
            finally:
                db.close()
                
        # Write JSON cache for future runs (avoids repeat LLM calls)
        json_path.write_text(json.dumps(result_data, indent=2), encoding="utf-8")

        pdf_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(io.StringIO(html_out), dest=pdf_buffer)
        if not pisa_status.err:
            pdf_path.write_bytes(pdf_buffer.getvalue())

        print(f"========== COMPLETED UI TEST CASE GENERATION ==========\n")
        return str(html_path)

ui_test_case_service = UITestCaseService()
