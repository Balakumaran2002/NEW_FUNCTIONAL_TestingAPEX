import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/python_backend/app/routers/api.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if 'from app.tasks import run_dynamic_analysis_pipeline' not in content:
    content = content.replace('from app.services.rag_service import rag_service', 
                              'from app.services.rag_service import rag_service\nfrom app.tasks import run_dynamic_analysis_pipeline')

# 2. Add Celery trigger
old_trigger = """    # Save the analysis result into the session
    session_service.update_session(session_id, {
        "analysisResult": response.model_dump(),
        "workflowState": {"analysisCompleted": True}
    })
    
    save_report_to_file("last_analysis.json", response.model_dump()) # keeping for backward compatibility if needed, but not strictly required
    return response"""

new_trigger = """    # Save the analysis result into the session
    session_service.update_session(session_id, {
        "analysisResult": response.model_dump(),
        "workflowState": {"analysisCompleted": True}
    })
    
    # TRIGGER DYNAMIC TEST EXECUTION IN BACKGROUND
    # Pass repo_path_str as string. We assume response.projectId is the local repo name/path relative or absolute.
    # We will pass the full local path if it was used, else use the default workspace logic.
    from app.config import app_config
    if request.localPath:
        repo_path_str = request.localPath
    else:
        # Construct path based on analysis logic
        repo_name = response.projectId
        repo_path_str = str(app_config.workspace_directory / repo_name)
        
    run_dynamic_analysis_pipeline.delay(
        repo_path_str, 
        response.projectId, 
        request.apiKey, 
        request.modelName, 
        request.provider
    )
    
    save_report_to_file("last_analysis.json", response.model_dump()) # keeping for backward compatibility if needed, but not strictly required
    return response"""

content = content.replace(old_trigger, new_trigger)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("api.py patched to trigger run_dynamic_analysis_pipeline")
