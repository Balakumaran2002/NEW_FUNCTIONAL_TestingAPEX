import os
from pathlib import Path

class AppConfig:
    def __init__(self):
        self.ai_provider = os.getenv("AI_PROVIDER", "gemini")
        self.work_dir_name = os.getenv("APP_WORK_DIR", "workspace")

    @property
    def workspace_directory(self) -> Path:
        # In java it was java_convertion/backend/workspace
        # Here we make it java_convertion/python_backend/workspace
        dir_path = Path(self.work_dir_name)
        dir_path.mkdir(parents=True, exist_ok=True)
        return dir_path.absolute()

    @property
    def project_root(self) -> Path:
        # Returns java_convertion directory
        return self.workspace_directory.parent.parent

    def get_project_dir(self, repo_name: str) -> Path:
        base_dir = self.workspace_directory / repo_name
        if (base_dir / ".git").exists() or (base_dir / "pom.xml").exists():
            return base_dir
            
        # Try replacing spaces with hyphens
        hyphen_name = repo_name.replace(" ", "-")
        hyphen_dir = self.workspace_directory / hyphen_name
        if (hyphen_dir / ".git").exists() or (hyphen_dir / "pom.xml").exists():
            return hyphen_dir
        
        candidates = []
        for d in self.workspace_directory.iterdir():
            if d.is_dir() and (d.name.startswith(f"{repo_name}_") or d.name.startswith(f"{hyphen_name}_")) and ((d / ".git").exists() or (d / "pom.xml").exists()):
                try:
                    ts = int(d.name.split("_")[-1])
                    candidates.append((ts, d))
                except ValueError:
                    pass
        
        if candidates:
            candidates.sort(key=lambda x: x[0], reverse=True)
            return candidates[0][1]
            
        return base_dir

app_config = AppConfig()
