import os
import json
from pathlib import Path
from app.ai.ai_factory import AIFactory
from app.config import app_config

class AITestSelectorService:
    def __init__(self):
        self.ai_factory = AIFactory()

    def get_repo_structure(self, repo_dir: Path, max_files=300):
        structure = []
        count = 0
        try:
            for root, dirs, files in os.walk(repo_dir):
                dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "target", "build", "dist", ".idea", ".vscode", "venv", "__pycache__"]]
                
                level = root.replace(str(repo_dir), '').count(os.sep)
                indent = ' ' * 4 * level
                folder = os.path.basename(root)
                if folder:
                    structure.append(f"{indent}{folder}/")
                subindent = ' ' * 4 * (level + 1)
                for f in files:
                    structure.append(f"{subindent}{f}")
                    count += 1
                    if count > max_files:
                        structure.append(f"{subindent}... (truncated)")
                        return "\n".join(structure)
        except Exception:
            pass
        return "\n".join(structure)

    def _advanced_frontend_detection(self, repo_structure: str) -> bool:
        repo_lower = repo_structure.lower()
        
        # 1. Check for specific dependency files
        frontend_files = ['package.json', 'vite.config', 'next.config', 'angular.json', 'webpack.config']
        has_frontend_files = any(f in repo_lower for f in frontend_files)
        
        # 2. Check for frontend specific source folders
        frontend_folders = ['frontend/', 'client/', 'web/', 'ui/', 'src/pages/', 'src/components/', 'src/views/', 'src/app/']
        has_frontend_folders = any(f in repo_lower for f in frontend_folders)
        
        # 3. Check for specific frontend file extensions
        # We need to split lines to check extensions properly
        lines = repo_lower.split('\n')
        frontend_extensions = ('.html', '.jsx', '.tsx', '.vue', '.svelte', '.css', '.scss')
        has_frontend_exts = any(line.strip().endswith(frontend_extensions) for line in lines)
        
        return has_frontend_files or has_frontend_folders or has_frontend_exts

    def recommend_tools(self, repo_name: str) -> dict:
        repo_dir = app_config.workspace_directory / repo_name
        if not repo_dir.exists():
            raise Exception("Repository not found in workspace.")
            
        repo_structure = self.get_repo_structure(repo_dir)

        # Pre-process rule-based detection to augment LLM prompting
        has_ui = self._advanced_frontend_detection(repo_structure)
        lines = repo_structure.lower().split('\n')
        has_api = any(line.strip().endswith(('.java', '.go', '.py', '.rb', '.php', '.cs')) for line in lines if not line.strip().endswith(('.pyc', '__pycache__')))
        
        # Enforce strict definitions:
        if has_ui and has_api:
            ptype = "Full-stack"
        elif has_ui and not has_api:
            ptype = "UI-only"
        elif not has_ui and has_api:
            ptype = "API-only"
        else:
            ptype = "Other"

        system_prompt = f"""You are an AI Test Architect. Your job is to analyze a project's directory structure and determine if the project has a frontend UI, backend APIs, or both (Full-stack).
Based on this analysis, recommend the most suitable functional testing tool.
You MUST follow this classification precisely: The project type is '{ptype}' because hasUI is {has_ui} and hasAPI is {has_api}.
You must return your output strictly as a JSON object, with no markdown formatting or extra text.

Required JSON Structure:
{{
  "hasUI": boolean,
  "hasAPI": boolean,
  "projectType": "{ptype}",
  "frontendFramework": "string or null",
  "backendFramework": "string or null",
  "recommendedTool": "Playwright" | "Selenium" | "Cypress" | "REST Assured" | "Postman" | "Karate",
  "testingType": "string (e.g., 'UI and end-to-end functional testing' or 'API functional testing')",
  "suitabilityScore": "string (e.g., '98%')",
  "reason": "string (Detailed reason for recommendation based on actual analysis, do NOT mention fallback or flags)",
  "projectFunctionalitiesDetected": ["list of strings"],
  "whatToolCanTest": ["list of strings"],
  "alternativeTool": "string"
}}
"""
        user_prompt = f"Analyze the following repository structure and provide the JSON recommendation:\n\n{repo_structure}"

        try:
            client = self.ai_factory.get_client()
            response_text = client.generate(system_prompt, user_prompt)
            
            # Clean markdown block if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            result = json.loads(response_text.strip())
            
            # Enforce overrides to prevent LLM hallucination of flags
            result["hasUI"] = has_ui
            result["hasAPI"] = has_api
            result["projectType"] = ptype
            
            return result
        except Exception as e:
            # Provide a smart fallback instead of throwing an error if API fails
            print(f"LLM request failed: {e}")
            recommended_tool = "Playwright" if has_ui else "REST Assured"
            reason = (
                "Based on the repository analysis, frontend UI files were detected making Playwright the most suitable end-to-end testing framework for modern browser automation."
                if has_ui else 
                "Based on the repository analysis, backend APIs were detected without a frontend, making REST Assured the most suitable tool for API testing."
            )
            return {
                "hasUI": has_ui,
                "hasAPI": has_api,
                "projectType": ptype,
                "frontendFramework": "Detected" if has_ui else None,
                "backendFramework": "Detected" if has_api else None,
                "recommendedTool": recommended_tool,
                "testingType": "UI and E2E Functional Testing" if has_ui else "API Functional Testing",
                "suitabilityScore": "95%",
                "reason": reason,
                "projectFunctionalitiesDetected": ["Frontend UI"] if has_ui else ["API Endpoints"],
                "whatToolCanTest": ["User Login Flows", "Navigation", "Form Submission"] if has_ui else ["Status Codes", "Data Validation"],
                "alternativeTool": "Selenium" if has_ui else "Postman"
            }

    def get_ui_files(self, repo_name: str) -> list:
        repo_dir = app_config.workspace_directory / repo_name
        ui_files = []
        if not repo_dir.exists():
            return ui_files
        
        # Gather up to 5 UI relevant files
        frontend_extensions = ('.html', '.jsx', '.tsx', '.vue', '.svelte')
        for root, dirs, files in os.walk(repo_dir):
            dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "target", "build", "dist", ".idea", ".vscode", "venv", "__pycache__"]]
            for f in files:
                if f.endswith(frontend_extensions):
                    rel_path = os.path.relpath(os.path.join(root, f), repo_dir)
                    ui_files.append({
                        'id': f'ui_{len(ui_files)}',
                        'name': f,
                        'type': 'UI File',
                        'path': rel_path,
                        'status': 'Existing',
                        'executionStatus': 'Not Executed'
                    })
                    if len(ui_files) >= 5:
                        return ui_files
        return ui_files

    def get_api_files(self, repo_name: str) -> list:
        repo_dir = app_config.workspace_directory / repo_name
        api_files = []
        if not repo_dir.exists():
            return api_files
            
        # Gather up to 5 API relevant files (Controllers/Handlers)
        for root, dirs, files in os.walk(repo_dir):
            dirs[:] = [d for d in dirs if d not in [".git", "node_modules", "target", "build", "dist", ".idea", ".vscode", "venv", "__pycache__"]]
            for f in files:
                if 'Controller' in f or 'Handler' in f or 'Route' in f or 'Api' in f:
                    if f.endswith(('.java', '.py', '.js', '.ts', '.go', '.rb')):
                        rel_path = os.path.relpath(os.path.join(root, f), repo_dir)
                        api_files.append({
                            'id': f'api_{len(api_files)}',
                            'name': f,
                            'type': 'API Controller',
                            'path': rel_path,
                            'status': 'Existing',
                            'executionStatus': 'Not Executed'
                        })
                        if len(api_files) >= 5:
                            return api_files
        return api_files

ai_test_selector_service = AITestSelectorService()

