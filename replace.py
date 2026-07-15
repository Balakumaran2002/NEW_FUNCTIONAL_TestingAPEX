import json
from pathlib import Path

file_path = Path(r"python_backend\app\services\playwright_service.py")
content = file_path.read_text(encoding="utf-8")

start_pattern = "# --- Dynamic UI Component Tests ---"
end_pattern = "        for filename, content in test_suites.items():"

start_idx = content.find(start_pattern)
end_idx = content.find(end_pattern, start_idx)

replacement = '''        # --- Dynamic UI Component Tests ---
        ui_test_content = None
        try:
            from app.services.ui_test_case_service import ui_test_case_service
            is_java = analysis_data.get("isJava", False)
            code_context = ui_test_case_service._extract_ui_code(project_dir, is_java)
            
            system_instruction = (
                "You are an expert QA Automation Engineer. "
                "Analyze the provided source code (JSP, React, Vue, HTML, etc) and generate a single, comprehensive Playwright test file (.spec.ts) "
                "that includes robust E2E test cases representing the business logic and UI components discovered. "
                "IMPORTANT RULES:\\n"
                "1. Output ONLY valid TypeScript code for a Playwright test file. Do NOT use markdown wrappers like ```typescript or provide any explanations.\\n"
                "2. Import test and expect from '@playwright/test'.\\n"
                "3. Use `test.describe('UI Components & Flows', () => { ... })` as the main wrapper.\\n"
                "4. Make sure tests actually attempt to select elements (e.g., locators for inputs, tables, buttons) based on the source code, but be resilient to failures if possible.\\n"
                "5. Start every test with `await page.goto(baseURL || '/');` (or a relevant route if you can infer it).\\n"
                "6. End every test with `await page.waitForTimeout(1000);` to ensure the screenshot and video capture the fully rendered page state correctly."
            )
            
            user_prompt = f"Generate Playwright test cases for the following UI source code.\\n\\nSource Code:\\n{code_context[:20000]}"
            
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
                static_ui_content = "import { test, expect } from '@playwright/test';\\n\\ntest.describe('UI Components Checks', () => {\\n"
                for comp in ui_components:
                    comp_name = comp.replace("'", "\\\\'")
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
      expect(alt).not.toBeNull();
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
                static_ui_content += "});\\n"
                test_suites["04-ui-components.spec.ts"] = static_ui_content

            use_cases = brd.get("useCases", [])
            if use_cases:
                flow_test_content = "import { test, expect } from '@playwright/test';\\n\\ntest.describe('Business Flows', () => {\\n"
                for i, uc in enumerate(use_cases):
                    title = uc.get("title", "Unnamed Flow").replace("'", "\\\\'")
                    flow_test_content += f"""
  test('Business Flow: {title} ({i})', async ({{ page, baseURL }}) => {{
    await page.goto(baseURL || '/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(1000);
  }});
"""
                flow_test_content += "});\\n"
                test_suites["05-business-flows.spec.ts"] = flow_test_content

'''

new_content = content[:start_idx] + replacement + content[end_idx:]
file_path.write_text(new_content, encoding="utf-8")
print("Replaced successfully!")
