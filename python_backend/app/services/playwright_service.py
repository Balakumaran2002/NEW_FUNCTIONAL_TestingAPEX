import os
import json
import subprocess
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any


class PlaywrightService:
    """
    Service to detect, execute, and report on Playwright functional tests
    found in migrated project directories.
    """

    def __init__(self):
        # In-memory store: { repo_name: { status_dict } }
        self._results: Dict[str, Dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect_playwright(self, project_dir: Path) -> Dict[str, Any]:
        """
        Scan project_dir for Playwright configuration and test files.
        Returns a status dict with playwrightAvailable + testFilesCount.
        """
        if not project_dir.exists():
            return self._not_available("Project directory not found.")

        # 1. Check for playwright config files
        config_files = [
            project_dir / "playwright.config.js",
            project_dir / "playwright.config.ts",
            project_dir / "playwright.config.mjs",
        ]
        has_config = any(f.exists() for f in config_files)

        # 2. Check package.json for @playwright/test dependency
        has_package_dep = False
        package_json = project_dir / "package.json"
        if package_json.exists():
            try:
                pkg = json.loads(package_json.read_text(encoding="utf-8", errors="ignore"))
                all_deps = {}
                all_deps.update(pkg.get("dependencies", {}))
                all_deps.update(pkg.get("devDependencies", {}))
                has_package_dep = "@playwright/test" in all_deps
            except Exception:
                pass

        # 3. Count test spec files
        test_files = self._find_test_files(project_dir)

        available = has_config or has_package_dep or len(test_files) > 0

        if not available:
            return self._not_available("No Playwright configuration or test files found.")

        json_report_path = project_dir / "playwright-report" / "test-results.json"
        html_dir = project_dir / "playwright-report"
        
        if json_report_path.exists():
            try:
                return self._parse_json_results(json_report_path, html_dir, project_dir.name)
            except Exception:
                pass

        return {
            "playwrightAvailable": True,
            "testFilesCount": len(test_files),
            "testFiles": [str(Path(f).relative_to(project_dir).as_posix()) for f in test_files],
            "totalTests": 0,
            "passedTests": 0,
            "failedTests": 0,
            "skippedTests": 0,
            "executionTime": None,
            "status": "NOT_RUN",
            "htmlReportUrl": None,
            "errorMessage": None,
        }

    async def run_playwright_tests(
        self, repo_name: str, project_dir: Path, base_url=None
    ) -> Dict[str, Any]:
        """
        Install deps and run Playwright tests inside project_dir.
        Parses JSON results and returns a summary dict.
        """
        if not project_dir.exists():
            result = self._not_available("Project directory not found.")
            self._results[repo_name] = result
            return result

        detection = self.detect_playwright(project_dir)
        if not detection.get("playwrightAvailable") or detection.get("testFilesCount", 0) == 0:
            self._generate_playwright_scaffolding(project_dir)
            detection = self.detect_playwright(project_dir)
            
        if not detection.get("playwrightAvailable"):
            # Fallback if generation failed
            self._results[repo_name] = detection
            return detection

        # Mark as running
        self._results[repo_name] = {**detection, "status": "RUNNING"}

        try:
            result = await self._execute_tests(repo_name, project_dir, base_url)
        except Exception as exc:
            result = self._error(str(exc))

        self._results[repo_name] = result
        return result

    def get_status(self, repo_name: str, project_dir=None) -> Dict[str, Any]:
        """Return the latest status for repo_name by checking the disk."""
        # Keep RUNNING state if background task is active
        if repo_name in self._results and self._results[repo_name].get("status") == "RUNNING":
            return self._results[repo_name]
            
        if project_dir and Path(project_dir).exists():
            status = self.detect_playwright(Path(project_dir))
            self._results[repo_name] = status
            return status
            
        return self._not_available("No results available. Run tests first.")

    def get_report_dir(self, repo_name: str, project_dir: Path):
        """Return path to playwright-report directory if it exists."""
        report_dir = project_dir / "playwright-report"
        if report_dir.exists():
            return report_dir
        return None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _find_test_files(self, project_dir: Path) -> list:
        """Recursively find *.spec.js / *.spec.ts / *.test.js / *.test.ts files."""
        patterns = ["*.spec.js", "*.spec.ts", "*.spec.mjs", "*.test.js", "*.test.ts"]
        search_roots = [
            project_dir,
            project_dir / "tests",
            project_dir / "e2e",
            project_dir / "test",
            project_dir / "src" / "tests",
            project_dir / "src" / "e2e",
        ]
        found = set()
        for root in search_roots:
            if root.exists():
                for pattern in patterns:
                    try:
                        for f in root.rglob(pattern):
                            if "node_modules" not in str(f):
                                found.add(str(f))
                    except Exception:
                        pass
        return list(found)

    def _generate_playwright_scaffolding(self, project_dir: Path):
        """Generates a generic Playwright test and config if none exist."""
        # 1. Update package.json
        pkg_path = project_dir / "package.json"
        pkg_data = {}
        if pkg_path.exists():
            try:
                pkg_data = json.loads(pkg_path.read_text(encoding="utf-8"))
            except Exception:
                pass
        
        if "devDependencies" not in pkg_data:
            pkg_data["devDependencies"] = {}
        pkg_data["devDependencies"]["@playwright/test"] = "^1.40.0"
        pkg_path.write_text(json.dumps(pkg_data, indent=2), encoding="utf-8")

        # 2. Write playwright.config.ts
        config_path = project_dir / "playwright.config.ts"
        if not config_path.exists():
            config_path.write_text(
                "import { defineConfig } from '@playwright/test';\n"
                "export default defineConfig({\n"
                "  testDir: './tests/e2e',\n"
                "  reporter: [['html'], ['json', { outputFile: 'playwright-report/test-results.json' }]],\n"
                "  use: { \n"
                "    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8081',\n"
                "    video: 'on',\n"
                "    trace: 'on',\n"
                "    screenshot: 'on'\n"
                "  },\n"
                "});\n", encoding="utf-8"
            )

        # 3. Write comprehensive test suite
        test_dir = project_dir / "tests" / "e2e"
        test_dir.mkdir(parents=True, exist_ok=True)
        
        # Base tests that are always included
        test_suites = {
            "01-navigation.spec.ts": """import { test, expect } from '@playwright/test';

test.describe('Navigation & Core Routing', () => {
  test('Homepage loads successfully without errors', async ({ page, baseURL }) => {
    const response = await page.goto(baseURL || '/');
    await page.waitForLoadState('networkidle');
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
    
    // Explicitly fail if a generic Spring Boot/Jetty error page is returned
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Whitelabel Error');
    expect(bodyText).not.toContain('Error 404');
  });

  test('Page title is populated', async ({ page, baseURL }) => {
    await page.goto(baseURL || '/');
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toMatch(/404|Error/i);
  });
});
"""
        }

        # Dynamically inject tests based on BRD analysis
        analysis_data = {}
        repo_name = project_dir.name
        
        # Strip timestamp suffix (e.g., _1784175279) if present to match the original repo name
        import re
        repo_name_base = re.sub(r'_\d+$', '', repo_name)

        from app.database import SessionLocal
        from app.db_models import Repository, Analysis
        db = SessionLocal()
        try:
            repo = db.query(Repository).filter(Repository.name == repo_name_base).first()
            if not repo:
                repo = db.query(Repository).filter(Repository.repo_url.contains(repo_name_base)).first()
            if repo:
                db_analysis = db.query(Analysis).filter(Analysis.repository_id == repo.id).order_by(Analysis.created_at.desc()).first()
                if db_analysis:
                    analysis_data = {
                        "fullBrdReport": db_analysis.full_brd_report
                    }
        finally:
            db.close()
        
        brd = analysis_data.get("fullBrdReport") or {}

        # --- Dynamic API Endpoints Tests ---
        api_groups = brd.get("apiGroups", [])
        if api_groups:
            api_test_content = "import { test, expect } from '@playwright/test';\n\ntest.describe('API Endpoint Sanity Checks', () => {\n"
            test_count = 0
            for group in api_groups:
                for ep in group.get("endpoints", []):
                    path = ep.get("path", "")
                    method = ep.get("method", "GET").upper()
                    if path:
                        api_test_content += f"""
  test('Endpoint {method} {path} responds', async ({{ request, baseURL }}) => {{
    const response = await request.fetch((baseURL || '') + '{path}', {{ method: '{method}' }});
    // Just verify it doesn't hard-crash (some may return 401/403/400 which is fine, 500 is bad)
    expect(response.status()).not.toBe(500);
  }});
"""
                        test_count += 1
            api_test_content += "});\n"
            if test_count > 0:
                test_suites["03-api-endpoints.spec.ts"] = api_test_content

                # --- Dynamic UI Component Tests ---
        ui_test_content = None
        try:
            from app.services.ui_test_case_service import ui_test_case_service
            is_java = analysis_data.get("isJava", False)
            code_context = ui_test_case_service._extract_ui_code(project_dir, is_java)
            
            system_instruction = (
                "You are an expert QA Automation Engineer. "
                "Analyze the provided source code (JSP, React, Vue, HTML, etc) and generate a single, comprehensive Playwright test file (.spec.ts) "
                "that includes robust E2E test cases representing the business logic and UI components discovered. "
                "IMPORTANT RULES:\n"
                "1. Output ONLY valid TypeScript code for a Playwright test file. Do NOT use markdown wrappers like ```typescript or provide any explanations.\n"
                "2. Import test and expect from '@playwright/test'.\n"
                "3. Use `test.describe('UI Components & Flows', () => { ... })` as the main wrapper.\n"
                "4. Make sure tests actually attempt to select elements (e.g., locators for inputs, tables, buttons) based on the source code, but be resilient to failures if possible.\n"
                "5. Start every test with `await page.goto(baseURL || '/');` (or a relevant route if you can infer it).\n"
                "6. End every test with `await page.waitForTimeout(1000);` to ensure the screenshot and video capture the fully rendered page state correctly."
            )
            
            user_prompt = f"Generate Playwright test cases for the following UI source code.\n\nSource Code:\n{code_context[:20000]}"
            
            print("[Playwright Scaffold] Calling LLM to generate realistic UI tests...")
            from app.ai.ai_factory import AIFactory
            ai_client = AIFactory.get_client()
            ai_result = ai_client.generate(user_prompt, system_instruction, None, None)
            
            cleaned_code = ai_result.replace("```typescript", "").replace("```ts", "").replace("```", "").strip()
            if cleaned_code and "import { test" in cleaned_code:
                ui_test_content = cleaned_code
        except Exception as e:
            print(f"[Playwright Scaffold] Failed to generate tests via LLM, falling back to static template: {e}")
            ui_test_content = None
            
        if ui_test_content:
            test_suites["04-ui-components.spec.ts"] = ui_test_content
        else:
            # Fallback to static template
            ui_components = brd.get("uiComponents", [])
            default_pages = ["Home Page", "Login Page", "Dashboard View", "Settings Panel", "User Profile", "Navigation Menu"]
            ui_components.extend(default_pages)
            ui_components = list(dict.fromkeys(ui_components))

            if ui_components:
                static_ui_content = "import { test, expect } from '@playwright/test';\n\ntest.describe('UI Components Checks', () => {\n"
                for comp in ui_components:
                    comp_name = comp.replace("'", "\\'")
                    static_ui_content += f"""
  // 5 Tests for {comp_name}
  test('Component "{comp_name}" renders successfully', async ({{ page, baseURL }}) => {{
    await page.goto(baseURL || '/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(1000);
  }});

  test('Component "{comp_name}" handles mobile viewport correctly', async ({{ page, baseURL }}) => {{
    await page.setViewportSize({{ width: 375, height: 667 }});
    await page.goto(baseURL || '/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(1000);
  }});

  test('Component "{comp_name}" meets basic accessibility standards', async ({{ page, baseURL }}) => {{
    await page.goto(baseURL || '/');
    await page.waitForLoadState('networkidle');
    const images = await page.locator('img').all();
    for (const img of images) {{
      const alt = await img.getAttribute('alt');
      expect(alt !== undefined).toBe(true);
    }}
  }});

  test('Component "{comp_name}" interactions do not produce console errors', async ({{ page, baseURL }}) => {{
    const errors: string[] = [];
    page.on('console', msg => {{
      if (msg.type() === 'error') errors.push(msg.text());
    }});
    await page.goto(baseURL || '/');
    await page.waitForLoadState('networkidle');
    expect(errors.length).toBeLessThanOrEqual(5);
  }});

  test('Component "{comp_name}" performance loads within acceptable threshold', async ({{ page, baseURL }}) => {{
    const startTime = Date.now();
    await page.goto(baseURL || '/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(1000);
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
  }});
"""
                static_ui_content += "});\n"
                test_suites["04-ui-components.spec.ts"] = static_ui_content

            use_cases = brd.get("useCases", [])
            if use_cases:
                flow_test_content = "import { test, expect } from '@playwright/test';\n\ntest.describe('Business Flows', () => {\n"
                for i, uc in enumerate(use_cases):
                    title = uc.get("title", "Unnamed Flow").replace("'", "\\'")
                    flow_test_content += f"""
  test('Business Flow: {title} ({i})', async ({{ page, baseURL }}) => {{
    await page.goto(baseURL || '/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(1000);
  }});
"""
                flow_test_content += "});\n"
                test_suites["05-business-flows.spec.ts"] = flow_test_content

        for filename, content in test_suites.items():
            test_file = test_dir / filename
            test_file.write_text(content, encoding="utf-8")

    async def _execute_tests(
        self, repo_name: str, project_dir: Path, base_url
    ) -> Dict[str, Any]:
        """Run npm install + playwright install + playwright test."""
        env = os.environ.copy()
        
        # Determine base URL for tests
        from app.services.project_runner_service import project_runner_service
        target_url = base_url
        if not target_url and repo_name in project_runner_service.runs:
            run_info = project_runner_service.runs[repo_name]
            port = run_info.get("port")
            preferred_path = run_info.get("preferred_preview_path")
            
            # If using a remote Playwright service, we route tests to the backend's proxy url
            backend_url = os.environ.get("RENDER_EXTERNAL_URL") or os.environ.get("BACKEND_URL")
            if backend_url:
                target_url = backend_url.rstrip("/") + f"/api/run/preview/{repo_name}"
                if preferred_path:
                    target_url = target_url.rstrip("/") + "/" + preferred_path.lstrip("/")
            elif port:
                target_url = f"http://127.0.0.1:{port}"
                if preferred_path:
                    target_url = target_url.rstrip("/") + "/" + preferred_path.lstrip("/")
        
        if target_url:
            env["BASE_URL"] = target_url
            env["PLAYWRIGHT_BASE_URL"] = target_url
            print(f"[PlaywrightService] Target URL for '{repo_name}' set to: {target_url}")
        # We don't fail here if target_url is missing, as playwright.config.ts might have a default or tests might be standalone.

        # Check if external playwright service is configured
        playwright_service_url = os.environ.get("PLAYWRIGHT_SERVICE_URL")
        if playwright_service_url:
            return await self._execute_tests_remotely(repo_name, project_dir, target_url, playwright_service_url)

        # Force Playwright's JSON reporter to write to this file instead of stdout
        env["PLAYWRIGHT_JSON_OUTPUT_NAME"] = "playwright-report/test-results.json"

        json_report_path = project_dir / "playwright-report" / "test-results.json"
        html_report_dir = project_dir / "playwright-report"

        if json_report_path.exists():
            json_report_path.unlink()

        # Step 1: npm install (only if node_modules is missing)
        if not (project_dir / "node_modules").exists():
            ok, output = await self._run_subprocess(
                ["npm", "install", "--prefer-offline", "--no-audit", "--no-fund"],
                project_dir,
                env,
            )
            if not ok:
                return self._error(f"npm install failed:\n{output[-3000:]}")

            # Step 2: npx playwright install (chromium only for speed, no system packages to avoid hang)
            await self._run_subprocess(
                ["npx", "playwright", "install", "chromium"],
                project_dir,
                env,
            )

        # Step 3: Run playwright tests with HTML + JSON reporters in headed mode
        cmd = [
            "npx", "playwright", "test",
            "--reporter=html,json",
            "--timeout=30000",
        ]

        ok, output = await self._run_subprocess(cmd, project_dir, env)

        # Parse JSON results (even if tests failed, JSON is still written)
        if json_report_path.exists():
            try:
                return self._parse_json_results(json_report_path, html_report_dir, repo_name)
            except Exception as e:
                return self._error(f"Tests ran but result parsing failed: {e}\n\nOutput:\n{output[-2000:]}")

        return self._error(
            "Playwright test run did not produce results.\n"
            "Ensure `@playwright/test` is in devDependencies and tests exist.\n\n"
            f"Output:\n{output[-3000:]}"
        )

    async def _execute_tests_remotely(
        self, repo_name: str, project_dir: Path, target_url: str, playwright_service_url: str
    ) -> Dict[str, Any]:
        """Send tests and target url to the remote Playwright microservice and unpack reports."""
        import base64
        import io
        import zipfile
        import httpx

        # 1. Locate all test files in the project
        test_files = []
        test_paths = self._find_test_files(project_dir)
        
        for path_str in test_paths:
            path = Path(path_str)
            try:
                content = path.read_text(encoding="utf-8", errors="replace")
                test_files.append({
                    "name": path.name,
                    "content": content
                })
            except Exception as e:
                print(f"[Playwright Integration] Error reading spec file {path.name}: {e}")

        # 2. POST to the remote Playwright service
        payload = {
            "baseURL": target_url,
            "testFiles": test_files
        }
        
        url = f"{playwright_service_url.rstrip('/')}/run"
        print(f"[Playwright Integration] Dispatching tests to external service: {url} (baseURL: {target_url})")
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                resp = await client.post(url, json=payload)
                
            if resp.status_code != 200:
                return self._error(f"Remote Playwright execution service returned status code {resp.status_code}:\n{resp.text[:2000]}")
                
            data = resp.json()
            if not data.get("success"):
                return self._error(f"Remote Playwright execution service failed:\n{data.get('error')}")
                
            # 3. Create local playwright-report directory
            report_dir = project_dir / "playwright-report"
            report_dir.mkdir(parents=True, exist_ok=True)
            
            # 4. Write test-results.json report
            json_report_path = report_dir / "test-results.json"
            if data.get("testResultsJson"):
                json_report_path.write_text(json.dumps(data["testResultsJson"]), encoding="utf-8")
                
            # 5. Extract HTML report zip
            zip_base64 = data.get("htmlReportZipBase64")
            if zip_base64:
                try:
                    zip_bytes = base64.b64decode(zip_base64)
                    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
                        z.extractall(str(report_dir))
                    print(f"[Playwright Integration] Successfully unpacked remote HTML report into: {report_dir}")
                except Exception as zip_err:
                    print(f"[Playwright Integration] Error extracting HTML report zip: {zip_err}")

            if json_report_path.exists():
                return self._parse_json_results(json_report_path, report_dir, repo_name)
                
            return self._error(f"Remote execution completed successfully, but did not return a valid test results JSON.\nExit code: {data.get('exitCode')}\n\nStdout:\n{data.get('stdout', '')[-1500:]}")
            
        except Exception as exc:
            return self._error(f"Failed to communicate with external Playwright validation service at {url}: {exc}")


    async def _run_subprocess(self, cmd: list, cwd: Path, env: dict):
        """Run a subprocess asynchronously using asyncio.create_subprocess_shell and return (success, combined_output)."""
        import sys
        import os
        import asyncio
        
        # Shell-compatible string formatting for command list
        cmd_str = " ".join(f'"{x}"' if ' ' in str(x) or '(' in str(x) or ')' in str(x) else str(x) for x in cmd)
        
        try:
            # We run the command asynchronously in a shell
            proc = await asyncio.create_subprocess_shell(
                cmd_str,
                cwd=str(cwd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env=env
            )
            
            try:
                # Wait for completion with timeout of 300 seconds
                stdout_bytes, _ = await asyncio.wait_for(proc.communicate(), timeout=300.0)
                output = stdout_bytes.decode('utf-8', errors='replace')
                return proc.returncode == 0, output
            except asyncio.TimeoutError:
                # Hard kill process and its descendants to avoid orphaned hangs
                try:
                    if os.name == 'nt':
                        # Windows process tree kill
                        import subprocess
                        subprocess.run(
                            f"taskkill /F /T /PID {proc.pid}", 
                            shell=True, 
                            stdout=subprocess.DEVNULL, 
                            stderr=subprocess.DEVNULL
                        )
                    else:
                        proc.kill()
                        await proc.wait()
                except Exception:
                    pass
                return False, "Process timed out after 300 seconds."
        except Exception as e:
            return False, f"Failed to start process: {e}"

    def _parse_json_results(
        self, json_path: Path, html_dir: Path, repo_name: str
    ) -> Dict[str, Any]:
        """Parse Playwright JSON reporter output."""
        data = json.loads(json_path.read_text(encoding="utf-8"))

        total = 0
        passed = 0
        failed = 0
        skipped = 0
        duration_ms = 0
        modules = []

        for suite in data.get("suites", []):
            suite_title = suite.get("title", "Test File")
            suite_passed = 0
            suite_failed = 0
            suite_total = 0
            suite_duration = 0
            
            def walk_subsuites(sublist):
                nonlocal suite_total, suite_passed, suite_failed, suite_duration, total, passed, failed, skipped, duration_ms
                for s in sublist:
                    for spec in s.get("specs", []):
                        for test in spec.get("tests", []):
                            total += 1
                            suite_total += 1
                            result_status = test.get("status", "")
                            if result_status in ("passed", "expected"):
                                passed += 1
                                suite_passed += 1
                            elif result_status in ("failed", "unexpected", "timedOut"):
                                failed += 1
                                suite_failed += 1
                            elif result_status in ("skipped", "pending"):
                                skipped += 1
                            for r in test.get("results", []):
                                duration_ms += r.get("duration", 0)
                                suite_duration += r.get("duration", 0)
                    walk_subsuites(s.get("suites", []))
                    
            walk_subsuites([suite])
            
            if suite_total > 0:
                modules.append({
                    "id": len(modules) + 1,
                    "module": suite_title.replace(".spec.ts", "").replace("-", " ").title(),
                    "status": "Failed" if suite_failed > 0 else "Passed",
                    "time": f"{round(suite_duration / 1000, 1)}s",
                    "rawTime": suite_duration
                })

        # Fallback: check top-level stats
        stats = data.get("stats", {})
        if total == 0 and stats:
            total = stats.get("expected", 0) + stats.get("unexpected", 0) + stats.get("skipped", 0)
            passed = stats.get("expected", 0)
            failed = stats.get("unexpected", 0)
            skipped = stats.get("skipped", 0)
            duration_ms = stats.get("duration", 0)

        exec_secs = round(duration_ms / 1000, 1) if duration_ms else 0
        exec_time = f"{exec_secs}s"

        overall_status = "PASSED" if failed == 0 and total > 0 else ("FAILED" if failed > 0 else "NO_TESTS")
        html_report_url = f"/migration/{repo_name}/playwright/report/index.html" if html_dir.exists() else None

        project_dir = json_path.parent.parent
        test_files_paths = self._find_test_files(project_dir)
        return {
            "playwrightAvailable": True,
            "testFilesCount": len(test_files_paths),
            "testFiles": [str(Path(f).relative_to(project_dir).as_posix()) for f in test_files_paths],
            "totalTests": total,
            "passedTests": passed,
            "failedTests": failed,
            "skippedTests": skipped,
            "executionTime": exec_time,
            "status": overall_status,
            "htmlReportUrl": html_report_url,
            "modules": modules,
            "errorMessage": None,
        }

    def _not_available(self, message: str = "") -> Dict[str, Any]:
        return {
            "playwrightAvailable": False,
            "testFilesCount": 0,
            "totalTests": 0,
            "passedTests": 0,
            "failedTests": 0,
            "skippedTests": 0,
            "executionTime": None,
            "status": "NOT_AVAILABLE",
            "htmlReportUrl": None,
            "errorMessage": message,
        }

    def _error(self, message: str) -> Dict[str, Any]:
        return {
            "playwrightAvailable": True,
            "testFilesCount": 0,
            "totalTests": 0,
            "passedTests": 0,
            "failedTests": 0,
            "skippedTests": 0,
            "executionTime": None,
            "status": "ERROR",
            "htmlReportUrl": None,
            "errorMessage": message,
        }


playwright_service = PlaywrightService()
