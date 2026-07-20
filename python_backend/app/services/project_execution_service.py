import os
import subprocess
import time
import re
import socket
from pathlib import Path
from typing import Dict, Any, Optional

class ProjectExecutionService:
    def __init__(self):
        self.running_processes: Dict[str, subprocess.Popen] = {}
        self.running_ports: Dict[str, int] = {}

    def _find_free_port(self) -> int:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("", 0))
            s.listen(1)
            port = s.getsockname()[1]
        return port

    def build_project(self, repo_path: Path, force_rebuild: bool = False) -> dict:
        """Detect and run the build command for a given repository."""
        print(f"[Execution Engine] Analyzing build requirements for {repo_path}")
        
        # Determine build tool
        if (repo_path / "package.json").exists():
            print("[Execution Engine] Node.js project detected.")
            try:
                # ── Skip npm install if node_modules already exists ──
                if not force_rebuild and (repo_path / "node_modules").exists():
                    print("[Execution Engine] ⚡ node_modules exists — skipping npm install.")
                else:
                    print("[Execution Engine] Running npm install...")
                    result = subprocess.run("npm install", cwd=repo_path, shell=True, capture_output=True, text=True, timeout=180)
                    if result.returncode != 0:
                        return {"success": False, "error": f"npm install failed: {result.stderr}"}
                
                # ── Skip npm run build if dist/ or build/ already exists ──
                package_json_text = (repo_path / "package.json").read_text(encoding="utf-8")
                if '"build":' in package_json_text:
                    build_artifact_exists = (
                        (repo_path / "dist").exists() or
                        (repo_path / "build").exists() or
                        (repo_path / ".next").exists()
                    )
                    if not force_rebuild and build_artifact_exists:
                        print("[Execution Engine] ⚡ Build artifacts exist (dist/build/.next) — skipping npm run build.")
                    else:
                        print("[Execution Engine] Running npm run build...")
                        b_result = subprocess.run("npm run build", cwd=repo_path, shell=True, capture_output=True, text=True, timeout=180)
                        if b_result.returncode != 0:
                            # Non-fatal: many dev projects don't need a production build to run
                            print(f"[Execution Engine] npm run build failed (non-fatal): {b_result.stderr[-300:]}")
                
                return {"success": True, "type": "node"}
            except subprocess.TimeoutExpired:
                return {"success": False, "error": "Build process timed out"}
        
        elif (repo_path / "pom.xml").exists():
            print("[Execution Engine] Maven project detected.")
            try:
                # ── Skip mvn build if JAR already exists ──
                target_dir = repo_path / "target"
                existing_jars = list(target_dir.glob("*.jar")) if target_dir.exists() else []
                existing_jars = [j for j in existing_jars if not j.name.endswith("-javadoc.jar") and not j.name.endswith("-sources.jar")]
                
                if not force_rebuild and existing_jars:
                    print(f"[Execution Engine] ⚡ JAR exists ({existing_jars[0].name}) — skipping mvn clean package.")
                else:
                    print("[Execution Engine] Running mvn clean package -DskipTests...")
                    result = subprocess.run("mvn clean package -DskipTests", cwd=repo_path, shell=True, capture_output=True, text=True, timeout=300)
                    if result.returncode != 0:
                        return {"success": False, "error": f"Maven build failed: {result.stderr}"}
                return {"success": True, "type": "java-maven"}
            except subprocess.TimeoutExpired:
                return {"success": False, "error": "Maven build timed out"}
                
        # Default or unhandled
        print("[Execution Engine] No explicit build step required or recognized for this project type.")
        return {"success": True, "type": "unknown"}


    def run_project(self, repo_path: Path, project_id: str) -> dict:
        """Start the project and detect its running port."""
        if project_id in self.running_processes:
            self.stop_project(project_id)
            
        print(f"[Execution Engine] Starting project {project_id}...")
        port = self._find_free_port()
        
        process = None
        cmd = ""
        
        if (repo_path / "package.json").exists():
            # Node.js
            env = os.environ.copy()
            env["PORT"] = str(port)
            env["VITE_PORT"] = str(port)
            
            package_json = (repo_path / "package.json").read_text(encoding="utf-8")
            if '"dev":' in package_json:
                cmd = "npm run dev"
            elif '"start":' in package_json:
                cmd = "npm start"
            else:
                return {"success": False, "error": "No dev or start script found in package.json"}
                
            print(f"[Execution Engine] Running: {cmd} on port {port}")
            process = subprocess.Popen(cmd, cwd=repo_path, env=env, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            
        elif (repo_path / "pom.xml").exists():
            # Find jar file
            target_dir = repo_path / "target"
            if target_dir.exists():
                jars = list(target_dir.glob("*.jar"))
                jars = [j for j in jars if not j.name.endswith("-javadoc.jar") and not j.name.endswith("-sources.jar")]
                if jars:
                    cmd = f"java -jar {jars[0].name} --server.port={port}"
                    print(f"[Execution Engine] Running: {cmd}")
                    process = subprocess.Popen(cmd, cwd=target_dir, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
                else:
                    return {"success": False, "error": "No runnable JAR found in target directory"}
            else:
                return {"success": False, "error": "Target directory not found. Did build succeed?"}
        else:
            return {"success": False, "error": "Unsupported project type for automatic startup"}

        # Wait for the application to start by monitoring output
        started = False
        timeout = time.time() + 30
        detected_port = port
        
        while time.time() < timeout and process.poll() is None:
            line = process.stdout.readline()
            if not line:
                break
                
            print(f"[{project_id}] {line.strip()}")
            
            # Look for port in output
            port_match = re.search(r'(?:localhost|127\.0\.0\.1|port)[:\s]+(\d+)', line, re.IGNORECASE)
            if port_match:
                detected_port = int(port_match.group(1))
                started = True
                break
                
            # Generic success messages
            if any(x in line.lower() for x in ['started', 'listening', 'ready', 'compiled successfully']):
                started = True
                break

        if not started:
            self.stop_project(project_id)
            return {"success": False, "error": "Application failed to start or did not report ready status"}

        self.running_processes[project_id] = process
        self.running_ports[project_id] = detected_port
        
        return {
            "success": True, 
            "port": detected_port, 
            "url": f"http://localhost:{detected_port}"
        }

    def stop_project(self, project_id: str):
        if project_id in self.running_processes:
            process = self.running_processes[project_id]
            print(f"[Execution Engine] Stopping project {project_id}...")
            
            # On Windows shell=True, killing the Popen object only kills the cmd.exe, not the child node process
            # We need taskkill for process trees
            if os.name == 'nt':
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(process.pid)], capture_output=True)
            else:
                process.terminate()
                
            del self.running_processes[project_id]
            if project_id in self.running_ports:
                del self.running_ports[project_id]

project_execution_service = ProjectExecutionService()
