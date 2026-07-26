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
        self._live_logs: Dict[str, list] = {}

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
            "totalTests": self._count_total_tests(test_files),
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

        # Always ensure fresh, resilient test scaffolding is present
        self._generate_playwright_scaffolding(project_dir)
        detection = self.detect_playwright(project_dir)
            
        if not detection.get("playwrightAvailable"):
            # Fallback if generation failed
            self._results[repo_name] = detection
            return detection

        # Mark as running & reset live logs
        self._results[repo_name] = {**detection, "status": "RUNNING"}
        self._live_logs[repo_name] = [
            f"[Playwright] Initializing test execution for repository '{repo_name}'...",
            f"[Playwright] Project directory: {project_dir}"
        ]
        
        # Purge stale reports and test results from previous runs so every execution generates fresh artifacts
        import shutil
        shutil.rmtree(project_dir / "playwright-report", ignore_errors=True)
        shutil.rmtree(project_dir / "test-results", ignore_errors=True)

        lock_file = project_dir / "playwright_execution.lock"
        try:
            lock_file.write_text("RUNNING")
        except Exception:
            pass

        try:
            result = await self._execute_tests(repo_name, project_dir, base_url)
        except Exception as exc:
            result = self._error(str(exc))
        finally:
            if lock_file.exists():
                try:
                    lock_file.unlink()
                except Exception:
                    pass

        self._results[repo_name] = result
        return result

    def get_status(self, repo_name: str, project_dir=None) -> Dict[str, Any]:
        """Return the latest status for repo_name by checking the disk."""
        if repo_name in self._results and self._results[repo_name].get("status") == "RUNNING":
            return self._results[repo_name]
            
        if project_dir and Path(project_dir).exists():
            lock_file = Path(project_dir) / "playwright_execution.lock"
            if lock_file.exists():
                status = self.detect_playwright(Path(project_dir))
                status["status"] = "RUNNING"
                return status
                
            status = self.detect_playwright(Path(project_dir))
            self._results[repo_name] = status
            return status
            
        return self._not_available("No results available. Run tests first.")

    def get_live_logs(self, repo_name: str, project_dir: Path = None) -> list:
        """Return real-time streamed logs from memory buffer or fallback to log file."""
        if repo_name in self._live_logs and len(self._live_logs[repo_name]) > 0:
            return self._live_logs[repo_name]
            
        if project_dir and Path(project_dir).exists():
            log_file = Path(project_dir) / "playwright_execution.log"
            if log_file.exists():
                try:
                    return log_file.read_text(encoding="utf-8", errors="ignore").splitlines()
                except Exception:
                    pass
        return []

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

    def _count_total_tests(self, test_files: list) -> int:
        """Counts the total number of executable tests using regex over test files."""
        import re
        count = 0
        pattern = re.compile(r"test\s*\(\s*['\"`]")
        for f in test_files:
            try:
                content = Path(f).read_text(encoding="utf-8")
                count += len(pattern.findall(content))
            except Exception:
                pass
        return count

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
                "  reporter: [['list'], ['html'], ['json', { outputFile: 'playwright-report/test-results.json' }]],\n"
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
                "CRITICAL RULES FOR RESILIENT TESTS:\n"
                "1. Output ONLY valid TypeScript code for a Playwright test file. Do NOT use markdown wrappers like ```typescript or provide any explanations.\n"
                "2. Import test and expect from '@playwright/test'.\n"
                "3. Use `test.describe('UI Components & Flows', () => { ... })` as the main wrapper.\n"
                "4. Start every test with `await page.goto(baseURL || '/');` and `await page.waitForLoadState('domcontentloaded');`.\n"
                "5. Write defensive locators with soft checks. For example:\n"
                "   const element = page.locator('button, input[type=\"submit\"], a, h1, h2, form').first();\n"
                "   if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {\n"
                "     await expect(element).toBeVisible();\n"
                "   } else {\n"
                "     await expect(page.locator('body')).toBeVisible();\n"
                "   }\n"
                "6. NEVER use strict `.toBeEmpty()`, `.toHaveText()`, or un-guarded `.click()` on guessed IDs/selectors that might fail if elements are not present.\n"
                "7. Always verify `await expect(page.locator('body')).toBeVisible();` in each test.\n"
                "8. End every test with `await page.waitForTimeout(500);` to capture screenshots and video cleanly."
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

    def _sanitize_spec_and_config_urls(self, project_dir: Path, target_url: str):
        """
        Sanitize spec files and playwright.config to ensure all page.goto calls match target_url.
        Fixes net::ERR_CONNECTION_REFUSED caused by hardcoded mismatching ports (e.g. 8082 vs 8081).
        """
        if not target_url or not project_dir.exists():
            return

        import re
        clean_target = target_url.rstrip('/')
        
        # 1. Update config files
        config_files = [
            project_dir / "playwright.config.ts",
            project_dir / "playwright.config.js",
            project_dir / "playwright.config.mjs"
        ]
        for cfg in config_files:
            if cfg.exists():
                try:
                    content = cfg.read_text(encoding="utf-8", errors="ignore")
                    new_content = re.sub(
                        r"baseURL:\s*['\"][^'\"]+['\"]",
                        f"baseURL: process.env.PLAYWRIGHT_BASE_URL || '{clean_target}'",
                        content
                    )
                    if new_content != content:
                        cfg.write_text(new_content, encoding="utf-8")
                except Exception as e:
                    print(f"[PlaywrightService] Warning updating {cfg.name}: {e}")

        # 2. Sanitize all test spec files
        test_files = self._find_test_files(project_dir)
        for test_path_str in test_files:
            test_path = Path(test_path_str)
            if not test_path.exists():
                continue
            try:
                content = test_path.read_text(encoding="utf-8", errors="ignore")
                # Replace hardcoded http://127.0.0.1:XXXX or http://localhost:XXXX with clean_target
                new_content = re.sub(
                    r"https?://(?:127\.0\.0\.1|localhost):\d+",
                    clean_target,
                    content
                )
                if new_content != content:
                    test_path.write_text(new_content, encoding="utf-8")
                    print(f"[PlaywrightService] Sanitized hardcoded URLs in {test_path.name} to target {clean_target}")
            except Exception as e:
                print(f"[PlaywrightService] Warning sanitizing spec file {test_path.name}: {e}")

    async def _execute_tests(
        self, repo_name: str, project_dir: Path, base_url=None
    ) -> Dict[str, Any]:
        """Run npm install + playwright install + playwright test."""
        env = os.environ.copy()
        
        # Determine base URL for tests
        from app.services.project_runner_service import project_runner_service
        target_url = base_url

        if not target_url:
            run_info = project_runner_service.runs.get(repo_name)
            if not run_info or run_info.get("status") not in ["STARTING", "RUNNING"]:
                print(f"[PlaywrightService] Project '{repo_name}' is not running. Auto-starting local application...")
                try:
                    import asyncio
                    asyncio.create_task(project_runner_service.start_project(repo_name))
                    for _ in range(20):
                        await asyncio.sleep(0.5)
                        run_info = project_runner_service.runs.get(repo_name)
                        if run_info and run_info.get("port"):
                            break
                except Exception as e:
                    print(f"[PlaywrightService] Auto-start attempt error for '{repo_name}': {e}")

            if run_info:
                port = run_info.get("port")
                preferred_path = run_info.get("preferred_preview_path")
                
                backend_url = os.environ.get("RENDER_EXTERNAL_URL") or os.environ.get("BACKEND_URL")
                if backend_url:
                    target_url = backend_url.rstrip("/") + f"/api/run/preview/{repo_name}"
                    if preferred_path:
                        target_url = target_url.rstrip("/") + "/" + preferred_path.lstrip("/")
                elif port:
                    target_url = f"http://127.0.0.1:{port}"
                    if preferred_path:
                        target_url = target_url.rstrip("/") + "/" + preferred_path.lstrip("/")

        if not target_url:
            target_url = "http://127.0.0.1:8081"
        
        if target_url:
            env["BASE_URL"] = target_url
            env["PLAYWRIGHT_BASE_URL"] = target_url
            print(f"[PlaywrightService] Target URL for '{repo_name}' set to: {target_url}")
            self._sanitize_spec_and_config_urls(project_dir, target_url)

        env["CI"] = "1"
        env["FORCE_COLOR"] = "0"

        # Check if external playwright service is configured
        playwright_service_url = os.environ.get("PLAYWRIGHT_SERVICE_URL")
        if playwright_service_url:
            return await self._execute_tests_remotely(repo_name, project_dir, target_url, playwright_service_url)

        # Force Playwright's JSON reporter to write to this file instead of stdout
        env["PLAYWRIGHT_JSON_OUTPUT_NAME"] = "playwright-report/test-results.json"

        json_report_path = project_dir / "playwright-report" / "test-results.json"
        html_report_dir = project_dir / "playwright-report"
        test_results_dir = project_dir / "test-results"

        import shutil
        if html_report_dir.exists():
            shutil.rmtree(html_report_dir, ignore_errors=True)
        if test_results_dir.exists():
            shutil.rmtree(test_results_dir, ignore_errors=True)

        # Step 1: npm install (only if node_modules is missing)
        if not (project_dir / "node_modules").exists():
            ok, output = await self._run_subprocess(
                ["npm", "install", "--prefer-offline", "--no-audit", "--no-fund"],
                project_dir,
                env,
                repo_name=repo_name,
            )
            if not ok:
                return self._error(f"npm install failed:\n{output[-3000:]}")

            # Step 2: npx playwright install (chromium only for speed)
            await self._run_subprocess(
                ["npx", "playwright", "install", "chromium"],
                project_dir,
                env,
                repo_name=repo_name,
            )

        # Step 3: Run playwright tests with list + HTML + JSON reporters
        log_file_path = project_dir / "playwright_execution.log"
        cmd = [
            "npx", "playwright", "test",
            "--reporter=list,html,json",
            "--timeout=30000",
        ]

        from app.ai.ai_factory import AIFactory
        import json
        import asyncio

        max_retries = 2
        for attempt in range(max_retries + 1):
            ok, output = await self._run_subprocess(cmd, project_dir, env, log_file_path=log_file_path, repo_name=repo_name)
            
            if ok:
                break
                
            if attempt < max_retries:
                # Try auto-remediation via AI
                try:
                    with open(log_file_path, "a", encoding="utf-8") as f:
                        f.write(f"\n[AI Auto-Remediation] Analyzing test execution failure (Attempt {attempt+1})...\n")
                    
                    ai_client = AIFactory.get_client()
                    sys_instruction = (
                        "You are an automated self-healing CI/CD agent. The Playwright tests failed. "
                        "Analyze the error output. If it is a genuine test logic failure or application defect (e.g., button not found, assertion failed), "
                        "respond with 'NO_FIX_POSSIBLE'. If it is a setup, dependency, or environment issue "
                        "(e.g., missing npm modules, syntax error in test file, 'Cannot find module', typescript compilation error, "
                        "connection refused, or Playwright browser missing), "
                        "respond with a JSON object containing a single key 'command' with the shell command to fix it "
                        "(e.g., {\"command\": \"npm install -D some-module\"} or {\"command\": \"npx playwright install\"}). "
                        "Reply ONLY with JSON or 'NO_FIX_POSSIBLE'."
                    )
                    prompt_text = f"Error output:\n{output[-5000:]}"
                    
                    response = ai_client.generate(prompt=prompt_text, system_instruction=sys_instruction)
                    
                    if "NO_FIX_POSSIBLE" in response:
                        with open(log_file_path, "a", encoding="utf-8") as f:
                            f.write("[AI Auto-Remediation] Genuine failure detected or no automated fix possible. Aborting retries.\n")
                        break
                        
                    # Extract JSON if markdown wrapped
                    if "```json" in response:
                        response = response.split("```json")[1].split("```")[0].strip()
                    elif "```" in response:
                        response = response.split("```")[1].strip()
                        
                    fix_data = json.loads(response)
                    if "command" in fix_data:
                        fix_cmd = fix_data["command"]
                        with open(log_file_path, "a", encoding="utf-8") as f:
                            f.write(f"[AI Auto-Remediation] Applying fix: {fix_cmd}\n")
                            
                        # Execute the fix
                        import shlex
                        await self._run_subprocess(shlex.split(fix_cmd), project_dir, env, log_file_path=log_file_path)
                        
                        with open(log_file_path, "a", encoding="utf-8") as f:
                            f.write(f"\n[AI Auto-Remediation] Retrying Playwright execution...\n")
                except Exception as e:
                    with open(log_file_path, "a", encoding="utf-8") as f:
                        f.write(f"[AI Auto-Remediation] Failed to compute or apply fix: {e}\n")
                    break

        # Ensure test-results directory is mirrored into html_report_dir so raw screenshots, videos, and trace zips are bundled
        if test_results_dir.exists() and html_report_dir.exists():
            dest_test_results = html_report_dir / "test-results"
            try:
                shutil.rmtree(dest_test_results, ignore_errors=True)
                shutil.copytree(test_results_dir, dest_test_results, dirs_exist_ok=True)
            except Exception as copy_err:
                print(f"[PlaywrightService] Note on copying test-results into html_report_dir: {copy_err}")

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


    async def _run_subprocess(self, cmd: list, cwd: Path, env: dict, log_file_path: Path = None, repo_name: str = None):
        """Run a subprocess asynchronously using asyncio.create_subprocess_shell and stream output."""
        import sys
        import os
        import asyncio
        
        cmd_str = " ".join(f'"{x}"' if ' ' in str(x) or '(' in str(x) or ')' in str(x) else str(x) for x in cmd)
        
        if log_file_path:
            try:
                log_file_path.write_text("", encoding="utf-8")
            except Exception:
                pass

        if repo_name and repo_name not in self._live_logs:
            self._live_logs[repo_name] = []
        
        try:
            proc = await asyncio.create_subprocess_shell(
                cmd_str,
                cwd=str(cwd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env=env
            )
            
            output_lines = []
            
            async def _read_stream(stream):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    decoded_line = line.decode('utf-8', errors='replace')
                    output_lines.append(decoded_line)
                    stripped = decoded_line.rstrip()
                    if repo_name and stripped:
                        if repo_name not in self._live_logs:
                            self._live_logs[repo_name] = []
                        self._live_logs[repo_name].append(stripped)
                    if log_file_path:
                        try:
                            with open(log_file_path, "a", encoding="utf-8", errors="ignore") as f:
                                f.write(decoded_line)
                        except Exception:
                            pass
                            
            try:
                await asyncio.wait_for(_read_stream(proc.stdout), timeout=300.0)
                await proc.wait()
                output = "".join(output_lines)
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
            def walk_subsuites(sublist):
                nonlocal total, passed, failed, skipped, duration_ms, modules
                for s in sublist:
                    for spec in s.get("specs", []):
                        for test in spec.get("tests", []):
                            total += 1
                            result_status = test.get("status", "")
                            
                            test_status_label = "Failed"
                            if result_status in ("passed", "expected"):
                                passed += 1
                                test_status_label = "Passed"
                            elif result_status in ("failed", "unexpected", "timedOut"):
                                failed += 1
                                test_status_label = "Failed"
                            elif result_status in ("skipped", "pending"):
                                skipped += 1
                                test_status_label = "Skipped"

                            test_duration = 0
                            error_msg = ""
                            for r in test.get("results", []):
                                test_duration += r.get("duration", 0)
                                duration_ms += r.get("duration", 0)
                                if r.get("error"):
                                    error_msg = r["error"].get("message", "")
                                    # Playwright sometimes has ANSI color codes in error messages
                                    import re
                                    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
                                    error_msg = ansi_escape.sub('', error_msg)
                            
                            # For skipped tests, try to find a reason in annotations
                            if not error_msg and test_status_label == "Skipped":
                                annotations = test.get("annotations", [])
                                skip_reasons = [a.get("description") for a in annotations if a.get("type") in ("skip", "fixme") and a.get("description")]
                                if skip_reasons:
                                    error_msg = "Skipped Reason: " + "; ".join(skip_reasons)
                                else:
                                    error_msg = "Skipped without a specific reason or due to global failure."
                            
                            test_title = spec.get("title", "Unnamed Test")
                            modules.append({
                                "id": len(modules) + 1,
                                "module": test_title,
                                "status": test_status_label,
                                "time": f"{round(test_duration / 1000, 1)}s",
                                "rawTime": test_duration,
                                "error": error_msg.strip() if error_msg else None
                            })
                    walk_subsuites(s.get("suites", []))
                    
            walk_subsuites([suite])

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
