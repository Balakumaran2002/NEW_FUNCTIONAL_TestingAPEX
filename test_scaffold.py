import sys
import os
from pathlib import Path

# Add python_backend to path
sys.path.append(str(Path("python_backend").resolve()))

from app.services.playwright_service import PlaywrightService

service = PlaywrightService()
project_dir = Path("python_backend/workspace/Student_Mangement_System").resolve()

print("Generating scaffolding...")
service._generate_playwright_scaffolding(project_dir)
print("Done!")
