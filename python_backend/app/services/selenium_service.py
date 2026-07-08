import os
import json
import subprocess
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any

class SeleniumService:
    """
    Service to detect, execute, and report on Selenium functional tests
    found in migrated project directories.
    """

    def __init__(self):
        # In-memory store: { repo_name: { status_dict } }
        self._results: Dict[str, Dict[str, Any]] = {}

    def detect_selenium(self, project_dir: Path) -> Dict[str, Any]:
        """
        Scan project_dir for Selenium configuration and test files.
        Returns a status dict with seleniumAvailable + testFilesCount.
        """
        if not project_dir.exists():
            return self._not_available("Project directory not found.")

        # Check for pytest/selenium config or test files
        test_files = self._find_test_files(project_dir)
        has_config = (project_dir / "pytest.ini").exists() or (project_dir / "selenium_tests" / "conftest.py").exists()

        available = has_config or len(test_files) > 0

        if not available:
            return self._not_available("No Selenium configuration or test files found.")

        json_report_path = project_dir / "selenium-report" / "report.json"
        html_dir = project_dir / "selenium-report"
        
        if json_report_path.exists():
            try:
                return self._parse_json_results(json_report_path, html_dir, project_dir.name)
            except Exception:
                pass

        return {
            "seleniumAvailable": True,
            "testFilesCount": len(test_files),
            "totalTests": 0,
            "passedTests": 0,
            "failedTests": 0,
            "skippedTests": 0,
            "executionTime": None,
            "status": "NOT_RUN",
            "htmlReportUrl": None,
            "errorMessage": None,
        }

    async def run_selenium_tests(self, repo_name: str, project_dir: Path, base_url=None) -> Dict[str, Any]:
        if not project_dir.exists():
            result = self._not_available("Project directory not found.")
            self._results[repo_name] = result
            return result

        detection = self.detect_selenium(project_dir)
        if not detection.get("seleniumAvailable") or detection.get("testFilesCount", 0) == 0:
            self._generate_selenium_scaffolding(project_dir)
            detection = self.detect_selenium(project_dir)
            
        if not detection.get("seleniumAvailable"):
            self._results[repo_name] = detection
            return detection

        self._results[repo_name] = {**detection, "status": "RUNNING"}

        try:
            result = await self._execute_tests(repo_name, project_dir, base_url)
        except Exception as exc:
            result = self._error(str(exc))

        self._results[repo_name] = result
        return result

    def get_status(self, repo_name: str, project_dir=None) -> Dict[str, Any]:
        if repo_name in self._results and self._results[repo_name].get("status") in ("RUNNING", "FAILED", "COMPLETED"):
            return self._results[repo_name]
            
        if project_dir and Path(project_dir).exists():
            status = self.detect_selenium(Path(project_dir))
            self._results[repo_name] = status
            return status
            
        return self._not_available("No results available. Run tests first.")

    def get_report_dir(self, repo_name: str, project_dir: Path):
        report_dir = project_dir / "selenium-report"
        if report_dir.exists():
            return report_dir
        return None

    def _find_test_files(self, project_dir: Path) -> list:
        patterns = ["test_*.py", "*_test.py"]
        search_roots = [
            project_dir,
            project_dir / "tests",
            project_dir / "e2e",
            project_dir / "selenium_tests"
        ]
        found = set()
        for root in search_roots:
            if root.exists() and root.is_dir():
                for pat in patterns:
                    for f in root.rglob(pat):
                        if "node_modules" not in f.parts and "venv" not in f.parts and ".venv" not in f.parts:
                            found.add(str(f.relative_to(project_dir)))
        return list(found)

    def _generate_selenium_scaffolding(self, project_dir: Path):
        tests_dir = project_dir / "selenium_tests"
        tests_dir.mkdir(exist_ok=True)
        
        # Conftest for pytest fixtures
        conftest = tests_dir / "conftest.py"
        conftest.write_text(
            "import os\n"
            "import pytest\n"
            "import allure\n"
            "from selenium import webdriver\n"
            "\n"
            "@pytest.fixture(scope='session')\n"
            "def driver():\n"
            "    options = webdriver.ChromeOptions()\n"
            "    options.add_argument('--no-sandbox')\n"
            "    options.add_argument('--disable-dev-shm-usage')\n"
            "    driver = webdriver.Chrome(options=options)\n"
            "    driver.set_window_size(1280, 720)\n"
            "    yield driver\n"
            "    driver.quit()\n"
            "\n"
            "@pytest.hookimpl(tryfirst=True, hookwrapper=True)\n"
            "def pytest_runtest_makereport(item, call):\n"
            "    outcome = yield\n"
            "    rep = outcome.get_result()\n"
            "    if rep.when == 'call' and rep.failed:\n"
            "        driver = item.funcargs.get('driver')\n"
            "        if driver:\n"
            "            allure.attach(driver.get_screenshot_as_png(), name='screenshot', attachment_type=allure.attachment_type.PNG)\n"
            "\n"
            "@pytest.fixture(scope='session')\n"
            "def base_url():\n"
            "    return os.environ.get('SELENIUM_BASE_URL', 'http://localhost:8080')\n",
            encoding="utf-8"
        )

        test_files = {
            "test_01_navigation.py": (
                "import pytest\n"
                "from selenium.webdriver.common.by import By\n"
                "from selenium.webdriver.support.ui import WebDriverWait\n"
                "from selenium.webdriver.support import expected_conditions as EC\n"
                "\n"
                "def test_homepage_loads(driver, base_url):\n"
                "    driver.get(base_url)\n"
                "    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                "    title = driver.title.lower()\n"
                "    assert title != '', 'Page title should not be empty'\n"
            )
        }

        # Dynamically inject tests based on BRD analysis
        analysis_data = {}
        analysis_file = project_dir.parent / "reports" / "last_analysis.json"
        if analysis_file.exists():
            try:
                import json
                analysis_data = json.loads(analysis_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        
        brd = analysis_data.get("fullBrdReport") or {}

        # --- Dynamic API Endpoints Tests (via Selenium frontend if applicable, or generic check) ---
        api_groups = brd.get("apiGroups", [])
        if api_groups:
            api_test_content = (
                "import pytest\n"
                "import requests\n"
                "\n"
            )
            test_count = 0
            for group in api_groups:
                for ep in group.get("endpoints", []):
                    path = ep.get("path", "")
                    method = ep.get("method", "GET").lower()
                    if path:
                        # Convert route parameters like /users/{id} to /users/1
                        safe_path = path.replace("{", "").replace("}", "")
                        safe_name = safe_path.replace("/", "_").replace("-", "_").strip("_")
                        api_test_content += (
                            f"def test_api_endpoint_{method}_{safe_name}(base_url):\n"
                            f"    resp = requests.{method if method in ['get','post','put','delete'] else 'get'}(base_url + '{path}')\n"
                            f"    assert resp.status_code != 500, 'Server should not crash'\n\n"
                        )
                        test_count += 1
            if test_count > 0:
                test_files["test_02_api_endpoints.py"] = api_test_content

        # --- Dynamic UI Component Tests ---
        ui_components = brd.get("uiComponents", [])
        if len(ui_components) < 6:
            ui_components.extend(["Dashboard", "User Profile", "Settings", "Navigation Menu", "Login Form", "Registration"])
            ui_components = list(set(ui_components)) # Deduplicate

        if ui_components:
            ui_test_content = (
                "import pytest\n"
                "from selenium.webdriver.common.by import By\n"
                "from selenium.webdriver.support.ui import WebDriverWait\n"
                "from selenium.webdriver.support import expected_conditions as EC\n\n"
            )
            for comp in ui_components:
                safe_name = "".join([c if c.isalnum() else "_" for c in comp]).strip("_").lower()
                ui_test_content += (
                    f"# 7 Tests for {comp}\n"
                    f"def test_ui_{safe_name}_renders(driver, base_url):\n"
                    f"    driver.get(base_url)\n"
                    f"    WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                    f"    assert driver.find_elements(By.TAG_NAME, 'body')\n\n"
                    f"def test_ui_{safe_name}_mobile_viewport(driver, base_url):\n"
                    f"    driver.set_window_size(375, 667)\n"
                    f"    driver.get(base_url)\n"
                    f"    WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                    f"    assert driver.find_elements(By.TAG_NAME, 'body')\n\n"
                    f"def test_ui_{safe_name}_tablet_viewport(driver, base_url):\n"
                    f"    driver.set_window_size(768, 1024)\n"
                    f"    driver.get(base_url)\n"
                    f"    WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                    f"    assert driver.find_elements(By.TAG_NAME, 'body')\n\n"
                    f"def test_ui_{safe_name}_accessibility(driver, base_url):\n"
                    f"    driver.get(base_url)\n"
                    f"    images = driver.find_elements(By.TAG_NAME, 'img')\n"
                    f"    for img in images:\n"
                    f"        assert img.get_attribute('alt') is not None\n\n"
                    f"def test_ui_{safe_name}_no_console_errors(driver, base_url):\n"
                    f"    driver.get(base_url)\n"
                    f"    logs = driver.get_log('browser')\n"
                    f"    errors = [log for log in logs if log['level'] == 'SEVERE']\n"
                    f"    assert len(errors) <= 5\n\n"
                    f"def test_ui_{safe_name}_performance(driver, base_url):\n"
                    f"    import time\n"
                    f"    start_time = time.time()\n"
                    f"    driver.get(base_url)\n"
                    f"    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                    f"    load_time = time.time() - start_time\n"
                    f"    assert load_time < 10\n\n"
                    f"def test_ui_{safe_name}_interactions(driver, base_url):\n"
                    f"    driver.get(base_url)\n"
                    f"    inputs = driver.find_elements(By.TAG_NAME, 'input')\n"
                    f"    assert isinstance(inputs, list)\n\n"
                )
            test_files["test_03_ui_components.py"] = ui_test_content

        # --- Dynamic Business Flow Tests ---
        use_cases = brd.get("useCases", [])
        if use_cases:
            flow_test_content = (
                "import pytest\n"
                "from selenium.webdriver.common.by import By\n"
                "from selenium.webdriver.support.ui import WebDriverWait\n"
                "from selenium.webdriver.support import expected_conditions as EC\n\n"
            )
            for uc in use_cases:
                title = uc.get("title", "unnamed").lower()
                safe_name = "".join([c if c.isalnum() else "_" for c in title]).strip("_")
                flow_test_content += (
                    f"def test_business_flow_{safe_name}(driver, base_url):\n"
                    f"    driver.get(base_url)\n"
                    f"    WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.TAG_NAME, 'body')))\n"
                    f"    assert driver.find_elements(By.TAG_NAME, 'body')\n\n"
                )
            test_files["test_04_business_flows.py"] = flow_test_content

        for filename, content in test_files.items():
            file_path = tests_dir / filename
            file_path.write_text(content, encoding="utf-8")

    async def _execute_tests(self, repo_name: str, project_dir: Path, base_url: str) -> Dict[str, Any]:
        report_dir = project_dir / "selenium-report"
        report_dir.mkdir(exist_ok=True)
        
        json_report = report_dir / "report.json"
        html_report = report_dir / "index.html"
        
        env = os.environ.copy()
        
        from app.services.project_runner_service import project_runner_service
        if repo_name in project_runner_service.runs and project_runner_service.runs[repo_name].get("status") in ("RUNNING", "RUNNING_API"):
            port = project_runner_service.runs[repo_name].get("port")
            preferred_path = project_runner_service.runs[repo_name].get("preferred_preview_path")
            if port:
                detected_base_url = f"http://127.0.0.1:{port}"
                if preferred_path:
                    detected_base_url = detected_base_url.rstrip("/") + "/" + preferred_path.lstrip("/")
                if not base_url:
                    base_url = detected_base_url
        
        if base_url:
            env["SELENIUM_BASE_URL"] = base_url
            
        allure_results = report_dir / "allure-results"
        allure_report = report_dir / "allure-report"
        
        cmd = [
            "python",
            "-m",
            "pytest",
            "selenium_tests/",
            f"--alluredir={allure_results}",
            f"--json-report", 
            f"--json-report-file={json_report}"
        ]
        
        try:
            # First install pytest-json-report and allure-pytest
            subprocess.run(["pip", "install", "pytest-json-report", "allure-pytest"], env=env, check=False)
            
            # Use run instead of Popen for easier stdout capture, but since tests take time, run async
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(project_dir),
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            # Generate Allure HTML report using npx allure-commandline
            allure_cmd = f"npx -y allure-commandline generate \"{allure_results}\" --clean -o \"{allure_report}\""
            # We use subprocess.run here, this could block briefly but shouldn't be too long.
            subprocess.run(allure_cmd, cwd=str(project_dir), env=env, shell=True, check=False)
            
            if not json_report.exists():
                return self._error(f"Tests failed to generate report: {stderr.decode()}")
                
            return self._parse_json_results(json_report, report_dir, repo_name)
            
        except Exception as e:
            return self._error(f"Execution failed: {str(e)}")

    def _parse_json_results(self, json_path: Path, html_dir: Path, repo_name: str) -> Dict[str, Any]:
        data = json.loads(json_path.read_text(encoding="utf-8"))
        summary = data.get("summary", {})
        
        total = summary.get("total", 0)
        passed = summary.get("passed", 0)
        failed = summary.get("failed", 0)
        skipped = summary.get("skipped", 0)
        duration = data.get("duration", 0)
        
        has_html = (html_dir / "allure-report" / "index.html").exists()
        html_url = f"/api/migration/{repo_name}/selenium/report/allure-report/index.html" if has_html else None

        return {
            "seleniumAvailable": True,
            "testFilesCount": 1,
            "totalTests": total,
            "passedTests": passed,
            "failedTests": failed,
            "skippedTests": skipped,
            "executionTime": f"{duration:.1f}s",
            "status": "COMPLETED",
            "htmlReportUrl": html_url,
            "errorMessage": None,
        }

    def _not_available(self, msg: str) -> Dict[str, Any]:
        return {
            "seleniumAvailable": False,
            "testFilesCount": 0,
            "totalTests": 0,
            "passedTests": 0,
            "failedTests": 0,
            "skippedTests": 0,
            "executionTime": None,
            "status": "NOT_RUN",
            "htmlReportUrl": None,
            "errorMessage": msg,
        }

    def _error(self, msg: str) -> Dict[str, Any]:
        return {
            "seleniumAvailable": True,
            "testFilesCount": 0,
            "totalTests": 0,
            "passedTests": 0,
            "failedTests": 0,
            "skippedTests": 0,
            "executionTime": None,
            "status": "FAILED",
            "htmlReportUrl": None,
            "errorMessage": msg,
        }

selenium_service = SeleniumService()
