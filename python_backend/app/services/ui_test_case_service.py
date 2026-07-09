import os
import json
import io
import re
from pathlib import Path
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from xhtml2pdf import pisa
from app.config import app_config
from app.ai.ai_factory import AIFactory
import urllib.parse

class UITestCaseService:
    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / "templates"
        self.env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        self.reports_dir = app_config.workspace_directory / "reports"

    def _get_project_data(self, project_id: str):
        last_analysis_file = Path("last_analysis.json")
        cache_file = app_config.workspace_directory / "analysis_cache.json"

        if last_analysis_file.exists():
            try:
                data = json.loads(last_analysis_file.read_text())
                if data: return data
            except Exception:
                pass
                
        if cache_file.exists():
            try:
                cache = json.loads(cache_file.read_text())
                if cache:
                    for k, v in cache.items():
                        return v
            except Exception:
                pass
                
        raise Exception("No analysis data found. Please run repository analysis first.")

    def _extract_ui_code(self, repo_path: Path) -> str:
        code_chunks = []
        extensions = [".html", ".jsp", ".jsx", ".tsx", ".vue"]
        
        for root, dirs, files in os.walk(repo_path):
            if any(skip in root for skip in [".git", "node_modules", "target", "build", "venv", "__pycache__"]):
                continue
            for file in files:
                ext = os.path.splitext(file)[1]
                if ext in extensions:
                    file_path = Path(root) / file
                    try:
                        content = file_path.read_text(encoding="utf-8")
                        # Include if it looks like a UI view or component
                        if "<html" in content or "<div" in content or "export default" in content or "<template>" in content:
                            code_chunks.append(f"--- File: {file} ---\n{content[:2000]}") # Truncate to avoid massive prompts
                    except Exception:
                        pass
        return "\n\n".join(code_chunks[:20]) # Limit to top 20 UI files

    def generate_ui_test_cases(self, project_id: str, api_key: str, model_name: str) -> str:
        project_data = self._get_project_data(project_id)
        repo_url = project_data.get("repoUrl", project_id)
        project_name = repo_url.split("/")[-1].replace(".git", "") if "/" in repo_url else "Analyzed Project"
        project_type = project_data.get("projectType", "Java")
        
        # Use a safe directory name
        safe_dir_name = urllib.parse.quote(project_name, safe='')
        project_dir = self.reports_dir / safe_dir_name
        project_dir.mkdir(parents=True, exist_ok=True)

        html_path = project_dir / "ui-functional-test-scope.html"
        pdf_path = project_dir / "ui-functional-test-scope.pdf"
        json_path = project_dir / "ui-functional-test-scope.json"

        if html_path.exists():
            return str(html_path)
        
        repo_path = app_config.workspace_directory / "repos" / project_name
        if not repo_path.exists():
             repo_path = Path(repo_url) if os.path.isabs(repo_url) else repo_path

        code_context = ""
        if repo_path.exists():
            code_context = self._extract_ui_code(repo_path)

        if not code_context:
            code_context = "No explicit UI code found. Generate a default minimal UI test scope indicating no pages found."

        system_instruction = (
            "You are an expert QA Automation Architect. "
            "Analyze the provided source code (JSP, React, Vue, HTML, etc) and generate comprehensive, project-specific UI Functional Test Cases. "
            "Extract actual pages, forms, tables, and buttons. "
            "Format the output strictly as a JSON object. Do not use markdown wrappers like ```json. "
            "The JSON object MUST have the following keys exactly:\n"
            "'summary': A list of objects with keys: 'scenario', 'purpose', 'expected', 'migration_result' (value 'Passed'), 'status' (value 'Pass').\n"
            "'metrics': An object with keys: 'pages_to_test' (integer), 'detected_routes' (integer), 'forms_detected' (integer), 'data_tables' (integer).\n"
            "'test_cases': A list of objects with keys: 'route', 'type' (e.g. JSP Page, React Component), 'scenario', 'interaction' (e.g. 'Yes', 'Page load only'), 'steps' (e.g. 'navigate(/login); fill(user); click(btn); assert_visible()')."
        )

        user_prompt = (
            f"Generate UI test cases for the following source code.\n\n"
            f"Source Code:\n{code_context}\n"
        )

        user_prompt = user_prompt[:25000]

        ai_client = AIFactory.get_client()
        ai_result = ai_client.generate(user_prompt, system_instruction, api_key, model_name)
        
        cleaned_json = ai_result.replace("```json", "").replace("```", "").strip()
        
        try:
            result_data = json.loads(cleaned_json)
        except Exception as e:
            print(f"Error parsing LLM JSON: {e}")
            result_data = {"summary": [], "metrics": {"pages_to_test": 0, "detected_routes": 0, "forms_detected": 0, "data_tables": 0}, "test_cases": []}

        template_vars = {
            "project_name": project_name,
            "generated_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "app_type": f"{project_type}_UI",
            "validation_summary": result_data.get("summary", []),
            "pages_to_test": result_data.get("metrics", {}).get("pages_to_test", 0),
            "detected_routes": result_data.get("metrics", {}).get("detected_routes", 0),
            "forms_detected": result_data.get("metrics", {}).get("forms_detected", 0),
            "data_tables": result_data.get("metrics", {}).get("data_tables", 0),
            "validation_scopes": [], # Use template defaults
            "test_cases": result_data.get("test_cases", [])
        }

        # 1. Generate HTML
        template = self.env.get_template("ui_test_cases_template.html")
        html_out = template.render(template_vars)
        html_path.write_text(html_out, encoding="utf-8")

        # 2. Generate JSON
        json_path.write_text(json.dumps(result_data, indent=2), encoding="utf-8")

        # 3. Generate PDF
        pdf_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(io.StringIO(html_out), dest=pdf_buffer)
        if not pisa_status.err:
            pdf_path.write_bytes(pdf_buffer.getvalue())

        return str(html_path)

ui_test_case_service = UITestCaseService()
