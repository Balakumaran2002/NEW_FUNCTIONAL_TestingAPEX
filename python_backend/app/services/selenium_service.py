import os
import json
import subprocess
import asyncio
import re
from pathlib import Path
from typing import Optional, Dict, Any, List


class SeleniumService:
    """
    Service to detect, execute, and report on Selenium functional tests.
    Supports Python (pytest-selenium), Java (JUnit/TestNG + WebDriver),
    and JavaScript (WebDriverIO / Nightwatch) projects.
    """

    def __init__(self):
        # In-memory store: { repo_name: { status_dict } }
        self._results: Dict[str, Dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect_selenium(self, project_dir: Path) -> Dict[str, Any]:
        """
        Scan project_dir for Selenium configuration and test files.
        Returns a status dict with seleniumAvailable, testFilesCount, and metadata.
        """
        if not project_dir.exists():
            return self._not_available("Project directory not found.")

        detection_info = self._detect_project_type(project_dir)
        test_files = detection_info["test_files"]
        available = detection_info["available"]

        if not available:
            return self._not_available("No Selenium configuration or test files found.")

        # Check for existing results on disk
        json_report_path = project_dir / "selenium-report" / "report.json"
        html_dir = project_dir / "selenium-report"

        if json_report_path.exists():
            try:
                return self._parse_json_results(json_report_path, html_dir, project_dir.name, detection_info)
            except Exception:
                pass

        return {
            "seleniumAvailable": True,
            "testFilesCount": len(test_files),
            "testFiles": test_files[:20],
            "totalTests": 0,
            "passedTests": 0,
            "failedTests": 0,
            "skippedTests": 0,
            "executionTime": None,
            "status": "NOT_RUN",
            "htmlReportUrl": None,
            "errorMessage": None,
            "seleniumVersion": detection_info.get("selenium_version"),
            "testingTools": detection_info.get("tools", []),
            "projectType": detection_info.get("project_type", "unknown"),
            "modules": [],
        }

    async def run_selenium_tests(self, repo_name: str, project_dir: Path, base_url=None) -> Dict[str, Any]:
        """Install deps and run Selenium tests inside project_dir."""
        if not project_dir.exists():
            result = self._not_available("Project directory not found.")
            self._results[repo_name] = result
            return result

        detection = self.detect_selenium(project_dir)
        if not detection.get("seleniumAvailable") or detection.get("testFilesCount", 0) == 0:
            print(f"[Selenium] No tests found in {project_dir.name}. Generating scaffolding...")
            self._generate_selenium_scaffolding(project_dir)
            detection = self.detect_selenium(project_dir)

        if not detection.get("seleniumAvailable"):
            self._results[repo_name] = detection
            return detection

        # Mark as RUNNING
        self._results[repo_name] = {**detection, "status": "RUNNING"}

        try:
            result = await self._execute_tests(repo_name, project_dir, base_url)
        except Exception as exc:
            result = self._error(str(exc))

        self._results[repo_name] = result
        return result

    def get_status(self, repo_name: str, project_dir=None) -> Dict[str, Any]:
        """Return the latest status for repo_name."""
        # Preserve RUNNING, COMPLETED, FAILED states from in-memory cache
        if repo_name in self._results:
            cached = self._results[repo_name]
            if cached.get("status") in ("RUNNING", "COMPLETED", "FAILED"):
                return cached

        # Fall back to disk detection
        if project_dir and Path(project_dir).exists():
            status = self.detect_selenium(Path(project_dir))
            self._results[repo_name] = status
            return status

        return self._not_available("No results available. Run tests first.")

    # ------------------------------------------------------------------
    # Detection helpers
    # ------------------------------------------------------------------

    def _detect_project_type(self, project_dir: Path) -> Dict[str, Any]:
        """Detect what kind of Selenium project this is."""
        test_files = []
        tools = []
        selenium_version = None
        project_type = "unknown"
        available = False

        # ── Python / pytest-selenium ───────────────────────────────────
        python_test_files = self._find_python_test_files(project_dir)
        if python_test_files:
            test_files.extend(python_test_files)
            project_type = "python"
            tools.append("pytest-selenium")
            available = True

        has_pytest_ini = (project_dir / "pytest.ini").exists()
        has_setup_cfg = (project_dir / "setup.cfg").exists()
        has_conftest = any(project_dir.rglob("conftest.py"))
        if (has_pytest_ini or has_setup_cfg or has_conftest) and not available:
            available = True
            project_type = "python"

        # Detect selenium version from requirements.txt / setup.py / pyproject.toml
        for req_file in ["requirements.txt", "requirements-dev.txt", "requirements-test.txt", "pyproject.toml", "setup.py"]:
            req_path = project_dir / req_file
            if req_path.exists():
                try:
                    content = req_path.read_text(encoding="utf-8", errors="ignore")
                    if "selenium" in content.lower():
                        available = True
                        if project_type == "unknown":
                            project_type = "python"
                        tools.append("selenium")
                        ver_match = re.search(r'selenium[>=<!\s]*([0-9]+\.[0-9]+(?:\.[0-9]+)?)', content, re.IGNORECASE)
                        if ver_match:
                            selenium_version = ver_match.group(1)
                except Exception:
                    pass

        # ── Java (Maven / Gradle) ──────────────────────────────────────
        java_test_files = self._find_java_selenium_files(project_dir)
        if java_test_files:
            test_files.extend(java_test_files)
            available = True
            project_type = "java"

        pom_path = project_dir / "pom.xml"
        if pom_path.exists():
            try:
                pom_content = pom_path.read_text(encoding="utf-8", errors="ignore")
                if "selenium" in pom_content.lower():
                    available = True
                    if project_type == "unknown":
                        project_type = "java"
                    ver_match = re.search(r'<selenium\.version>([^<]+)</selenium\.version>', pom_content)
                    if not ver_match:
                        ver_match = re.search(r'selenium-java.*?<version>([^<]+)</version>', pom_content, re.DOTALL)
                    if ver_match:
                        selenium_version = ver_match.group(1).strip()
                    if "junit" in pom_content.lower():
                        tools.append("JUnit")
                    if "testng" in pom_content.lower():
                        tools.append("TestNG")
                    tools.append("selenium-java")
            except Exception:
                pass

        for gradle_file in ["build.gradle", "build.gradle.kts"]:
            gradle_path = project_dir / gradle_file
            if gradle_path.exists():
                try:
                    content = gradle_path.read_text(encoding="utf-8", errors="ignore")
                    if "selenium" in content.lower():
                        available = True
                        if project_type == "unknown":
                            project_type = "java"
                        ver_match = re.search(r'selenium[^:]*:[^:]*:([0-9]+\.[0-9]+(?:\.[0-9]+)?)', content)
                        if ver_match:
                            selenium_version = ver_match.group(1)
                        tools.append("selenium-java")
                except Exception:
                    pass

        # ── JavaScript (WebDriverIO / Nightwatch / selenium-webdriver) ─
        js_test_files = self._find_js_selenium_files(project_dir)
        if js_test_files:
            test_files.extend(js_test_files)
            available = True
            if project_type == "unknown":
                project_type = "javascript"

        package_json_path = project_dir / "package.json"
        if package_json_path.exists():
            try:
                pkg = json.loads(package_json_path.read_text(encoding="utf-8", errors="ignore"))
                all_deps = {}
                all_deps.update(pkg.get("dependencies", {}))
                all_deps.update(pkg.get("devDependencies", {}))
                if "selenium-webdriver" in all_deps:
                    available = True
                    tools.append("selenium-webdriver")
                    ver = all_deps["selenium-webdriver"]
                    if selenium_version is None:
                        selenium_version = ver.lstrip("^~>=")
                    if project_type == "unknown":
                        project_type = "javascript"
                if "webdriverio" in all_deps or "@wdio/cli" in all_deps:
                    available = True
                    tools.append("WebDriverIO")
                    if project_type == "unknown":
                        project_type = "javascript"
                if "nightwatch" in all_deps:
                    available = True
                    tools.append("Nightwatch")
                    if project_type == "unknown":
                        project_type = "javascript"
            except Exception:
                pass

        if not tools:
            tools = ["selenium"]

        return {
            "available": available,
            "test_files": test_files,
            "tools": list(set(tools)),
            "selenium_version": selenium_version,
            "project_type": project_type,
        }

    def _find_python_test_files(self, project_dir: Path) -> List[str]:
        """Find Python pytest-selenium test files."""
        patterns = ["test_*.py", "*_test.py"]
        search_roots = [
            project_dir,
            project_dir / "tests",
            project_dir / "test",
            project_dir / "e2e",
            project_dir / "selenium_tests",
            project_dir / "functional_tests",
            project_dir / "ui_tests",
        ]
        found = set()
        for root in search_roots:
            if root.exists() and root.is_dir():
                for pat in patterns:
                    for f in root.rglob(pat):
                        if not any(p in f.parts for p in ("node_modules", "venv", ".venv", "__pycache__", ".git")):
                            try:
                                content = f.read_text(encoding="utf-8", errors="ignore")
                                # Only include files that actually use selenium
                                if "selenium" in content.lower() or "webdriver" in content.lower() or "pytest" in content.lower():
                                    found.add(str(f.relative_to(project_dir)))
                                else:
                                    # Include any test file in selenium_tests folder
                                    if "selenium" in str(f).lower():
                                        found.add(str(f.relative_to(project_dir)))
                            except Exception:
                                found.add(str(f.relative_to(project_dir)))
        return list(found)

    def _find_java_selenium_files(self, project_dir: Path) -> List[str]:
        """Find Java Selenium test files (JUnit/TestNG with WebDriver)."""
        found = set()
        java_test_roots = [
            project_dir / "src" / "test" / "java",
            project_dir / "src" / "test",
        ]
        for root in java_test_roots:
            if root.exists():
                for f in root.rglob("*.java"):
                    if not any(p in f.parts for p in (".git", "target", "build")):
                        try:
                            content = f.read_text(encoding="utf-8", errors="ignore")
                            if ("WebDriver" in content or "selenium" in content.lower()) and \
                               ("@Test" in content or "junit" in content.lower() or "testng" in content.lower()):
                                found.add(str(f.relative_to(project_dir)))
                        except Exception:
                            pass
        return list(found)

    def _find_js_selenium_files(self, project_dir: Path) -> List[str]:
        """Find JavaScript Selenium test files."""
        found = set()
        # WebDriverIO config
        for cfg in ["wdio.conf.js", "wdio.conf.ts", "nightwatch.conf.js", "nightwatch.conf.ts"]:
            if (project_dir / cfg).exists():
                found.add(cfg)
        # Test files in common locations
        js_patterns = ["*.spec.js", "*.test.js", "*.spec.ts", "*.test.ts", "*.e2e.js", "*.e2e.ts"]
        search_roots = [
            project_dir / "test",
            project_dir / "tests",
            project_dir / "e2e",
            project_dir / "src" / "test",
        ]
        for root in search_roots:
            if root.exists():
                for pat in js_patterns:
                    for f in root.rglob(pat):
                        if "node_modules" not in f.parts:
                            try:
                                content = f.read_text(encoding="utf-8", errors="ignore")
                                if "selenium" in content.lower() or "webdriver" in content.lower() or "browser" in content.lower():
                                    found.add(str(f.relative_to(project_dir)))
                            except Exception:
                                pass
        return list(found)

    # ------------------------------------------------------------------
    # Scaffolding
    # ------------------------------------------------------------------

    def _generate_selenium_scaffolding(self, project_dir: Path):
        """Generate Python pytest-selenium test scaffolding using BRD data from DB."""
        tests_dir = project_dir / "selenium_tests"
        tests_dir.mkdir(exist_ok=True)

        # Load BRD data from database
        brd = {}
        repo_name = project_dir.name
        repo_name_base = re.sub(r'_\d+$', '', repo_name)

        try:
            from app.database import SessionLocal
            from app.db_models import Repository, Analysis
            db = SessionLocal()
            try:
                repo = db.query(Repository).filter(Repository.name == repo_name_base).first()
                if not repo:
                    repo = db.query(Repository).filter(Repository.repo_url.contains(repo_name_base)).first()
                if repo:
                    analysis = db.query(Analysis).filter(
                        Analysis.repository_id == repo.id
                    ).order_by(Analysis.created_at.desc()).first()
                    if analysis and analysis.full_brd_report:
                        brd = analysis.full_brd_report
            finally:
                db.close()
        except Exception as e:
            print(f"[Selenium Scaffold] DB lookup failed: {e}")

        # Write conftest.py
        conftest_path = tests_dir / "conftest.py"
        conftest_path.write_text(
            "import os\n"
            "import pytest\n"
            "from selenium import webdriver\n"
            "from selenium.webdriver.chrome.options import Options\n"
            "\n"
            "@pytest.fixture(scope='session')\n"
            "def driver():\n"
            "    options = Options()\n"
            "    options.add_argument('--no-sandbox')\n"
            "    options.add_argument('--disable-dev-shm-usage')\n"
            "    options.add_argument('--headless')\n"
            "    options.add_argument('--disable-gpu')\n"
            "    options.add_argument('--window-size=1920,1080')\n"
            "    drv = webdriver.Chrome(options=options)\n"
            "    yield drv\n"
            "    drv.quit()\n"
            "\n"
            "@pytest.fixture(scope='session')\n"
            "def base_url():\n"
            "    return os.environ.get('SELENIUM_BASE_URL', 'http://localhost:8080')\n",
            encoding="utf-8"
        )

        # Base navigation test
        test_files = {
            "test_01_navigation.py": (
                "import pytest\n"
                "from selenium.webdriver.common.by import By\n"
                "from selenium.webdriver.support.ui import WebDriverWait\n"
                "from selenium.webdriver.support import expected_conditions as EC\n"
                "\n"
                "class TestNavigation:\n"
                "    def test_homepage_loads(self, driver, base_url):\n"
                "        \"\"\"Verify the homepage loads without errors\"\"\"\n"
                "        driver.get(base_url)\n"
                "        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                "        assert driver.title != '', 'Page title should not be empty'\n"
                "\n"
                "    def test_page_has_content(self, driver, base_url):\n"
                "        \"\"\"Verify the page body has visible content\"\"\"\n"
                "        driver.get(base_url)\n"
                "        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                "        body = driver.find_element(By.TAG_NAME, 'body')\n"
                "        assert body.is_displayed()\n"
                "\n"
                "    def test_no_server_error_on_home(self, driver, base_url):\n"
                "        \"\"\"Verify homepage does not show a server error page\"\"\"\n"
                "        driver.get(base_url)\n"
                "        body_text = driver.find_element(By.TAG_NAME, 'body').text.lower()\n"
                "        assert '500' not in body_text and 'internal server error' not in body_text\n"
            )
        }

        # Dynamic tests from BRD API endpoints
        api_groups = brd.get("apiGroups", []) if isinstance(brd, dict) else []
        if api_groups:
            api_content = (
                "import pytest\n"
                "import requests\n"
                "\n"
                "class TestAPIEndpoints:\n"
            )
            count = 0
            for group in api_groups:
                for ep in group.get("endpoints", []):
                    path = ep.get("path", "")
                    method = ep.get("method", "GET").lower()
                    if path and count < 20:
                        safe_path = path.replace("{", "").replace("}", "").replace("/", "_").replace("-", "_").strip("_")
                        api_content += (
                            f"    def test_api_{method}_{safe_path}(self, base_url):\n"
                            f"        \"\"\"Verify {method.upper()} {path} does not return 500\"\"\"\n"
                            f"        method = getattr(requests, '{method}' if '{method}' in ['get','post','put','delete','patch'] else 'get')\n"
                            f"        resp = method(base_url + '{path}', timeout=5)\n"
                            f"        assert resp.status_code != 500, f'Endpoint {path} returned 500'\n\n"
                        )
                        count += 1
            if count > 0:
                test_files["test_02_api_endpoints.py"] = api_content

        # Dynamic UI component tests from BRD
        ui_components = []
        if isinstance(brd, dict):
            ui_components = brd.get("uiComponents", []) or []
            # Also pull capability names as UI areas
            for cap in brd.get("capabilities", []):
                if isinstance(cap, dict):
                    ui_components.append(cap.get("name", ""))
            ui_components = [c for c in ui_components if c][:8]

        if not ui_components:
            ui_components = ["Homepage", "Navigation", "Content Area", "Footer", "Forms", "Responsive Layout"]

        ui_content = (
            "import pytest\n"
            "from selenium.webdriver.common.by import By\n"
            "from selenium.webdriver.support.ui import WebDriverWait\n"
            "from selenium.webdriver.support import expected_conditions as EC\n"
            "import time\n"
            "\n"
            "class TestUIComponents:\n"
        )
        for comp in ui_components:
            safe = re.sub(r'[^a-zA-Z0-9]', '_', comp).strip('_').lower()
            ui_content += (
                f"    def test_{safe}_renders(self, driver, base_url):\n"
                f"        \"\"\"Verify {comp} renders correctly\"\"\"\n"
                f"        driver.get(base_url)\n"
                f"        WebDriverWait(driver, 8).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                f"        assert driver.find_elements(By.TAG_NAME, 'body')\n\n"
                f"    def test_{safe}_mobile_viewport(self, driver, base_url):\n"
                f"        \"\"\"Test {comp} on mobile viewport (375x667)\"\"\"\n"
                f"        driver.set_window_size(375, 667)\n"
                f"        driver.get(base_url)\n"
                f"        WebDriverWait(driver, 8).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                f"        assert driver.find_elements(By.TAG_NAME, 'body')\n"
                f"        driver.set_window_size(1920, 1080)\n\n"
                f"    def test_{safe}_performance_load(self, driver, base_url):\n"
                f"        \"\"\"Verify {comp} loads within 10 seconds\"\"\"\n"
                f"        start = time.time()\n"
                f"        driver.get(base_url)\n"
                f"        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                f"        assert time.time() - start < 10, 'Page load exceeded 10 seconds'\n\n"
            )
        test_files["test_03_ui_components.py"] = ui_content

        # Write all test files
        for filename, content in test_files.items():
            (tests_dir / filename).write_text(content, encoding="utf-8")

        print(f"[Selenium Scaffold] Generated {len(test_files)} test files with {sum(content.count('def test_') for content in test_files.values())} test cases")

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def _execute_tests(self, repo_name: str, project_dir: Path, base_url: str) -> Dict[str, Any]:
        """Run pytest-based Selenium tests and parse results."""
        report_dir = project_dir / "selenium-report"
        report_dir.mkdir(exist_ok=True)

        json_report = report_dir / "report.json"
        env = os.environ.copy()

        # Try to get the running app URL from project_runner_service
        try:
            from app.services.project_runner_service import project_runner_service
            runner_status = project_runner_service.runs.get(repo_name, {})
            if runner_status.get("status") in ("RUNNING", "RUNNING_API"):
                port = runner_status.get("port")
                if port and not base_url:
                    base_url = f"http://127.0.0.1:{port}"
        except Exception:
            pass

        if base_url:
            env["SELENIUM_BASE_URL"] = base_url
            print(f"[Selenium] Running tests against: {base_url}")

        # Detect project type to choose executor
        detection_info = self._detect_project_type(project_dir)
        project_type = detection_info.get("project_type", "python")

        if project_type == "java":
            return await self._execute_java_tests(repo_name, project_dir, report_dir, json_report, env, detection_info)
        elif project_type == "javascript":
            return await self._execute_js_tests(repo_name, project_dir, report_dir, json_report, env, detection_info)
        else:
            return await self._execute_python_tests(repo_name, project_dir, report_dir, json_report, env, detection_info)

    async def _execute_python_tests(self, repo_name: str, project_dir: Path, report_dir: Path,
                                     json_report: Path, env: dict, detection_info: dict) -> Dict[str, Any]:
        """Execute Python pytest-selenium tests."""
        # Install dependencies
        subprocess.run(
            ["pip", "install", "pytest", "pytest-json-report", "selenium", "requests", "webdriver-manager"],
            capture_output=True, env=env, check=False
        )

        # Find test directory
        test_dir = "selenium_tests/"
        if not (project_dir / "selenium_tests").exists():
            for candidate in ["tests/", "test/", "e2e/", "functional_tests/"]:
                if (project_dir / candidate).exists():
                    test_dir = candidate
                    break

        cmd = [
            "python", "-m", "pytest",
            test_dir,
            f"--json-report",
            f"--json-report-file={json_report}",
            "-v",
            "--tb=short",
            "--timeout=60",
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(project_dir),
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=300)
            print(f"[Selenium] pytest stdout: {stdout.decode()[-2000:]}")
            if stderr:
                print(f"[Selenium] pytest stderr: {stderr.decode()[-500:]}")
        except asyncio.TimeoutError:
            return self._error("Selenium tests timed out after 5 minutes")
        except Exception as e:
            return self._error(f"Failed to execute tests: {e}")

        if not json_report.exists():
            # Try to construct a basic report from stdout
            return self._error(f"No JSON report generated. stderr: {stderr.decode()[-500:]}")

        return self._parse_json_results(json_report, report_dir, repo_name, detection_info)

    async def _execute_java_tests(self, repo_name: str, project_dir: Path, report_dir: Path,
                                   json_report: Path, env: dict, detection_info: dict) -> Dict[str, Any]:
        """Execute Java Selenium tests via Maven."""
        # Check if Maven is available
        cmd = ["mvn", "test", "-Dtest=*Selenium*,*UI*,*Web*", "-DfailIfNoTests=false"]
        if not (project_dir / "pom.xml").exists():
            return self._error("No pom.xml found for Java Selenium project.")

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(project_dir),
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                shell=False
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=300)
        except asyncio.TimeoutError:
            return self._error("Java Selenium tests timed out after 5 minutes")
        except Exception as e:
            return self._error(f"Failed to run Maven tests: {e}")

        # Parse Surefire XML reports
        return self._parse_maven_surefire_results(project_dir, repo_name, detection_info)

    async def _execute_js_tests(self, repo_name: str, project_dir: Path, report_dir: Path,
                                 json_report: Path, env: dict, detection_info: dict) -> Dict[str, Any]:
        """Execute JavaScript Selenium tests via WebDriverIO or Nightwatch."""
        tools = detection_info.get("tools", [])
        if "WebDriverIO" in tools:
            cmd = "npx wdio run wdio.conf.js"
        elif "Nightwatch" in tools:
            cmd = "npx nightwatch"
        else:
            cmd = "npm test"

        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                cwd=str(project_dir),
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=300)
        except asyncio.TimeoutError:
            return self._error("JavaScript Selenium tests timed out after 5 minutes")
        except Exception as e:
            return self._error(f"Failed to run JS Selenium tests: {e}")

        # Write a minimal json report based on stdout
        stdout_text = stdout.decode(errors="ignore")
        passed = stdout_text.count("passing") or stdout_text.count("✓")
        failed = stdout_text.count("failing") or stdout_text.count("✗")
        total = passed + failed

        modules = []
        for line in stdout_text.splitlines():
            if "passing" in line.lower() or "✓" in line:
                modules.append({
                    "id": f"test_{len(modules)+1}",
                    "module": line.strip()[:60],
                    "status": "Passed",
                    "time": "N/A",
                    "rawTime": 0,
                })

        result = {
            "seleniumAvailable": True,
            "testFilesCount": len(detection_info.get("test_files", [])),
            "testFiles": detection_info.get("test_files", [])[:20],
            "totalTests": total,
            "passedTests": passed,
            "failedTests": failed,
            "skippedTests": 0,
            "executionTime": "N/A",
            "status": "COMPLETED",
            "htmlReportUrl": None,
            "errorMessage": None if failed == 0 else f"{failed} test(s) failed",
            "seleniumVersion": detection_info.get("selenium_version"),
            "testingTools": detection_info.get("tools", []),
            "projectType": detection_info.get("project_type", "javascript"),
            "modules": modules,
        }
        self._results[repo_name] = result
        return result

    def _parse_maven_surefire_results(self, project_dir: Path, repo_name: str, detection_info: dict) -> Dict[str, Any]:
        """Parse Maven Surefire XML test reports."""
        surefire_dir = project_dir / "target" / "surefire-reports"
        if not surefire_dir.exists():
            return self._error("No Maven Surefire reports found after test execution.")

        total, passed, failed, skipped = 0, 0, 0, 0
        modules = []

        for xml_file in surefire_dir.glob("TEST-*.xml"):
            try:
                import xml.etree.ElementTree as ET
                tree = ET.parse(str(xml_file))
                root = tree.getroot()
                suite_name = root.get("name", xml_file.stem.replace("TEST-", ""))
                suite_tests = int(root.get("tests", 0))
                suite_errors = int(root.get("errors", 0))
                suite_failures = int(root.get("failures", 0))
                suite_skipped = int(root.get("skipped", 0))
                suite_time = float(root.get("time", 0))
                suite_passed = suite_tests - suite_errors - suite_failures - suite_skipped

                total += suite_tests
                passed += suite_passed
                failed += suite_errors + suite_failures
                skipped += suite_skipped

                modules.append({
                    "id": xml_file.stem,
                    "module": suite_name,
                    "status": "Passed" if (suite_errors + suite_failures) == 0 else "Failed",
                    "time": f"{suite_time:.2f}s",
                    "rawTime": int(suite_time * 1000),
                })
            except Exception:
                pass

        return {
            "seleniumAvailable": True,
            "testFilesCount": len(list(surefire_dir.glob("TEST-*.xml"))),
            "testFiles": detection_info.get("test_files", [])[:20],
            "totalTests": total,
            "passedTests": passed,
            "failedTests": failed,
            "skippedTests": skipped,
            "executionTime": f"{sum(m.get('rawTime', 0) for m in modules) / 1000:.1f}s",
            "status": "COMPLETED",
            "htmlReportUrl": None,
            "errorMessage": None if failed == 0 else f"{failed} test(s) failed",
            "seleniumVersion": detection_info.get("selenium_version"),
            "testingTools": detection_info.get("tools", []),
            "projectType": "java",
            "modules": modules,
        }

    def _parse_json_results(self, json_path: Path, html_dir: Path, repo_name: str, detection_info: dict = None) -> Dict[str, Any]:
        """Parse pytest-json-report output into our standard status dict."""
        data = json.loads(json_path.read_text(encoding="utf-8"))
        summary = data.get("summary", {})

        total = summary.get("total", 0)
        passed = summary.get("passed", 0)
        failed = summary.get("failed", 0)
        skipped = summary.get("skipped", 0)
        duration = data.get("duration", 0)

        # Build per-module breakdown from individual test results
        modules = []
        tests = data.get("tests", [])
        # Group by nodeid prefix (file name)
        seen_files: Dict[str, Dict] = {}
        for t in tests:
            nodeid = t.get("nodeid", "")
            file_part = nodeid.split("::")[0] if "::" in nodeid else nodeid
            file_key = Path(file_part).stem
            if file_key not in seen_files:
                seen_files[file_key] = {"passed": 0, "failed": 0, "duration": 0}
            outcome = t.get("outcome", "passed")
            dur = t.get("duration", 0) or 0
            seen_files[file_key]["duration"] += dur
            if outcome == "passed":
                seen_files[file_key]["passed"] += 1
            else:
                seen_files[file_key]["failed"] += 1

        for file_key, stats in seen_files.items():
            raw_ms = int(stats["duration"] * 1000)
            mod_failed = stats["failed"] > 0
            modules.append({
                "id": file_key,
                "module": file_key.replace("test_", "").replace("_", " ").title(),
                "status": "Failed" if mod_failed else "Passed",
                "time": f"{stats['duration']:.2f}s",
                "rawTime": raw_ms,
            })

        # If no per-test breakdown, create synthetic modules from test counts
        if not modules and total > 0:
            modules = [
                {"id": "navigation", "module": "Navigation Tests", "status": "Passed" if passed > 0 else "Failed", "time": f"{duration:.2f}s", "rawTime": int(duration * 1000)},
            ]

        has_allure_html = (html_dir / "allure-report" / "index.html").exists()
        html_url = f"/api/migration/{repo_name}/selenium/report/allure-report/index.html" if has_allure_html else None

        di = detection_info or {}
        return {
            "seleniumAvailable": True,
            "testFilesCount": len(tests) if not total else max(len(seen_files), 1),
            "testFiles": di.get("test_files", [])[:20],
            "totalTests": total,
            "passedTests": passed,
            "failedTests": failed,
            "skippedTests": skipped,
            "executionTime": f"{duration:.1f}s",
            "status": "COMPLETED",
            "htmlReportUrl": html_url,
            "errorMessage": None if failed == 0 else f"{failed} test(s) failed",
            "seleniumVersion": di.get("selenium_version"),
            "testingTools": di.get("tools", ["selenium"]),
            "projectType": di.get("project_type", "python"),
            "modules": modules,
        }

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def _not_available(self, msg: str) -> Dict[str, Any]:
        return {
            "seleniumAvailable": False,
            "testFilesCount": 0,
            "testFiles": [],
            "totalTests": 0,
            "passedTests": 0,
            "failedTests": 0,
            "skippedTests": 0,
            "executionTime": None,
            "status": "NOT_RUN",
            "htmlReportUrl": None,
            "errorMessage": msg,
            "seleniumVersion": None,
            "testingTools": [],
            "projectType": "unknown",
            "modules": [],
        }

    def _error(self, msg: str) -> Dict[str, Any]:
        return {
            "seleniumAvailable": True,
            "testFilesCount": 0,
            "testFiles": [],
            "totalTests": 0,
            "passedTests": 0,
            "failedTests": 0,
            "skippedTests": 0,
            "executionTime": None,
            "status": "FAILED",
            "htmlReportUrl": None,
            "errorMessage": msg,
            "seleniumVersion": None,
            "testingTools": [],
            "projectType": "unknown",
            "modules": [],
        }


selenium_service = SeleniumService()
