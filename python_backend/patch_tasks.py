import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/python_backend/app/tasks.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_path_ui = """        from app.config import app_config
        workspace_reports = app_config.workspace_directory / "reports"
        ui_report_path = workspace_reports / "ui-functional-test-scope.json" """

new_path_ui = """        from app.config import app_config
        from urllib.parse import quote
        safe_dir_name = quote(project_id.split("/")[-1].replace(".git", "") if "/" in project_id else project_id, safe='')
        workspace_reports = app_config.workspace_directory / "reports" / safe_dir_name
        ui_report_path = workspace_reports / "ui-functional-test-scope.json" """

content = content.replace(old_path_ui, new_path_ui)

old_path_api = """        api_report_path = workspace_reports / "api-test-scope.json" """
new_path_api = """        api_report_path = workspace_reports / "api-test-scope.json" """

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("tasks.py report paths fixed")
