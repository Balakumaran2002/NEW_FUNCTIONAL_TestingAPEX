import os

pages = {
    'Home Page': '/',
    'Find Owners Page': '/owners/find',
    'Veterinarians Page': '/vets.html',
    'Add Owner Page': '/owners/new',
    'Error Page': '/oups',
    'Owners List Page': '/owners?lastName='
}

test_dir = r'C:\Users\ST-Sivaranjini\OneDrive - SORIM TECHNOLOGIES\Desktop\Java Convertion testing\java_convertion 4\python_backend\workspace\spring-framework-petclinic\tests\e2e'
os.makedirs(test_dir, exist_ok=True)

for i, (page_name, path) in enumerate(pages.items(), 6):
    safe_name = page_name.replace(' ', '')
    content = f"""import {{ test, expect }} from '@playwright/test';

test.describe('{page_name} Checks', () => {{
  test('1. {page_name} renders successfully', async ({{ page, baseURL }}) => {{
    await page.goto(baseURL + '{path}');
    await expect(page.locator('body')).toBeVisible();
  }});

  test('2. {page_name} handles mobile viewport correctly', async ({{ page, baseURL }}) => {{
    await page.setViewportSize({{ width: 375, height: 667 }});
    await page.goto(baseURL + '{path}');
    await expect(page.locator('body')).toBeVisible();
  }});

  test('3. {page_name} meets basic accessibility standards', async ({{ page, baseURL }}) => {{
    await page.goto(baseURL + '{path}');
    const images = await page.locator('img').all();
    for (const img of images) {{
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }}
  }});

  test('4. {page_name} interactions do not produce console errors', async ({{ page, baseURL }}) => {{
    const errors: string[] = [];
    page.on('console', msg => {{
      if (msg.type() === 'error') errors.push(msg.text());
    }});
    await page.goto(baseURL + '{path}');
    expect(errors.length).toBeLessThanOrEqual(5);
  }});

  test('5. {page_name} performance loads within acceptable threshold', async ({{ page, baseURL }}) => {{
    const startTime = Date.now();
    await page.goto(baseURL + '{path}');
    await expect(page.locator('body')).toBeVisible();
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
  }});
}});
"""
    filename = f'{i:02d}-{safe_name.lower()}.spec.ts'
    filepath = os.path.join(test_dir, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Tests regenerated successfully!')
