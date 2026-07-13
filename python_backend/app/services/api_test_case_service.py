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

class APITestCaseService:
    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / "templates"
        self.env = Environment(loader=FileSystemLoader(str(self.templates_dir)))
        self.reports_dir = app_config.workspace_directory / "reports"

    def _get_project_data(self, project_id: str):
        cache_file = app_config.workspace_directory / "analysis_cache.json"

        if cache_file.exists():
            try:
                cache = json.loads(cache_file.read_text())
                if cache and project_id in cache:
                    return cache[project_id]
                if cache:
                    for k, v in cache.items():
                        if project_id in k:
                            return v
            except Exception:
                pass
                
        last_analysis_file = app_config.workspace_directory / "reports" / "last_analysis.json"
        if last_analysis_file.exists():
            try:
                data = json.loads(last_analysis_file.read_text())
                if data and (data.get("repoUrl") == project_id or project_id in data.get("repoUrl", "")):
                    return data
            except Exception:
                pass
                
        raise Exception(f"No analysis data found for {project_id}. Please run repository analysis first.")

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
                            code_chunks.append(f"--- File: {file} ---\n{content[:2000]}") # Truncate to avoid massive prompts
                        # Python FastAPI / Flask / Django
                        elif ext == ".py" and ("@app.get" in content or "@router" in content or "urlpatterns" in content or "@app.route" in content):
                            code_chunks.append(f"--- File: {file} ---\n{content[:2000]}")
                        # Node Express
                        elif ext in [".js", ".ts"] and ("express" in content.lower() or "app.get(" in content or "router.get(" in content):
                            code_chunks.append(f"--- File: {file} ---\n{content[:2000]}")
                    except Exception:
                        pass
        return "\n\n".join(code_chunks[:20]) # Limit to top 20 files

    def generate_api_test_cases(self, project_id: str, api_key: str, model_name: str) -> str:
        project_data = self._get_project_data(project_id)
        repo_url = project_data.get("repoUrl", project_id)
        project_name = repo_url.split("/")[-1].replace(".git", "") if "/" in repo_url else "Analyzed Project"
        project_type = project_data.get("projectType", "Java")
        
        # Use a safe directory name
        import urllib.parse
        safe_dir_name = urllib.parse.quote(project_name, safe='')
        project_dir = self.reports_dir / safe_dir_name
        project_dir.mkdir(parents=True, exist_ok=True)

        html_path = project_dir / "api-functional-test-scope.html"
        pdf_path = project_dir / "api-functional-test-scope.pdf"
        json_path = project_dir / "api-functional-test-scope.json"

        if html_path.exists():
            return str(html_path)
        
        repo_path = app_config.workspace_directory / project_name
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

        ai_client = AIFactory.get_client()
        ai_result = ai_client.generate(user_prompt, system_instruction, api_key, model_name)
        
        cleaned_json = ai_result.replace("```json", "").replace("```", "").strip()
        
        try:
            test_cases = json.loads(cleaned_json)
        except Exception as e:
            print(f"Error parsing LLM JSON: {e}")
            test_cases = []

        # Ensure it's a list
        if not isinstance(test_cases, list):
            test_cases = []

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

        # 1. Generate HTML
        template = self.env.get_template("api_test_cases_template.html")
        html_out = template.render(template_vars)
        html_path.write_text(html_out, encoding="utf-8")

        # 2. Generate JSON
        json_path.write_text(json.dumps(test_cases, indent=2), encoding="utf-8")

        # 3. Generate PDF
        pdf_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(io.StringIO(html_out), dest=pdf_buffer)
        if not pisa_status.err:
            pdf_path.write_bytes(pdf_buffer.getvalue())

        return str(html_path)

api_test_case_service = APITestCaseService()
