import { test, expect } from '@playwright/test';
import { RepositoryAnalysisPage } from './pages/RepositoryAnalysisPage';
import { VALID_REPO_URLS, INVALID_URLS, SIDEBAR_TABS } from './fixtures/testData';
import { navigateToTab } from './utils/helpers';

test.describe('Repository Analysis Flow — Functional Tests', () => {
  let analysisPage: RepositoryAnalysisPage;

  test.beforeEach(async ({ page }) => {
    analysisPage = new RepositoryAnalysisPage(page);
    await analysisPage.navigate();
  });

  // ───────────────────────────────────
  //  TEST GROUP A: Application Launch
  // ───────────────────────────────────

  test('a) Application Launch — Page loads with all core elements visible', async ({ page }) => {
    await expect(analysisPage.pageHeader).toBeVisible();
    await expect(analysisPage.pageHeader).toContainText('GitHub Repository Analysis');
    await expect(analysisPage.urlInput).toBeVisible();
    await expect(analysisPage.urlInput).toBeEnabled();
    await expect(analysisPage.analyzeButton).toBeVisible();
    await analysisPage.isAnalyzeButtonReady();
  });

  test('a2) Application Launch — URL input has correct placeholder text', async ({ page }) => {
    await expect(analysisPage.urlInput).toHaveAttribute(
      'placeholder',
      'https://github.com/username/project-repo',
    );
  });

  test('a3) Application Launch — View mode tabs are visible', async ({ page }) => {
    await expect(analysisPage.overviewTab).toBeVisible();
    await expect(analysisPage.graphicalTab).toBeVisible();
  });

  // ───────────────────────────────────
  //  TEST GROUP B: Repository URL Input
  // ───────────────────────────────────

  test('b) Repository URL Input — Valid URL is accepted and displayed', async ({ page }) => {
    const validUrl = VALID_REPO_URLS.springPetclinic;
    await analysisPage.enterRepositoryUrl(validUrl);
    await expect(analysisPage.urlInput).toHaveValue(validUrl);
  });

  test('b2) Repository URL Input — Multiple valid URLs can be entered sequentially', async ({ page }) => {
    await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.springPetclinic);
    await expect(analysisPage.urlInput).toHaveValue(VALID_REPO_URLS.springPetclinic);
    await analysisPage.clearUrlInput();
    await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.guava);
    await expect(analysisPage.urlInput).toHaveValue(VALID_REPO_URLS.guava);
  });

  test('b3) Repository URL Input — Input field can be cleared', async ({ page }) => {
    await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.springBoot);
    await expect(analysisPage.urlInput).toHaveValue(VALID_REPO_URLS.springBoot);
    await analysisPage.clearUrlInput();
    await expect(analysisPage.urlInput).toHaveValue('');
  });

  test('b4) Repository URL Input — Empty submission is blocked by HTML5 validation', async ({ page }) => {
    await analysisPage.clearUrlInput();
    await analysisPage.clickAnalyze();
    await analysisPage.isAnalyzeButtonReady();
  });

  test('b5) Repository URL Input — Invalid URL triggers HTML5 validation', async ({ page }) => {
    await analysisPage.enterRepositoryUrl(INVALID_URLS.plainText);
    await analysisPage.clickAnalyze();
    await analysisPage.isAnalyzeButtonReady();
    const validationMsg = await analysisPage.getValidationMessage();
    expect(validationMsg).toBeTruthy();
    expect(validationMsg.length).toBeGreaterThan(0);
  });

  // ───────────────────────────────────
  //  TEST GROUP C: Analyze Button
  // ───────────────────────────────────

  test('c) Analyze Button — Clicking triggers loading state', async ({ page }) => {
    await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.springPetclinic);
    await analysisPage.clickAnalyze();
    await analysisPage.isAnalysisLoading();
  });

  test('c2) Analyze Button — Input is disabled during analysis', async ({ page }) => {
    await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.springPetclinic);
    await analysisPage.clickAnalyze();
    await analysisPage.isInputDisabledDuringLoading();
  });

  test('c3) Analyze Button — Progress indicator appears during analysis', async ({ page }) => {
    await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.springPetclinic);
    await analysisPage.clickAnalyze();
    await analysisPage.isProgressVisible();
  });

  // ───────────────────────────────────
  //  TEST GROUP D: Sidebar Navigation
  // ───────────────────────────────────

  test('d) Sidebar Navigation — All menu items are visible', async ({ page }) => {
    for (const [, label] of Object.entries(SIDEBAR_TABS)) {
      const tabButton = page.getByRole('button', { name: label });
      await expect(tabButton).toBeVisible();
    }
  });

  test('d2) Sidebar Navigation — Can navigate to Dashboard and back', async ({ page }) => {
    await navigateToTab(page, SIDEBAR_TABS.dashboard);
    await expect(analysisPage.pageHeader).not.toBeVisible();
    await navigateToTab(page, SIDEBAR_TABS.analysis);
    await expect(analysisPage.pageHeader).toBeVisible();
  });

  // ───────────────────────────────────
  //  TEST GROUP E: View Mode Switching
  // ───────────────────────────────────

  test('e) View Mode — Can switch between Overview and Graphical View', async ({ page }) => {
    await expect(analysisPage.overviewTab).toBeVisible();
    await analysisPage.switchToGraphicalView();
    await analysisPage.switchToOverview();
  });
});
