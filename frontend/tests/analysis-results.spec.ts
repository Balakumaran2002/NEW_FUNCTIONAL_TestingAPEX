import { test, expect } from '@playwright/test';
import { RepositoryAnalysisPage } from './pages/RepositoryAnalysisPage';
import { VALID_REPO_URLS } from './fixtures/testData';
import { mockAnalysisSuccess } from './utils/apiMocks';

test.describe('Analysis Results — Functional Tests', () => {
  let analysisPage: RepositoryAnalysisPage;

  test.beforeEach(async ({ page }) => {
    // Mock the analysis API to return success
    await mockAnalysisSuccess(page);

    analysisPage = new RepositoryAnalysisPage(page);
    await analysisPage.navigate();

    // Submit a valid URL and wait for mocked results
    await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.springPetclinic);
    await analysisPage.clickAnalyze();

    // Wait for the success banner to appear (mocked response is instant)
    await expect(analysisPage.successBanner).toBeVisible({ timeout: 10_000 });
  });

  test('1) Analysis completes with success banner', async ({ page }) => {
    await expect(analysisPage.successBanner).toBeVisible();
    await expect(analysisPage.successBanner).toContainText('Repository analysis completed in');
  });

  test('2) Detected Java version is displayed', async ({ page }) => {
    await expect(analysisPage.projectParametersSection).toBeVisible();
    // Check that "Java 8" is visible in the results
    const javaVersionText = page.locator('text=Java 8');
    await expect(javaVersionText.first()).toBeVisible();
  });

  test('3) Build tool (Maven) is displayed', async ({ page }) => {
    await expect(analysisPage.projectParametersSection).toBeVisible();
    const buildToolText = page.locator('text=Maven');
    await expect(buildToolText.first()).toBeVisible();
  });

  test('4) Dependencies are displayed', async ({ page }) => {
    await expect(analysisPage.dependenciesSection).toBeVisible();
    // Check that at least one dependency chip is visible
    const depChips = analysisPage.page.locator('text=spring-boot-starter-web');
    await expect(depChips.first()).toBeVisible();
  });

  test('5) Deprecated APIs are displayed', async ({ page }) => {
    await expect(analysisPage.deprecatedApisSection).toBeVisible();
    const deprecatedItem = analysisPage.page.locator('text=javax.persistence');
    await expect(deprecatedItem.first()).toBeVisible();
  });

  test('6) AI Migration recommendations are displayed', async ({ page }) => {
    await expect(analysisPage.aiRecommendationSection).toBeVisible();
    // The reasoning text should contain migration advice
    const reasoningContent = analysisPage.page.locator('text=Spring Boot 2.7.18');
    await expect(reasoningContent.first()).toBeVisible();
  });

  test('7) Proceed to Migration button is visible for upgradable projects', async ({ page }) => {
    await expect(analysisPage.proceedToMigrationButton).toBeVisible();
  });
});
