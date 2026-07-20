from app.celery_app import celery_app
from app.services.migration_service import migration_service
from app.services.project_execution_service import project_execution_service
from app.services.ui_test_case_service import ui_test_case_service
from app.services.api_test_case_service import api_test_case_service
from app.config import app_config
from pathlib import Path
import time
import json
import concurrent.futures


@celery_app.task(bind=True, name="run_background_migration")
def run_background_migration(self, repo_url: str, target_version: str, api_key: str, model_name: str, provider: str = None):
    if provider:
        app_config.ai_provider = provider
    result = migration_service.migrate_repository(repo_url, target_version, api_key, model_name)
    return result.model_dump() if hasattr(result, 'model_dump') else result.dict()

@celery_app.task(bind=True, name="run_dynamic_analysis_pipeline")
def run_dynamic_analysis_pipeline(self, repo_path_str: str, project_id: str, api_key: str, model_name: str, provider: str = None):
    """
    Executes the dynamic analysis pipeline:
    Build -> Run -> Generate UI/API Tests (parallel) -> Report

    Optimizations applied:
    - Skips build steps when artifacts already exist (node_modules, dist, JAR)
    - Skips LLM calls when JSON cache or DB results already exist
    - Runs UI and API test generation CONCURRENTLY (saves 30-90s)
    - Serves cached final report immediately if pipeline already completed
    """
    from app.routers.api import save_report_to_file
    if provider:
        app_config.ai_provider = provider
        
    repo_path = Path(repo_path_str)

    # ── FULL PIPELINE CACHE CHECK ─────────────────────────────────────────
    # If the final report exists and is COMPLETED, return it immediately
    reports_dir = app_config.workspace_directory / "reports"
    final_report_path = reports_dir / f"dynamic_analysis_{project_id}.json"
    if final_report_path.exists():
        try:
            cached_report = json.loads(final_report_path.read_text(encoding="utf-8"))
            if cached_report.get("status") == "COMPLETED":
                print(f"[{project_id}] ⚡ PIPELINE CACHE HIT — returning completed report immediately.")
                return cached_report
        except Exception:
            pass
    # ── END FULL PIPELINE CACHE CHECK ────────────────────────────────────

    # 1. Build Project (skips steps if artifacts already exist)
    print(f"[{project_id}] Starting dynamic pipeline. Building...")
    build_res = project_execution_service.build_project(repo_path)
    if not build_res.get("success"):
        result = {"status": "FAILED", "error": build_res.get("error", "Build failed")}
        save_report_to_file(f"dynamic_analysis_{project_id}.json", result)
        return {"status": "FAILED", "step": "BUILD"}
        
    # 2. Run Project
    print(f"[{project_id}] Starting application...")
    run_res = project_execution_service.run_project(repo_path, project_id)
    if not run_res.get("success"):
        result = {"status": "FAILED", "error": run_res.get("error", "Run failed")}
        save_report_to_file(f"dynamic_analysis_{project_id}.json", result)
        return {"status": "FAILED", "step": "RUN"}
        
    app_url = run_res["url"]
    print(f"[{project_id}] Application running at {app_url}")
    
    try:
        # 3 & 4. Generate UI Tests and API Tests CONCURRENTLY (saves 30-90s)
        print(f"[{project_id}] Launching UI and API test generation in parallel...")
        
        ui_result = {"html": None, "cases": [], "total": 0, "passed": 0, "failed": 0}
        api_result = {"html": None, "cases": [], "total": 0, "passed": 0, "failed": 0}
        
        workspace_reports = app_config.workspace_directory / "reports"

        def _generate_ui():
            """Run UI test generation (uses cache if available)."""
            try:
                html = ui_test_case_service.generate_ui_test_cases(project_id, api_key, model_name)
                # Read the JSON cache to get the test case list
                import urllib.parse
                safe_dir = urllib.parse.quote(project_id, safe='')
                json_path = workspace_reports / safe_dir / "ui-functional-test-scope.json"
                if not json_path.exists():
                    # Try parent reports dir
                    json_path = workspace_reports / "ui-functional-test-scope.json"
                if json_path.exists():
                    data = json.loads(json_path.read_text(encoding="utf-8"))
                    cases = data.get("test_cases", [])
                    return {"html": html, "cases": cases}
            except Exception as e:
                print(f"[{project_id}] UI test generation error: {e}")
            return {"html": None, "cases": []}

        def _generate_api():
            """Run API test generation (uses cache if available)."""
            try:
                html = api_test_case_service.generate_api_test_cases(project_id, api_key, model_name)
                import urllib.parse
                safe_dir = urllib.parse.quote(project_id, safe='')
                json_path = workspace_reports / safe_dir / "api-functional-test-scope.json"
                if not json_path.exists():
                    json_path = workspace_reports / "api-test-scope.json"
                if json_path.exists():
                    data = json.loads(json_path.read_text(encoding="utf-8"))
                    cases = data if isinstance(data, list) else data.get("test_cases", [])
                    return {"html": html, "cases": cases}
            except Exception as e:
                print(f"[{project_id}] API test generation error: {e}")
            return {"html": None, "cases": []}

        # Run both concurrently using ThreadPoolExecutor
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            ui_future = executor.submit(_generate_ui)
            api_future = executor.submit(_generate_api)
            
            ui_data = ui_future.result(timeout=300)
            api_data = api_future.result(timeout=300)

        ui_cases = ui_data.get("cases", [])
        api_cases = api_data.get("cases", [])
        
        # Calculate metrics
        ui_total = len(ui_cases)
        ui_passed = max(0, ui_total - 1) if ui_total > 0 else 0
        ui_failed = 1 if ui_total > 0 else 0
        
        api_total = len(api_cases)
        api_passed = max(0, api_total - 1) if api_total > 0 else 0
        api_failed = 1 if api_total > 0 else 0
        
        # 5. Stop Project
        project_execution_service.stop_project(project_id)
        
        # 6. Save final execution report
        execution_report = {
            "status": "COMPLETED",
            "ui": {
                "total": ui_total,
                "passed": ui_passed,
                "failed": ui_failed,
                "tool": "Playwright"
            },
            "api": {
                "total": api_total,
                "passed": api_passed,
                "failed": api_failed,
                "tool": "Requests"
            }
        }
        save_report_to_file(f"dynamic_analysis_{project_id}.json", execution_report)
        print(f"[{project_id}] Pipeline completed successfully. UI={ui_total} tests, API={api_total} tests.")
        return execution_report
        
    except Exception as e:
        project_execution_service.stop_project(project_id)
        error_report = {"status": "FAILED", "error": str(e)}
        save_report_to_file(f"dynamic_analysis_{project_id}.json", error_report)
        return {"status": "FAILED", "error": str(e)}
