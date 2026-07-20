import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/python_backend/app/routers/api.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_endpoint = """@router.get("/dynamic-analysis/{projectId:path}")
async def get_dynamic_analysis_status(projectId: str):
    try:
        from urllib.parse import quote
        project_name = projectId.split("/")[-1].replace(".git", "") if "/" in projectId else projectId
        safe_dir_name = quote(project_name, safe='')
        
        # We saved it to the root of reports dir in tasks.py:
        # save_report_to_file(f"dynamic_analysis_{project_id}.json", execution_report)
        json_path = get_reports_dir() / f"dynamic_analysis_{projectId}.json"
        
        if not json_path.exists():
            return JSONResponse(status_code=404, content={"status": "PROCESSING"})
            
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
        
"""

# Append it before the end of file (or before some known endpoint)
if "def get_dynamic_analysis_status" not in content:
    content = content + "\n\n" + new_endpoint

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("api.py patched with /dynamic-analysis endpoint")
