import os
import re
import json
from typing import Dict, Any
from pathlib import Path
from urllib.parse import urljoin, urlsplit, quote
from fastapi import APIRouter, Response, BackgroundTasks, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.background import BackgroundTask
import httpx
from pydantic import BaseModel
from app.models import (
    AnalyzeRequest, AnalysisResponse,
    MigrateRequest, MigrationResponse, TaskResponse,
    ConvertRequest, ConversionResponse,
    ChatRequest, ChatResponse,
    ExecutionStatus, ExecutionResult,
    RunStartRequest, RunStatusResponse,
    ValidateRepoRequest, ValidateRepoResponse
)
from app.tasks import run_background_migration
from celery.result import AsyncResult
from app.config import app_config
from app.services.rag_service import rag_service
from app.tasks import run_dynamic_analysis_pipeline
from app.services.analysis_service import analysis_service
from app.services.migration_service import migration_service
from app.services.code_conversion_service import code_conversion_service
from app.services.session_service import session_service
from app.services.report_service import report_service
from app.services.execution_service import execution_service
from app.ai.ai_factory import AIFactory
import asyncio
import subprocess

router = APIRouter()

class CreateSessionRequest(BaseModel):
    repoUrl: str = ""
    localPath: str = ""

class UpdateSessionRequest(BaseModel):
    updates: Dict[str, Any]

@router.post("/sessions")
async def create_session(request: CreateSessionRequest):
    try:
        session_id = session_service.create_session(request.repoUrl, request.localPath)
        return {"sessionId": session_id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = session_service.get_session(session_id)
    if not session:
        return JSONResponse(status_code=404, content={"error": "Session not found"})
    return session

@router.patch("/sessions/{session_id}")
async def update_session(session_id: str, request: UpdateSessionRequest):
    try:
        updated = session_service.update_session(session_id, request.updates)
        return updated
    except ValueError as e:
        return JSONResponse(status_code=404, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

PREVIEW_PROXY_PREFIX = "/api/run/preview"


def get_backend_origin(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def get_absolute_preview_url(request: Request, repo_name: str) -> str:
    return f"{get_backend_origin(request)}{PREVIEW_PROXY_PREFIX}/{repo_name}"


def attach_preview_url(status: dict, request: Request, repo_name: str) -> dict:
    payload = dict(status)
    preview_url = payload.get("previewUrl")
    if preview_url:
        if preview_url.startswith("/"):
            payload["previewUrl"] = f"{get_backend_origin(request)}{preview_url}"
        return payload

    if payload.get("status") in {"STARTING", "RUNNING", "SUCCESS", "RUNNING_JAVA"}:
        # Generate preview URL using the API proxy instead of direct localhost
        base_url = get_absolute_preview_url(request, repo_name)
        preferred_path = payload.get("preferredPreviewPath")
        if preferred_path:
            # Ensure proper concatenation without double slashes
            base_url = base_url.rstrip('/') + '/' + preferred_path.lstrip('/')
            
        payload["previewUrl"] = base_url
    return payload


def rewrite_html_preview_assets(html: str, proxy_prefix: str) -> str:
    """Keep common root-relative asset and form URLs inside the preview proxy."""
    replacements = (
        ('href="/', f'href="{proxy_prefix}/'),
        ('src="/', f'src="{proxy_prefix}/'),
        ('action="/', f'action="{proxy_prefix}/'),
        ("href='/", f"href='{proxy_prefix}/"),
        ("src='/", f"src='{proxy_prefix}/"),
        ("action='/", f"action='{proxy_prefix}/"),
        ("url(/", f"url({proxy_prefix}/"),
    )
    for old, new in replacements:
        html = html.replace(old, new)

    if "<base " not in html.lower():
        html = re.sub(
            r"(?i)</head>",
            f'<base href="{proxy_prefix}/"></head>',
            html,
            count=1,
        )

    return html

def get_reports_dir():
    reports = app_config.workspace_directory / "reports"
    reports.mkdir(exist_ok=True)
    return reports

def save_report_to_file(filename: str, data: dict):
    file_path = get_reports_dir() / filename
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f)

def load_report_from_file(filename: str) -> dict:
    file_path = get_reports_dir() / filename
    if file_path.exists():
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

@router.get("/status")
async def get_status():
    return {
        "ragInitialized": rag_service.is_initialized,
        "ragMessage": rag_service.initialization_status,
        "provider": app_config.ai_provider
    }

@router.post("/validate-repo", response_model=ValidateRepoResponse)
async def validate_repo(request: ValidateRepoRequest):
    return analysis_service.validate_repository(request.repoUrl, request.patToken)

class ValidateLocalRequest(BaseModel):
    localPath: str

@router.post("/validate-local")
async def validate_local(request: ValidateLocalRequest):
    """Validate that a local folder path exists and looks like a project directory."""
    from pathlib import Path as _Path
    import os as _os
    p = _Path(request.localPath.strip())
    if not p.exists():
        return {"isValid": False, "message": f"Path does not exist: {request.localPath}"}
    if not p.is_dir():
        return {"isValid": False, "message": "Path is not a directory"}
    
    # Check for common project indicators
    indicators = ["pom.xml", "build.gradle", "build.gradle.kts", "package.json",
                  "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod", "*.csproj"]
    found = []
    for ind in indicators:
        if "*" in ind:
            ext = ind.replace("*", "")
            for f in p.iterdir():
                if f.suffix == ext:
                    found.append(f.name)
                    break
        elif (p / ind).exists():
            found.append(ind)
    
    project_name = p.name
    if found:
        return {
            "isValid": True,
            "projectName": project_name,
            "message": f"Project detected: {project_name} ({', '.join(found[:3])})",
            "detectedFiles": found
        }
    else:
        # Still allow it but with a warning
        return {
            "isValid": True,
            "projectName": project_name,
            "message": f"Directory found: {project_name}. No standard project files detected, but will attempt analysis.",
            "detectedFiles": []
        }


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalyzeRequest):
    if request.provider:
        app_config.ai_provider = request.provider
        
    session_id = request.sessionId
    if not session_id:
        session_id = session_service.create_session(request.repoUrl, request.localPath)
        
    response = analysis_service.analyze_repository(
        request.repoUrl, 
        request.apiKey, 
        request.modelName, 
        request.githubToken, 
        request.localPath
    )
    
    response.sessionId = session_id
    
    # Save the analysis result into the session
    session_service.update_session(session_id, {
        "analysisResult": response.model_dump(),
        "workflowState": {"analysisCompleted": True}
    })
    
    # TRIGGER DYNAMIC TEST EXECUTION IN BACKGROUND
    # Pass repo_path_str as string. We assume response.projectId is the local repo name/path relative or absolute.
    # We will pass the full local path if it was used, else use the default workspace logic.
    if request.localPath:
        repo_path_str = request.localPath
        # Register local path so tree/file APIs can resolve it by folder name
        local_folder_name = Path(request.localPath.strip()).name
        app_config.register_local_path(local_folder_name, request.localPath.strip())
    else:
        # Construct path based on analysis logic
        repo_name = request.repoUrl.split('/')[-1].replace('.git', '') if request.repoUrl else ''
        if repo_name:
            repo_path_str = str(app_config.workspace_directory / repo_name)
        else:
            repo_path_str = str(app_config.workspace_directory)
    
    # Derive a display name for the pipeline
    if request.repoUrl:
        pipeline_repo_name = request.repoUrl.split('/')[-1].replace('.git', '')
    elif request.localPath:
        pipeline_repo_name = Path(request.localPath.strip()).name
    else:
        pipeline_repo_name = 'unknown'
        
    run_dynamic_analysis_pipeline.delay(
        repo_path_str, 
        pipeline_repo_name, 
        request.apiKey, 
        request.modelName, 
        request.provider
    )
    
    save_report_to_file("last_analysis.json", response.model_dump()) # keeping for backward compatibility if needed, but not strictly required
    return response

from fastapi.responses import Response
from app.services.brd_service import brd_service

@router.get("/brd/download/{reportId:path}")
async def download_brd(reportId: str):
    try:
        # reportId can be a URL or a simple name, depending on what the frontend passes
        pdf_bytes = brd_service.generate_brd_pdf(reportId)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=BRD_{reportId.split('/')[-1]}.pdf"})
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))

from app.services.api_test_case_service import api_test_case_service
from fastapi.responses import FileResponse

@router.get("/reports/api-test-cases/download/{repo_url:path}")
async def download_api_test_cases(repo_url: str):
    try:
        html_file = api_test_case_service.generate_api_test_cases(repo_url, None, None)
        filename = f"api-functional-test-scope-{repo_url.split('/')[-1]}.html"
        return FileResponse(path=html_file, media_type="text/html", filename=filename, headers={"Content-Disposition": f'attachment; filename="{filename}"'})
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/workflow/status/{repo_name}")
async def get_workflow_status(repo_name: str):
    analysis_completed = False
    runner_completed = False

    try:
        from app.database import SessionLocal
        from app.db_models import Repository, Analysis
        db = SessionLocal()
        repo = db.query(Repository).filter(Repository.name == repo_name).first()
        if not repo:
            repo = db.query(Repository).filter(Repository.repo_url.contains(repo_name)).first()
        if repo:
            db_analysis = db.query(Analysis).filter(Analysis.repository_id == repo.id).order_by(Analysis.created_at.desc()).first()
            if db_analysis and db_analysis.full_brd_report:
                analysis_completed = True
        db.close()
    except Exception:
        pass

    try:
        status = project_runner_service.get_status(repo_name).get("status")
        if status in ["RUNNING", "RUNNING_API", "SUCCESS", "SUCCESSFUL"]:
            runner_completed = True
    except Exception:
        pass

    return {
        "analysisCompleted": analysis_completed,
        "runnerCompleted": runner_completed
    }

from app.services.ui_test_case_service import ui_test_case_service
from app.services.api_test_case_service import api_test_case_service
import json

@router.get("/reports/ui-functional-test/download/{projectId:path}")
async def download_ui_test_cases(projectId: str):
    try:
        html_file = ui_test_case_service.generate_ui_test_cases(projectId, None, None)
        filename = f"ui-functional-test-scope-{projectId.split('/')[-1]}.html"
        return FileResponse(path=html_file, media_type="text/html", filename=filename, headers={"Content-Disposition": f'attachment; filename="{filename}"'})
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reports/ui-functional-test/data/{projectId:path}")
async def get_ui_test_cases_data(projectId: str):
    try:
        project_name = projectId.split("/")[-1].replace(".git", "") if "/" in projectId else projectId
        safe_dir_name = quote(project_name, safe='')
        json_path = app_config.workspace_directory / "reports" / safe_dir_name / "ui-functional-test-scope.json"
        
        if not json_path.exists():
            ui_test_case_service.generate_ui_test_cases(projectId, None, None)
            
        if json_path.exists():
            return JSONResponse(content=json.loads(json_path.read_text(encoding="utf-8")))
        return JSONResponse(status_code=404, content={"message": "No UI test cases found"})
    except Exception as e:
        import traceback
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reports/api-test-cases/data/{projectId:path}")
async def get_api_test_cases_data(projectId: str):
    try:
        project_name = projectId.split("/")[-1].replace(".git", "") if "/" in projectId else projectId
        safe_dir_name = quote(project_name, safe='')
        json_path = app_config.workspace_directory / "reports" / safe_dir_name / "api-functional-test-scope.json"
        
        if not json_path.exists():
            api_test_case_service.generate_api_test_cases(projectId, None, None)
            
        if json_path.exists():
            return JSONResponse(content=json.loads(json_path.read_text(encoding="utf-8")))
        return JSONResponse(status_code=404, content={"message": "No API test cases found"})
    except Exception as e:
        import traceback
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/migrate", response_model=TaskResponse)
async def migrate(request: MigrateRequest):
    if request.provider:
        app_config.ai_provider = request.provider
        
    task = run_background_migration.delay(
        request.repoUrl, 
        request.targetVersion,
        request.apiKey,
        request.modelName,
        request.provider
    )
    return TaskResponse(task_id=task.id, status="PENDING")

@router.get("/migrate/status/{task_id}")
async def migrate_status(task_id: str):
    task_result = AsyncResult(task_id)
    if task_result.state == 'PENDING':
        return {"status": "PENDING"}
    elif task_result.state == 'SUCCESS':
        result = task_result.result
        save_report_to_file("last_migration.json", result)
        return {"status": "SUCCESS", "result": result}
    elif task_result.state == 'FAILURE':
        return {"status": "FAILURE", "error": str(task_result.info)}
    else:
        return {"status": task_result.state}

@router.post("/system/run-ui-tests/{repo_name}")
async def system_run_ui_tests(repo_name: str):
    project_dir = app_config.get_project_dir(repo_name)
    if not project_dir.exists():
        return JSONResponse(status_code=404, content={"message": "Project directory not found"})
    
    try:
        import os
        from app.services.project_runner_service import project_runner_service
        env = os.environ.copy()
        
        # Inject the correct base URL if the project is running
        if repo_name in project_runner_service.runs and project_runner_service.runs[repo_name].get("status") in ("RUNNING", "RUNNING_API"):
            port = project_runner_service.runs[repo_name].get("port")
            preferred_path = project_runner_service.runs[repo_name].get("preferred_preview_path")
            if port:
                base_url = f"http://127.0.0.1:{port}"
                if preferred_path:
                    base_url = base_url.rstrip("/") + "/" + preferred_path.lstrip("/")
                env["BASE_URL"] = base_url
                env["PLAYWRIGHT_BASE_URL"] = base_url

        # Run playwright tests in headed mode in a new visible console window.
        # Use cmd /k so the window stays open to show errors (e.g. if the app is not running).
        subprocess.Popen(
            ["cmd.exe", "/k", "npm install --prefer-offline && npx playwright test --headed"],
            cwd=str(project_dir),
            env=env,
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
        return {"status": "success", "message": "UI tests triggered in headed mode"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if request.provider:
        app_config.ai_provider = request.provider
        
    try:
        retrieved_docs = rag_service.search(request.message)
        
        rag_context = "System Knowledge Base Context:\n"
        for doc in retrieved_docs:
            rag_context += f"- Source: {doc['source']}\n{doc['content']}\n\n"
            
        reports_dir = get_reports_dir()
        last_analysis = reports_dir / "last_analysis.json"
        if last_analysis.exists():
            with open(last_analysis, "r", encoding="utf-8") as f:
                data = json.load(f)
                rag_context += "=== Current Repository Context ===\n"
                rag_context += f"- Project Name: {data.get('projectType')}\n"
                rag_context += f"- Java Version: {data.get('detectedJavaVersion')}\n"
                rag_context += f"- Frameworks: {data.get('frameworkVersions')}\n"
                rag_context += f"- Dependencies: {data.get('dependencies')}\n\n"
                
        last_migration = reports_dir / "last_migration.json"
        if last_migration.exists():
            with open(last_migration, "r", encoding="utf-8") as f:
                data = json.load(f)
                rag_context += "=== Current Testing Summary ===\n"
                rag_context += f"- Target Java Version: {data.get('targetVersion')}\n"
                rag_context += f"- Build Status: {data.get('buildStatus')}\n"
                rag_context += f"- Modified Files Count: {len(data.get('modifiedFiles', []))}\n\n"

        system_instruction = (
            "You are Prova, a highly helpful and expert Testing Assistant. "
            "Always answer the user's questions accurately and directly. "
            "If the question is about the repository, testing, or QA technical details, "
            "leverage the provided context (System Knowledge Base Context, Current Repository Context, and Current Testing Summary). "
            "If the question is general or unrelated to testing, "
            "answer it fully using your own general knowledge, keeping the tone polite, helpful, and professional. "
            "Provide concise, accurate, and markdown-formatted answers."
        )

        user_prompt = f"{rag_context}\nUser Question: {request.message}"
        
        ai_client = AIFactory.get_client()
        
        import asyncio
        try:
            answer = await asyncio.wait_for(
                asyncio.to_thread(ai_client.generate, user_prompt, system_instruction, request.apiKey, request.modelName),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            return ChatResponse(response="I apologize, but the AI service is taking too long to respond. Please try again or check your API key settings.")
        
        return ChatResponse(response=answer)
    except Exception as e:
        return ChatResponse(errorMessage=str(e))

@router.post("/convert", response_model=ConversionResponse)
async def convert(request: ConvertRequest):
    if request.provider:
        app_config.ai_provider = request.provider
        
    response = code_conversion_service.convert_files(request.files, request.apiKey, request.modelName)
    if response.success:
        save_report_to_file("last_conversion.json", response.model_dump())
    return response

@router.get("/report/migration")
async def report_migration():
    try:
        migration_data = load_report_from_file("last_migration.json")
        if not migration_data:
            return JSONResponse(status_code=404, content={"error": "No migration report found. Please run a migration first."})
        
        response_obj = MigrationResponse(**migration_data)
        pdf_bytes = report_service.generate_migration_pdf(response_obj)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=JavaMigrationReports.pdf"}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/report/conversion")
async def report_conversion():
    try:
        conversion_data = load_report_from_file("last_conversion.json")
        if not conversion_data:
            return JSONResponse(status_code=404, content={"error": "No conversion report found. Please run a code conversion first."})
        
        response_obj = ConversionResponse(**conversion_data)
        pdf_bytes = report_service.generate_conversion_pdf(response_obj)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=JavaConversionReports.pdf"}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/download/python")
async def download_python():
    try:
        reports_dir = get_reports_dir()
        conversion_file = reports_dir / "last_conversion.json"
        
        if not conversion_file.exists():
            return JSONResponse(status_code=400, content={"error": "No converted code found."})
            
        with open(conversion_file, "r", encoding="utf-8") as f:
            conversion_data = json.load(f)
            # Create a mock ConversionResponse from the dict
            converted_files = [ConvertedFile(**cf) for cf in conversion_data.get("convertedFiles", [])]
            
        analysis_data = None
        analysis_file = reports_dir / "last_analysis.json"
        if analysis_file.exists():
            with open(analysis_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                analysis_data = AnalysisResponse(**data)
                
        zip_bytes = code_conversion_service.package_python_zip(converted_files, analysis_data)
        
        return Response(
            content=zip_bytes,
            media_type="application/octet-stream",
            headers={"Content-Disposition": "attachment; filename=python_converted_files.zip"}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/repositories/{repositoryId}/tree")
async def get_repository_tree(repositoryId: str):
    project_dir = app_config.get_project_dir(repositoryId)
    print(f"DEBUG: get_repository_tree called with {repositoryId}. Checking {project_dir}. exists() = {project_dir.exists()}")
    if not project_dir.exists():
        return JSONResponse(status_code=404, content={"error": "Repository not found in workspace"})

    def build_tree(dir_path):
        tree = []
        try:
            for entry in sorted(os.scandir(dir_path), key=lambda e: (not e.is_dir(), e.name)):
                if entry.name in [".git", "node_modules", ".idea", ".vscode", "__pycache__", ".venv", "venv", ".next", "playwright-report", "test-results", "target", "build", "dist", "out"]:
                    continue
                if entry.name.endswith(".zip"):
                    continue
                
                rel_path = str(Path(entry.path).relative_to(project_dir)).replace("\\", "/")
                item = {"name": entry.name, "path": rel_path}
                if entry.is_dir():
                    item["type"] = "folder"
                    item["children"] = build_tree(entry.path)
                else:
                    item["type"] = "file"
                    item["extension"] = Path(entry.name).suffix.lstrip('.')
                tree.append(item)
        except Exception:
            pass
        return tree

    return {"repositoryName": repositoryId, "nodes": build_tree(project_dir)}

@router.get("/repositories/{repositoryId}/files/content")
async def get_repository_file_content(repositoryId: str, path: str):
    project_dir = app_config.get_project_dir(repositoryId)
    if not project_dir.exists():
        return JSONResponse(status_code=404, content={"error": "Repository not found"})

    full_path = (project_dir / path).resolve()
    
    # Path traversal protection
    try:
        full_path.relative_to(project_dir.resolve())
    except ValueError:
        return JSONResponse(status_code=403, content={"error": "Access denied"})

    if not full_path.exists():
        # Fallback: search by filename in the project directory if exact path fails
        filename = Path(path).name
        found_path = None
        for root, _, files in os.walk(project_dir):
            if filename in files:
                found_path = Path(root) / filename
                break
        
        if found_path:
            full_path = found_path
            path = str(full_path.relative_to(project_dir)).replace("\\", "/")
        else:
            # Generate simulated content for demonstration if file not found on disk
            ext = filename.split('.')[-1] if '.' in filename else ''
            
            mock_content = f"/* \n * Mock file generated for demonstration.\n * Original path: {path}\n */\n\n"
            if ext == 'html':
                mock_content += f"<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <title>{filename}</title>\n</head>\n<body>\n    <div class=\"container\">\n        <h1>{filename}</h1>\n        <p>This is a simulated template file mapped by PROVA AI.</p>\n    </div>\n</body>\n</html>"
            elif ext == 'java':
                class_name = filename.replace('.java', '')
                mock_content += f"package com.example;\n\nimport org.springframework.web.bind.annotation.*;\n\n@RestController\npublic class {class_name} {{\n    @GetMapping(\"/api/demo\")\n    public String getDemo() {{\n        return \"Simulated controller for {class_name}\";\n    }}\n}}"
            elif ext in ['js', 'jsx', 'ts', 'tsx']:
                mock_content += f"export default function {filename.split('.')[0]}() {{\n  return <div>Component mapped by AI</div>;\n}}"
            else:
                mock_content += "Content not available in simulated environment."
                
            return {"content": mock_content, "path": path, "type": "file", "extension": ext}

    extension = full_path.suffix.lstrip('.')
    
    # Detect binary files
    is_binary = False
    try:
        with open(full_path, "rb") as f:
            sample = f.read(4096)
        if b"\x00" in sample:
            is_binary = True
    except Exception:
        is_binary = True
        
    binary_exts = {'png', 'jpg', 'jpeg', 'gif', 'ico', 'pdf', 'zip', 'tar', 'gz', 'jar', 'war', 'class', 'exe', 'dll', 'so', 'dylib'}
    if extension.lower() in binary_exts:
        is_binary = True

    if is_binary:
        return {
            "name": full_path.name,
            "path": path,
            "extension": extension,
            "language": extension,
            "content": "",
            "previewSupported": False
        }

    try:
        content = full_path.read_text(encoding='utf-8', errors='replace')
        return {
            "name": full_path.name,
            "path": path,
            "extension": extension,
            "language": extension,
            "content": content,
            "previewSupported": True
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Error reading file: {e}"})

# Execution Module
execution_log_queues = {}
execution_logs_history = {}
execution_results = {}

@router.post("/repository/{repo_name}/run/{version}")
async def run_repository(repo_name: str, version: str):
    key = f"{repo_name}_{version}"
    execution_log_queues[key] = []
    execution_logs_history[key] = []
    execution_results[key] = {
        "repository": repo_name,
        "version": version,
        "buildStatus": "Pending",
        "startupStatus": "Pending",
        "testStatus": "Pending"
    }

    async def bg_execute():
        def on_log(line: str):
            execution_logs_history[key].append(line)
            # Send to all connected queues
            for q in execution_log_queues.get(key, []):
                q.put_nowait(line)
                
        result = await execution_service.execute_repository(repo_name, version, on_log)
        result["logs"] = "".join(execution_logs_history[key])
        execution_results[key] = result
        
        # Send EOF
        for q in execution_log_queues.get(key, []):
            q.put_nowait(None)

    asyncio.create_task(bg_execute())
    return {"status": "started", "key": key}

@router.get("/repository/{repo_name}/execution-status/{version}")
async def get_execution_status(repo_name: str, version: str):
    key = f"{repo_name}_{version}"
    if key in execution_results:
        return execution_results[key]
    return {"status": "Not Found"}

@router.get("/repository/{repo_name}/logs/{version}")
async def get_execution_logs(repo_name: str, version: str):
    key = f"{repo_name}_{version}"
    if key in execution_logs_history:
        return {"logs": "".join(execution_logs_history[key])}
    return {"logs": ""}

@router.websocket("/ws/repository/{repo_name}/logs/{version}")
async def execution_logs_ws(websocket: WebSocket, repo_name: str, version: str):
    await websocket.accept()
    key = f"{repo_name}_{version}"
    
    # Send history first
    if key in execution_logs_history:
        for line in execution_logs_history[key]:
            await websocket.send_text(line)
            
    # Then stream live logs
    if key in execution_results and execution_results[key].get("buildStatus") == "Pending":
        queue = asyncio.Queue()
        if key not in execution_log_queues:
            execution_log_queues[key] = []
        execution_log_queues[key].append(queue)
        
        try:
            while True:
                line = await queue.get()
                if line is None:
                    break
                await websocket.send_text(line)
        except WebSocketDisconnect:
            pass
        finally:
            if queue in execution_log_queues.get(key, []):
                execution_log_queues[key].remove(queue)
    else:
        # Execution already finished
        pass
    
    try:
        await websocket.close()
    except Exception:
        pass

# Project Runner Module
from app.services.project_runner_service import project_runner_service

@router.post("/run/start", response_model=RunStatusResponse)
async def start_project(request: RunStartRequest, http_request: Request):
    await project_runner_service.start_project(request.repoName)
    return attach_preview_url(project_runner_service.get_status(request.repoName), http_request, request.repoName)

@router.post("/run/stop", response_model=RunStatusResponse)
async def stop_project(request: RunStartRequest, http_request: Request):
    await project_runner_service.stop_project(request.repoName)
    return attach_preview_url(project_runner_service.get_status(request.repoName), http_request, request.repoName)

@router.get("/run/status/{repo_name}", response_model=RunStatusResponse)
async def get_project_status(repo_name: str, http_request: Request):
    return attach_preview_url(project_runner_service.get_status(repo_name), http_request, repo_name)

@router.post("/run/selenium/{repo_name}")
async def run_selenium_tests(repo_name: str):
    # Guard: Check if Project Runner is complete
    runner_completed = False
    try:
        status = project_runner_service.get_status(repo_name).get("status")
        if status in ["RUNNING", "RUNNING_API", "SUCCESS", "SUCCESSFUL"]:
            runner_completed = True
    except Exception:
        pass

    if not runner_completed:
        return JSONResponse(status_code=403, content={"error": "Project Runner must be completed before starting functional testing."})

    try:
        # Implementation logic here
        return {"status": "triggered"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})

@router.get("/run/logs/{repo_name}")
async def get_project_logs(repo_name: str):
    return {"logs": project_runner_service.get_logs(repo_name)}


async def _close_preview_stream(response: httpx.Response, client: httpx.AsyncClient):
    await response.aclose()
    await client.aclose()


async def _proxy_preview_request(repo_name: str, request: Request, path: str = ""):
    status = project_runner_service.get_status(repo_name)
    port = status.get("port")
    if not port:
        return JSONResponse(status_code=404, content={"error": "Preview server is not running"})

    target_base_url = f"http://127.0.0.1:{port}"
    proxy_prefix = f"{PREVIEW_PROXY_PREFIX}/{repo_name}"
    target_path = f"/{path.lstrip('/')}" if path else "/"

    forward_headers = {}
    for key, value in request.headers.items():
        if key.lower() not in {"host", "content-length"}:
            forward_headers[key] = value

    client = httpx.AsyncClient(base_url=target_base_url, follow_redirects=False, timeout=60.0)
    upstream_request = client.build_request(
        request.method,
        target_path,
        headers=forward_headers,
        content=request.stream(),
    )

    try:
        upstream_response = await client.send(upstream_request, stream=True)
    except httpx.RequestError:
        await client.aclose()
        return JSONResponse(status_code=502, content={"error": "Preview server is not reachable or timed out"})

    headers = dict(upstream_response.headers)
    headers.pop("x-frame-options", None)
    headers.pop("content-security-policy", None)
    headers.pop("transfer-encoding", None)
    headers.pop("content-encoding", None)

    location = upstream_response.headers.get("location")
    if location:
        resolved_location = urljoin(f"{target_base_url}/", location)
        parsed_location = urlsplit(resolved_location)
        if parsed_location.hostname in {"127.0.0.1", "localhost"} and parsed_location.port == port:
            rewritten_path = parsed_location.path or "/"
            if not rewritten_path.startswith("/"):
                rewritten_path = f"/{rewritten_path}"
            rewritten_location = f"{proxy_prefix}{rewritten_path}"
            if parsed_location.query:
                rewritten_location = f"{rewritten_location}?{parsed_location.query}"
            headers["location"] = rewritten_location

    content_type = upstream_response.headers.get("content-type", "").lower()
    if "text/html" in content_type:
        body = await upstream_response.aread()
        encoding = upstream_response.encoding or "utf-8"
        html = body.decode(encoding, errors="replace")
        html = rewrite_html_preview_assets(html, proxy_prefix)
        headers.pop("content-length", None)
        return Response(
            content=html,
            status_code=upstream_response.status_code,
            headers=headers,
            media_type=upstream_response.headers.get("content-type"),
        )

    return StreamingResponse(
        upstream_response.aiter_raw(),
        status_code=upstream_response.status_code,
        headers=headers,
        background=BackgroundTask(_close_preview_stream, upstream_response, client),
    )


@router.api_route("/run/preview/{repo_name}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def preview_root(repo_name: str, request: Request):
    return await _proxy_preview_request(repo_name, request)


@router.api_route("/run/preview/{repo_name}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def preview_path(repo_name: str, path: str, request: Request):
    return await _proxy_preview_request(repo_name, request, path)

# ── Playwright Testing Module ──────────────────────────────────────────
from app.services.playwright_service import playwright_service
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

@router.post("/run/playwright/{repo_name}")
async def run_playwright_tests(repo_name: str):
    # Guard: Check if Project Runner is complete
    runner_completed = False
    try:
        status = project_runner_service.get_status(repo_name).get("status")
        if status in ["RUNNING", "RUNNING_API", "SUCCESS", "SUCCESSFUL"]:
            runner_completed = True
    except Exception:
        pass

    if not runner_completed:
        return JSONResponse(status_code=403, content={"error": "Project Runner must be completed before starting functional testing."})

    try:
        # Implementation logic here
        return {"status": "triggered"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})

@router.get("/playwright/{repo_name}/status")
async def playwright_status(repo_name: str):
    """Return Playwright detection status and cached test results for a migrated project."""
    project_dir = app_config.get_project_dir(repo_name)
    status = playwright_service.get_status(repo_name, project_dir)
    # Make htmlReportUrl absolute so frontend can open it directly
    if status.get("htmlReportUrl") and status["htmlReportUrl"].startswith("/api/"):
        pass  # already relative — frontend will prepend the API base URL
    return JSONResponse(content=status)


@router.post("/playwright/{repo_name}/run")
async def playwright_run(repo_name: str, background_tasks: BackgroundTasks):
    """Kick off Playwright tests for the migrated project in the background."""
    project_dir = app_config.get_project_dir(repo_name)
    if not project_dir.exists():
        return JSONResponse(
            status_code=404,
            content={"error": f"Project '{repo_name}' not found in workspace."}
        )

    # Instead of failing fast, we check detection. If it's false, we know run_playwright_tests will auto-generate it.
    detection = playwright_service.detect_playwright(project_dir)

    # Mark as RUNNING immediately so UI can show spinner
    playwright_service._results[repo_name] = {**detection, "status": "RUNNING"}

    # Run tests in the background (non-blocking)
    async def _run():
        import asyncio
        import socket
        from app.services.project_runner_service import project_runner_service
        
        status = project_runner_service.get_status(repo_name).get("status")
        if status not in ["RUNNING", "RUNNING_API"]:
            try:
                print(f"[Playwright] Auto-starting application for '{repo_name}'...")
                await project_runner_service.start_project(repo_name)
            except Exception as e:
                print(f"[Playwright] Error auto-starting project: {e}")
                
        # Wait up to 120 seconds for project to spin up & port to open
        target_base_url = None
        for attempt in range(120):
            run_info = project_runner_service.get_status(repo_name)
            curr_status = run_info.get("status")
            port = run_info.get("port")
            
            if port:
                target_base_url = f"http://127.0.0.1:{port}"
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(1.0)
                    s.connect(("127.0.0.1", port))
                    s.close()
                    print(f"[Playwright] Application port {port} is active and ready!")
                    break
                except Exception:
                    pass
                    
            if curr_status in ["RUNNING", "RUNNING_API"]:
                break
                
            await asyncio.sleep(1)
            
        await playwright_service.run_playwright_tests(repo_name, project_dir, base_url=target_base_url)

    background_tasks.add_task(_run)
    return JSONResponse(content={**detection, "status": "RUNNING"})

@router.get("/migration/{id}/playwright/report")
async def get_migration_playwright_report_index(id: str):
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/api/migration/{id}/playwright/report/index.html")

@router.get("/migration/{repo_name}/playwright/report/{file_path:path}")
async def playwright_report(repo_name: str, file_path: str):
    """Serve the Playwright HTML report static files."""
    from fastapi.responses import HTMLResponse
    import mimetypes
    project_dir = app_config.get_project_dir(repo_name)
    report_dir = project_dir / "playwright-report"

    if not report_dir.exists():
        return HTMLResponse("<h1>Report not found. Please run the Playwright tests first.</h1>")

    if not file_path:
        file_path = "index.html"

    full_path = (report_dir / file_path).resolve()

    # Ensure resolved path is still inside report_dir
    try:
        full_path.relative_to(report_dir.resolve())
    except ValueError:
        return HTMLResponse("<h1>Access denied.</h1>", status_code=403)

    if not full_path.exists():
        return HTMLResponse(f"<h1>File not found: {file_path}</h1>", status_code=404)

    mt, _ = mimetypes.guess_type(str(full_path))
    if not mt:
        mt = "application/octet-stream"
    return FileResponse(str(full_path), media_type=mt)


# ── New Playwright Endpoints matching exact user request ────────────────
@router.get("/migration/{id}/playwright/status")
async def get_migration_playwright_status(id: str):
    # Map id to repo_name (which is consistent with how we execute)
    return await playwright_status(repo_name=id)

@router.post("/migration/{id}/playwright/run")
async def run_migration_playwright(id: str, background_tasks: BackgroundTasks):
    return await playwright_run(repo_name=id, background_tasks=background_tasks)

@router.get("/migration/{id}/playwright/results")
async def get_migration_playwright_results(id: str):
    # Can return the cached status which contains the results
    return await playwright_status(repo_name=id)

@router.get("/migration/{id}/playwright/report/download")
async def download_migration_playwright_report(id: str):
    project_dir = app_config.get_project_dir(id)
    report_dir = project_dir / "playwright-report"
    
    if not report_dir.exists():
        return JSONResponse(status_code=404, content={"error": "Playwright HTML report not found. Run tests first."})
        
    import shutil
    zip_path = project_dir / f"{id}_playwright_report.zip"
    shutil.make_archive(str(zip_path).replace(".zip", ""), 'zip', str(report_dir))
    
    return FileResponse(path=zip_path, filename=f"{id}_playwright_report.zip", media_type="application/zip")

@router.get("/migration/{id}/playwright/testcases")
async def get_migration_playwright_testcases(id: str):
    # Optional endpoint: extract testcases from results if needed, or just return status
    res = playwright_service.get_status(id, app_config.get_project_dir(id))
    return JSONResponse(content={"testcases": [], "total": res.get("totalTests", 0)})

# ── Selenium Testing Endpoints ──────────────────────────────────────────
from app.services.selenium_service import selenium_service

@router.get("/migration/{id}/selenium/status")
async def get_migration_selenium_status(id: str):
    project_dir = app_config.get_project_dir(id)
    status = selenium_service.get_status(id, project_dir)
    return JSONResponse(content=status)

@router.post("/migration/{id}/selenium/run")
async def run_migration_selenium(id: str, background_tasks: BackgroundTasks):
    project_dir = app_config.get_project_dir(id)
    if not project_dir.exists():
        return JSONResponse(
            status_code=404,
            content={"error": f"Project '{id}' not found in workspace."}
        )

    detection = selenium_service.detect_selenium(project_dir)
    selenium_service._results[id] = {**detection, "status": "RUNNING"}

    async def _run():
        import asyncio
        import socket
        from app.services.project_runner_service import project_runner_service
        runner_status = project_runner_service.get_status(id).get("status")
        if runner_status not in ["RUNNING", "RUNNING_API"]:
            try:
                print(f"[Selenium] Auto-starting application for '{id}'...")
                await project_runner_service.start_project(id)
            except Exception as e:
                print(f"[Selenium] Failed to auto-start project runner: {e}")

        # Wait up to 120 seconds for project to spin up & port to open
        target_base_url = None
        for attempt in range(120):
            run_info = project_runner_service.get_status(id)
            curr_status = run_info.get("status")
            port = run_info.get("port")
            
            if port:
                target_base_url = f"http://127.0.0.1:{port}"
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.settimeout(1.0)
                    s.connect(("127.0.0.1", port))
                    s.close()
                    print(f"[Selenium] Application port {port} is active and ready!")
                    break
                except Exception:
                    pass
                    
            if curr_status in ["RUNNING", "RUNNING_API"]:
                break
                
            await asyncio.sleep(1)

        await selenium_service.run_selenium_tests(id, project_dir)

    background_tasks.add_task(_run)
    return JSONResponse(content={**detection, "status": "RUNNING"})

@router.get("/migration/{id}/selenium/report")
async def get_migration_selenium_report_index(id: str):
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/api/migration/{id}/selenium/report/allure-report/index.html")

@router.get("/migration/{id}/selenium/report/download")
async def download_migration_selenium_report(id: str):
    project_dir = app_config.get_project_dir(id)
    report_dir = project_dir / "selenium-report" / "allure-report"
    
    if not report_dir.exists():
        # Fallback if allure hasn't generated but maybe report.html exists
        report_dir = project_dir / "selenium-report"
        if not report_dir.exists():
            return JSONResponse(status_code=404, content={"error": "Selenium report not found. Run tests first."})
            
    import shutil
    zip_path = project_dir / f"{id}_selenium_report.zip"
    shutil.make_archive(str(zip_path).replace(".zip", ""), 'zip', str(report_dir))
    
    return FileResponse(path=zip_path, filename=f"{id}_selenium_report.zip", media_type="application/zip")

@router.get("/migration/{repo_name}/selenium/report/{file_path:path}")
async def get_selenium_report_file(repo_name: str, file_path: str):
    import mimetypes
    project_dir = app_config.get_project_dir(repo_name)
    report_dir = project_dir / "selenium-report"
    
    if not report_dir or not report_dir.exists():
        return HTMLResponse("<h1>Report not found. Please run the Selenium tests first.</h1>")
    
    if not file_path:
        file_path = "allure-report/index.html"
        
    full_path = report_dir / file_path
    if full_path.exists() and full_path.is_file():
        mt, _ = mimetypes.guess_type(str(full_path))
        if not mt:
            mt = "application/octet-stream"
        return FileResponse(full_path, media_type=mt)
    return HTMLResponse(f"<h1>File not found: {file_path}</h1>", status_code=404)


@router.websocket("/ws/run/logs/{repo_name}")
async def run_project_logs_ws(websocket: WebSocket, repo_name: str):
    await websocket.accept()
    
    # Send historical logs first
    logs = project_runner_service.get_logs(repo_name)
    if logs:
        await websocket.send_text(logs)
        
    # Register queue to stream live logs
    queue = asyncio.Queue()
    if repo_name not in project_runner_service.log_queues:
        project_runner_service.log_queues[repo_name] = []
    project_runner_service.log_queues[repo_name].append(queue)
    
    try:
        while True:
            line = await queue.get()
            if line is None:  # EOF signal
                break
            await websocket.send_text(line)
    except WebSocketDisconnect:
        pass
    finally:
        if repo_name in project_runner_service.log_queues and queue in project_runner_service.log_queues[repo_name]:
            project_runner_service.log_queues[repo_name].remove(queue)
        try:
            await websocket.close()
        except Exception:
            pass

from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
import mimetypes

@router.get("/migration/{repo_name}/playwright/report")
async def get_playwright_report_index(repo_name: str):
    return RedirectResponse(url=f"/api/migration/{repo_name}/playwright/report/index.html")

@router.get("/migration/{repo_name}/playwright/report/{file_path:path}")
async def get_playwright_report_file(repo_name: str, file_path: str):
    from app.services.playwright_service import playwright_service
    from app.config import app_config
    project_dir = app_config.get_project_dir(repo_name)
    
    report_dir = playwright_service.get_report_dir(repo_name, project_dir)
    if not report_dir or not report_dir.exists():
        return HTMLResponse("<h1>Report not found. Please run the Playwright tests first.</h1>")
    
    if not file_path:
        file_path = "index.html"
        
    full_path = report_dir / file_path
    if full_path.exists() and full_path.is_file():
        mt, _ = mimetypes.guess_type(str(full_path))
        if not mt:
            mt = "application/octet-stream"
        return FileResponse(full_path, media_type=mt)
    return HTMLResponse(f"<h1>File not found: {file_path}</h1>", status_code=404)


@router.post("/system/run-ui-tests")
async def run_ui_tests(background_tasks: BackgroundTasks):
    def _run_tests():
        import subprocess
        # Path to frontend root
        frontend_dir = app_config.project_root.parent / "frontend"
        if not frontend_dir.exists():
            frontend_dir = app_config.project_root / "frontend"
        if not frontend_dir.exists():
            frontend_dir = Path(r"c:\Users\ST-Sivaranjini\Downloads\java_convertion 4\frontend")
            
        subprocess.Popen(
            "npx playwright test --headed",
            cwd=str(frontend_dir),
            shell=True
        )
    
    background_tasks.add_task(_run_tests)
    return {"status": "started", "message": "UI tests triggered in headed mode."}



from app.services.ai_test_selector_service import ai_test_selector_service

@router.get('/functional-testing/{repositoryId}/recommendation')
async def get_test_recommendation(repositoryId: str):
    try:
        return ai_test_selector_service.recommend_tools(repositoryId)
    except Exception as e:
        return JSONResponse(status_code=400, content={'error': str(e)})

@router.get('/functional-testing/{repositoryId}/ui/files')
async def get_ui_test_files(repositoryId: str):
    try:
        return ai_test_selector_service.get_ui_files(repositoryId)
    except Exception as e:
        return JSONResponse(status_code=400, content={'error': str(e)})

@router.get('/functional-testing/{repositoryId}/api/files')
async def get_api_test_files(repositoryId: str):
    try:
        return ai_test_selector_service.get_api_files(repositoryId)
    except Exception as e:
        return JSONResponse(status_code=400, content={'error': str(e)})

@router.get('/functional-testing/{repositoryId}/files/{fileId:path}/download')
async def download_test_file(repositoryId: str, fileId: str):
    # Mock download file
    content = f"// Test file content for {fileId}\\n\\ndescribe('Test', () => {{\\n  it('works', () => {{\\n    expect(true).toBe(true);\\n  }});\\n}});"
    return Response(content=content, media_type='text/plain', headers={'Content-Disposition': f'attachment; filename={fileId.split("/")[-1] if "/" in fileId else fileId}.js'})

@router.get('/functional-testing/{repositoryId}/ui/download-all')
async def download_all_ui_files(repositoryId: str):
    import io, zipfile
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'a', zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr('ui_tests/LoginTest.spec.js', '// Mock login test')
        zip_file.writestr('ui_tests/NavigationTest.spec.js', '// Mock nav test')
    return Response(content=zip_buffer.getvalue(), media_type='application/zip', headers={'Content-Disposition': 'attachment; filename=ui_tests.zip'})

@router.get('/functional-testing/{repositoryId}/api/download-all')
async def download_all_api_files(repositoryId: str):
    import io, zipfile
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'a', zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr('api_tests/UserControllerTest.java', '// Mock user test')
    return Response(content=zip_buffer.getvalue(), media_type='application/zip', headers={'Content-Disposition': 'attachment; filename=api_tests.zip'})

@router.get('/functional-testing/{repositoryId}/reports/ui/download')
async def download_ui_report(repositoryId: str):
    return Response(content='<html><body><h1>UI Report</h1></body></html>', media_type='text/html', headers={'Content-Disposition': 'attachment; filename=ui_report.html'})

@router.get('/functional-testing/{repositoryId}/reports/api/download')
async def download_api_report(repositoryId: str):
    return Response(content='<html><body><h1>API Report</h1></body></html>', media_type='text/html', headers={'Content-Disposition': 'attachment; filename=api_report.html'})


@router.get("/dynamic-analysis/{projectId:path}")
async def get_dynamic_analysis_status(projectId: str):
    try:
        from urllib.parse import quote
        project_name = projectId.split("/")[-1].replace(".git", "") if "/" in projectId else projectId
        safe_dir_name = quote(project_name, safe='')
        
        # We saved it to the root of reports dir in tasks.py:
        # save_report_to_file(f"dynamic_analysis_{project_id}.json", execution_report)
        json_path = get_reports_dir() / f"dynamic_analysis_{projectId}.json"
        
        if not json_path.exists():
            return JSONResponse(status_code=200, content={"status": "PROCESSING"})
            
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ── Summary Metadata Endpoint ────────────────────────────────────────────────
# NEW additive endpoint — reads existing JSON caches and computes enriched
# card-level metadata for the interactive popups on the Testing Strategy page.
# Does NOT modify any existing logic, routes, or services.

_summary_metadata_cache: dict = {}  # in-memory LRU: {project_name: (timestamp, data)}
_SUMMARY_CACHE_TTL = 60  # seconds

@router.get("/reports/summary-metadata/{projectId:path}")
async def get_summary_metadata(projectId: str):
    import time as _time
    from urllib.parse import quote

    try:
        project_name = projectId.split("/")[-1].replace(".git", "") if "/" in projectId else projectId
        safe_dir_name = quote(project_name, safe='')

        # Check in-memory cache first
        cached = _summary_metadata_cache.get(project_name)
        if cached:
            ts, data = cached
            if _time.time() - ts < _SUMMARY_CACHE_TTL:
                return JSONResponse(content=data)

        reports_base = get_reports_dir()
        ui_json_path = reports_base / safe_dir_name / "ui-functional-test-scope.json"
        api_json_path = reports_base / safe_dir_name / "api-functional-test-scope.json"

        if not ui_json_path.exists() and not api_json_path.exists():
            return JSONResponse(status_code=200, content={"status": "NOT_READY"})

        # ── Load UI test cases ─────────────────────────────────────────────
        ui_test_cases = []
        ui_metrics = {}
        if ui_json_path.exists():
            try:
                raw = json.loads(ui_json_path.read_text(encoding="utf-8"))
                ui_test_cases = raw.get("test_cases", []) if isinstance(raw, dict) else []
                ui_metrics = raw.get("metrics", {}) if isinstance(raw, dict) else {}
            except Exception:
                pass

        # ── Load API test cases ────────────────────────────────────────────
        api_test_cases = []
        if api_json_path.exists():
            try:
                raw = json.loads(api_json_path.read_text(encoding="utf-8"))
                api_test_cases = raw if isinstance(raw, list) else raw.get("test_cases", [])
            except Exception:
                pass

        # ─────────────────────────────────────────────────────────────────
        # UI SUMMARY COMPUTATIONS
        # ─────────────────────────────────────────────────────────────────

        # Filter fallbacks
        valid_ui = [tc for tc in ui_test_cases
                    if tc.get("scenario") not in ("Basic Load Test", "Fallback Scenario")]

        total_ui = len(valid_ui)

        # Module grouping — use route as module key
        module_map: dict = {}
        for tc in valid_ui:
            route = (tc.get("route") or tc.get("scenario") or "Unknown").strip()
            module_map.setdefault(route, []).append(tc.get("scenario", "Test Case"))

        modules_list = [
            {"name": route, "scenarios": scenarios}
            for route, scenarios in module_map.items()
        ]

        # Complexity calculation
        high = medium = low = 0
        complexity_reasons = []
        for tc in valid_ui:
            steps_raw = tc.get("steps", "")
            if isinstance(steps_raw, list):
                step_count = len(steps_raw)
            else:
                step_count = len([s for s in str(steps_raw).split("\n") if s.strip()])
            if step_count > 5:
                high += 1
            elif step_count >= 3:
                medium += 1
            else:
                low += 1

        if high > medium and high > low:
            avg_complexity = "High"
        elif medium > low or high > 0:
            avg_complexity = "Medium-High"
        elif medium > 0:
            avg_complexity = "Medium"
        else:
            avg_complexity = "Low"

        # Dynamic complexity reasons based on actual data
        forms_detected = ui_metrics.get("forms_detected", 0)
        routes_count = ui_metrics.get("detected_routes", len(module_map))
        if high > 0:
            complexity_reasons.append(f"{high} test(s) with >5 execution steps (High complexity)")
        if medium > 0:
            complexity_reasons.append(f"{medium} test(s) with 3–5 steps (Medium complexity)")
        if forms_detected > 0:
            complexity_reasons.append(f"{forms_detected} form(s) with validation logic detected")
        if routes_count > 3:
            complexity_reasons.append(f"{routes_count} distinct routes/pages to cover")

        # Execution estimate — avg 6 sec per test case
        avg_sec_per_test = 6
        total_sec = total_ui * avg_sec_per_test
        est_mins = max(1, round(total_sec / 60, 1)) if total_ui > 0 else 0

        # Per-module execution estimate for fastest/slowest
        module_times = []
        for mod in modules_list:
            mod_tests = len(mod["scenarios"])
            mod_sec = mod_tests * avg_sec_per_test
            module_times.append({"module": mod["name"], "tests": mod_tests, "estimated_sec": mod_sec})

        module_times_sorted = sorted(module_times, key=lambda x: x["estimated_sec"])
        fastest_module = module_times_sorted[0] if module_times_sorted else None
        slowest_module = module_times_sorted[-1] if module_times_sorted else None

        # Breakdown by scenario type keywords
        func_count = sum(1 for tc in valid_ui if any(k in (tc.get("scenario", "") + tc.get("type", "")).lower()
                                                      for k in ["login", "register", "submit", "form", "button", "click"]))
        validation_count = sum(1 for tc in valid_ui if any(k in (tc.get("scenario", "") + tc.get("steps", "")).lower()
                                                            for k in ["valid", "invalid", "error", "required", "format"]))
        edge_count = sum(1 for tc in valid_ui if any(k in (tc.get("scenario", "")).lower()
                                                      for k in ["edge", "boundary", "empty", "null", "limit"]))
        negative_count = sum(1 for tc in valid_ui if any(k in (tc.get("scenario", "")).lower()
                                                          for k in ["negative", "fail", "wrong", "incorrect", "invalid"]))
        ui_count = total_ui - func_count  # remainder

        # ─────────────────────────────────────────────────────────────────
        # API SUMMARY COMPUTATIONS
        # ─────────────────────────────────────────────────────────────────

        valid_api = [tc for tc in api_test_cases
                     if tc.get("scenario") not in ("Fallback API Test",)]

        total_api = len(valid_api)

        # HTTP method counts
        get_count = sum(1 for tc in valid_api if tc.get("method", "").upper() == "GET")
        post_count = sum(1 for tc in valid_api if tc.get("method", "").upper() == "POST")
        put_count = sum(1 for tc in valid_api if tc.get("method", "").upper() in ("PUT", "PATCH"))
        delete_count = sum(1 for tc in valid_api if tc.get("method", "").upper() == "DELETE")
        other_count = total_api - get_count - post_count - put_count - delete_count

        # Endpoint tree grouped by source/controller
        endpoint_map: dict = {}
        for tc in valid_api:
            source = tc.get("source") or "API"
            path = tc.get("path", "/api")
            method = tc.get("method", "GET").upper()
            key = f"{method} {path}"
            endpoint_map.setdefault(source, {}).setdefault(key, []).append(tc.get("scenario", "Test"))

        endpoints_tree = [
            {
                "controller": ctrl,
                "endpoints": [
                    {"endpoint": ep, "scenarios": scenarios}
                    for ep, scenarios in endpoints.items()
                ]
            }
            for ctrl, endpoints in endpoint_map.items()
        ]

        unique_endpoints = list({f"{tc.get('method','GET').upper()} {tc.get('path','/api')}" for tc in valid_api})

        # Coverage scope determination
        methods_present = list({tc.get("method", "GET").upper() for tc in valid_api})
        has_get = "GET" in methods_present
        has_post = "POST" in methods_present
        has_delete = "DELETE" in methods_present
        has_put = "PUT" in methods_present or "PATCH" in methods_present

        coverage_flags = {
            "Authentication": any(k in str(valid_api).lower() for k in ["auth", "login", "token", "jwt"]),
            "Authorization": any(k in str(valid_api).lower() for k in ["authoriz", "role", "permission", "forbidden", "403"]),
            "CRUD Operations": has_get and has_post,
            "Business Flow": has_post and (has_put or has_delete),
            "Exception Handling": any(k in str(valid_api).lower() for k in ["error", "exception", "invalid", "400", "404", "500"]),
            "Integration": len(endpoint_map) > 1,
            "Performance Ready": total_api >= 10,
        }

        # Mock data categories from actual test cases
        mock_categories = []
        all_api_text = json.dumps(valid_api).lower()
        if any(k in all_api_text for k in ["user", "username", "email", "password"]):
            mock_categories.append({
                "category": "User Data",
                "items": ["username", "email", "password", "userId", "profileData"]
            })
        if any(k in all_api_text for k in ["product", "item", "catalog"]):
            mock_categories.append({
                "category": "Product Data",
                "items": ["productId", "productName", "price", "category", "inventory"]
            })
        if any(k in all_api_text for k in ["order", "cart", "checkout", "purchase"]):
            mock_categories.append({
                "category": "Order / Cart Data",
                "items": ["orderId", "cartItems", "totalAmount", "shippingAddress"]
            })
        if any(k in all_api_text for k in ["token", "jwt", "bearer", "auth"]):
            mock_categories.append({
                "category": "Auth Tokens",
                "items": ["JWT Bearer Token", "Refresh Token", "Authorization Headers"]
            })
        # Always include request/response payloads
        mock_categories.append({
            "category": "Request Payloads",
            "items": [f"{tc.get('method','GET')} {tc.get('path','/api')}" for tc in valid_api[:6]]
        })
        mock_categories.append({
            "category": "Response Payloads",
            "items": ["200 OK body", "201 Created body", "400 Error body", "404 Not Found body", "500 Server Error body"]
        })

        # ─────────────────────────────────────────────────────────────────
        # BUILD RESPONSE
        # ─────────────────────────────────────────────────────────────────
        result = {
            "status": "READY",
            "project": project_name,
            "ui": {
                "total": total_ui,
                "breakdown": {
                    "functional": max(0, func_count),
                    "validation": max(0, validation_count),
                    "edge_case": max(0, edge_count),
                    "negative": max(0, negative_count),
                    "ui_interaction": max(0, ui_count),
                },
                "modules": modules_list,
                "complexity": {
                    "level": avg_complexity,
                    "high": high,
                    "medium": medium,
                    "low": low,
                    "reasons": complexity_reasons,
                    "factors": {
                        "validations": forms_detected,
                        "routes": routes_count,
                        "high_complexity_tests": high,
                        "medium_complexity_tests": medium,
                        "low_complexity_tests": low,
                    }
                },
                "execution": {
                    "total_tests": total_ui,
                    "avg_sec_per_test": avg_sec_per_test,
                    "total_sec": total_sec,
                    "est_mins": est_mins,
                    "fastest_module": fastest_module,
                    "slowest_module": slowest_module,
                    "module_breakdown": module_times,
                }
            },
            "api": {
                "total": total_api,
                "breakdown": {
                    "get": get_count,
                    "post": post_count,
                    "put_patch": put_count,
                    "delete": delete_count,
                    "other": other_count,
                },
                "unique_endpoints": unique_endpoints,
                "endpoints_tree": endpoints_tree,
                "coverage": coverage_flags,
                "mock_categories": mock_categories,
            }
        }

        # Store in memory cache
        _summary_metadata_cache[project_name] = (_time.time(), result)
        return JSONResponse(content=result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
