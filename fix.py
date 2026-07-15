import os, re

d = r'c:\Users\ST-Sivaranjini\OneDrive - SORIM TECHNOLOGIES\Desktop\Testex\Testex\python_backend\app'
files = [os.path.join(r, f) for r, _, fs in os.walk(d) for f in fs if f.endswith('.py')]

for p in files:
    with open(p, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(r'app_config\.workspace_directory\s*/\s*repo_name', r'app_config.get_project_dir(repo_name)', content)
    new_content = re.sub(r'app_config\.workspace_directory\s*/\s*project_name', r'app_config.get_project_dir(project_name)', new_content)
    new_content = re.sub(r'app_config\.workspace_directory\s*/\s*repositoryId', r'app_config.get_project_dir(repositoryId)', new_content)
    new_content = re.sub(r'app_config\.workspace_directory\s*/\s*id', r'app_config.get_project_dir(id)', new_content)
    
    if new_content != content:
        print(f"Updated {p}")
        with open(p, 'w', encoding='utf-8') as f:
            f.write(new_content)
