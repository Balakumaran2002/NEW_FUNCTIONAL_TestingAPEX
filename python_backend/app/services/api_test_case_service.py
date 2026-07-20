import os
import json
import io
import re
import urllib.parse
from pathlib import Path
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa
from app.config import app_config
from app.ai.ai_factory import AIFactory

class APITestCaseService:
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
                        "analysis_id": analysis.id,
                        "brd": analysis.full_brd_report or {}
                    }
            raise Exception(f"No analysis data found for {project_id}. Please run repository analysis first.")
        finally:
            db.close()

    def _extract_controller_code(self, repo_path: Path, project_type: str) -> str:
        code_chunks = []
        extensions = [".java", ".py", ".js", ".ts"]
        
        # Simple heuristic to grab potential controller/route files
        for root, dirs, files in os.walk(repo_path):
            if any(skip in root for skip in [".git", "node_modules", "target", "build", "venv", "__pycache__"]):
                continue
            for file in files:
                ext = os.path.splitext(file)[1]
                if ext in extensions:
                    file_path = Path(root) / file
                    try:
                        content = file_path.read_text(encoding="utf-8")
                        # Java Spring Boot
                        if ext == ".java" and ("@RestController" in content or "@Controller" in content or "@RequestMapping" in content):
                            code_chunks.append(f"--- File: {file} ---\n{content[:2000]}")
                        # Python FastAPI / Flask / Django
                        elif ext == ".py" and ("@app.get" in content or "@router" in content or "urlpatterns" in content or "@app.route" in content):
                            code_chunks.append(f"--- File: {file} ---\n{content[:2000]}")
                        # Node Express
                        elif ext in [".js", ".ts"] and ("express" in content.lower() or "app.get(" in content or "router.get(" in content):
                            code_chunks.append(f"--- File: {file} ---\n{content[:2000]}")
                    except Exception:
                        pass
        return "\n\n".join(code_chunks[:20]) # Limit to top 20 files

    def generate_api_test_cases(self, project_id: str, api_key: str, model_name: str, force_regenerate: bool = False) -> str:
        print(f"\n========== STARTING API TEST CASE GENERATION ==========")
        project_data = self._get_project_data(project_id)
        repo_url = project_data.get("repoUrl", project_id)
        project_name = repo_url.split("/")[-1].replace(".git", "") if "/" in repo_url else "Analyzed Project"
        project_type = project_data.get("projectType", "Java")
        
        safe_dir_name = urllib.parse.quote(project_name, safe='')
        project_dir = self.reports_dir / safe_dir_name
        project_dir.mkdir(parents=True, exist_ok=True)

        html_path = project_dir / "api-functional-test-scope.html"
        pdf_path = project_dir / "api-functional-test-scope.pdf"
        json_path = project_dir / "api-functional-test-scope.json"

        # ── DISK CACHE CHECK ──────────────────────────────────────────────────
        # If JSON cache exists with real test cases, skip the LLM entirely
        if not force_regenerate and json_path.exists() and html_path.exists():
            try:
                cached = json.loads(json_path.read_text(encoding="utf-8"))
                # API service stores a list directly (not a dict with test_cases key)
                cached_cases = cached if isinstance(cached, list) else cached.get("test_cases", [])
                if len(cached_cases) > 0:
                    print(f"[API Scanner] CACHE HIT — {len(cached_cases)} cached API test cases on disk. Skipping LLM. ⚡")
                    print(f"========== COMPLETED API TEST CASE GENERATION (from disk cache) ==========\n")
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
                            TestCase.test_type == "API"
                        ).all()
                        if len(db_cases) > 0:
                            print(f"[API Scanner] DB CACHE HIT — {len(db_cases)} API test cases in database. Skipping LLM. ⚡")
                            # Rebuild JSON cache from DB
                            if not json_path.exists():
                                cached_list = [
                                    {"method": "GET", "path": tc.file_path or "/api", "scenario": tc.name, "assertions": tc.description or "", "source": "Database"}
                                    for tc in db_cases
                                ]
                                json_path.write_text(json.dumps(cached_list, indent=2), encoding="utf-8")
                            print(f"========== COMPLETED API TEST CASE GENERATION (from DB cache) ==========\n")
                            return str(html_path) if html_path.exists() else ""
                finally:
                    db.close()
            except Exception as e:
                print(f"[API Scanner] DB cache check failed (non-fatal): {e}")

        # ── BRD ENDPOINT CACHE CHECK ─────────────────────────────────────────
        # Use API groups from BRD if available — zero LLM cost
        if not force_regenerate:
            brd = project_data.get("brd", {})
            api_groups = brd.get("apiGroups", []) if isinstance(brd, dict) else []
            if api_groups:
                test_cases = []
                for group in api_groups:
                    for ep in group.get("endpoints", []):
                        test_cases.append({
                            "method": ep.get("method", "GET"),
                            "path": ep.get("path", "/"),
                            "scenario": f"Verify {ep.get('method','GET')} {ep.get('path','/')} responds correctly",
                            "assertions": "Assert status code < 500. Validate JSON response structure.",
                            "source": group.get("name", "API")
                        })
                if test_cases:
                    print(f"[API Scanner] BRD CACHE HIT — {len(test_cases)} API endpoints from BRD. Skipping LLM. ⚡")
                    # Write cache and generate report
                    json_path.write_text(json.dumps(test_cases, indent=2), encoding="utf-8")
                    self._render_and_save(test_cases, project_name, project_type, html_path, pdf_path, project_data)
                    print(f"========== COMPLETED API TEST CASE GENERATION (from BRD cache) ==========\n")
                    return str(html_path)
        # ── END CACHE CHECKS ─────────────────────────────────────────────────
        
        repo_path = app_config.get_project_dir(project_name)
        if not repo_path.exists():
             # fallback for local folder analysis
             repo_path = Path(repo_url) if os.path.isabs(repo_url) else repo_path

        code_context = ""
        if repo_path.exists():
            code_context = self._extract_controller_code(repo_path, project_type)

        if not code_context:
            code_context = "No explicit controller code found, generate generic test cases based on typical architecture for this framework."

        system_instruction = (
            "You are an expert QA Automation Architect. "
            "Analyze the provided source code controllers and generate comprehensive, project-specific API Functional Test Cases. "
            "Extract actual endpoints (GET, POST, PUT, DELETE) and generate business scenarios including valid flows, invalid flows, edge cases, and security tests. "
            "Format the output strictly as a JSON array of objects. Do not use markdown wrappers like ```json. "
            "Each object must have the following exact keys: "
            "'method' (e.g., GET, POST), "
            "'path' (e.g., /api/users), "
            "'scenario' (e.g., Verify successful user creation), "
            "'assertions' (e.g., Assert 201 Created, validate JSON schema), "
            "'source' (e.g., UserController)."
        )

        user_prompt = (
            f"Generate API test cases for the following {project_type} source code.\n\n"
            f"Source Code:\n{code_context}\n"
        )

        # Truncate prompt if too large
        user_prompt = user_prompt[:25000]

        print("[API Scanner] Calling LLM to generate test cases (no cache found)...")
        try:
            ai_client = AIFactory.get_client()
            ai_result = ai_client.generate(user_prompt, system_instruction, api_key, model_name)
            cleaned_json = ai_result.replace("```json", "").replace("```", "").strip()
            test_cases = json.loads(cleaned_json)
        except Exception as e:
            print(f"Error generating or parsing LLM JSON: {e}")
            test_cases = []

        # Ensure it's a list
        if not isinstance(test_cases, list):
            test_cases = []

        # Write JSON cache for future runs
        json_path.write_text(json.dumps(test_cases, indent=2), encoding="utf-8")

        self._render_and_save(test_cases, project_name, project_type, html_path, pdf_path, project_data)

        print(f"========== COMPLETED API TEST CASE GENERATION ==========\n")
        return str(html_path)

    def _render_and_save(self, test_cases: list, project_name: str, project_type: str,
                         html_path: Path, pdf_path: Path, project_data: dict):
        """Render HTML/PDF and save API test cases to the database."""
        # Calculate metrics
        total_endpoints = len(test_cases)
        get_count = sum(1 for t in test_cases if t.get("method", "").upper() == "GET")
        post_count = sum(1 for t in test_cases if t.get("method", "").upper() == "POST")
        put_count = sum(1 for t in test_cases if t.get("method", "").upper() in ["PUT", "PATCH"])
        delete_count = sum(1 for t in test_cases if t.get("method", "").upper() == "DELETE")
        unique_sources = len(set(t.get("source", "") for t in test_cases if t.get("source")))

        template_vars = {
            "project_name": project_name,
            "generated_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "controllers_count": unique_sources,
            "total_endpoints": total_endpoints,
            "get_count": get_count,
            "post_count": post_count,
            "put_count": put_count,
            "delete_count": delete_count,
            "validation_scopes": [], # Let template use defaults if empty
            "test_cases": test_cases
        }

        # Generate HTML
        template = self.env.get_template("api_test_cases_template.html")
        html_out = template.render(template_vars)
        html_path.write_text(html_out, encoding="utf-8")

        # Save to Postgres
        analysis_id = project_data.get("analysis_id")
        if analysis_id:
            from app.database import SessionLocal
            from app.db_models import TestCase
            db = SessionLocal()
            try:
                # Only insert if not already in DB
                existing = db.query(TestCase).filter(
                    TestCase.analysis_id == analysis_id,
                    TestCase.test_type == "API"
                ).count()
                if existing == 0:
                    for tc in test_cases:
                        new_tc = TestCase(
                            analysis_id=analysis_id,
                            name=tc.get("scenario", "Unnamed API Scenario"),
                            description=tc.get("assertions", ""),
                            test_type="API",
                            tool="RestAssured/Postman",
                            is_ai_generated=True,
                            status="Pending",
                            file_path=tc.get("path", "")
                        )
                        db.add(new_tc)
                    db.commit()
                else:
                    print(f"[API DB] Skipping DB insert — {existing} API test cases already exist in DB.")
            except Exception as e:
                print(f"[API DB Error] {e}")
            finally:
                db.close()

        # Generate PDF
        pdf_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(io.StringIO(html_out), dest=pdf_buffer)
        if not pisa_status.err:
            pdf_path.write_bytes(pdf_buffer.getvalue())

api_test_case_service = APITestCaseService()
