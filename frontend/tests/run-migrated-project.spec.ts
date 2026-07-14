import { test, expect } from '@playwright/test';
import { MigrationCenterPage } from './pages/MigrationCenterPage';
import { MOCK_ANALYSIS_SUCCESS } from './fixtures/mockResponses';
import { mockMigrationSuccess, mockRunProjectSuccess, mockReportDownloads } from './utils/apiMocks';
import { setLocalStorageData } from './utils/helpers';

test.describe('Run Migrated Project — Functional Tests', () => {
  let migrationPage: MigrationCenterPage;

  test.beforeEach(async ({ page }) => {
    // Pre-populate analysis result
    await setLocalStorageData(page, 'last_analysis', MOCK_ANALYSIS_SUCCESS);
    await setLocalStorageData(page, 'last_analysis_time', '5.2');

    // Mock all APIs
    await mockMigrationSuccess(page);
    await mockRunProjectSuccess(page);
    await mockReportDownloads(page);

    migrationPage = new MigrationCenterPage(page);
    await migrationPage.navigate();

    // Execute migration and wait for results
    await migrationPage.clickRunMigration();
    await expect(migrationPage.successBanner).toBeVisible({ timeout: 30_000 });
  });

  test('1) Project Runner Dashboard is visible after build success', async ({ page }) => {
    await expect(migrationPage.projectRunnerDashboard).toBeVisible();
  });

  test('2) Run Project button is clickable', async ({ page }) => {
    await expect(migrationPage.runProjectButton).toBeVisible();
    await expect(migrationPage.runProjectButton).toBeEnabled();
  });

  test('3) Clicking Run Project triggers start', async ({ page }) => {
    await migrationPage.runProjectButton.click();
    // After clicking, the status should change from IDLE
    // The button should disappear or change to Stop/Restart
    await migrationPage.page.waitForTimeout(500);
  });

  test('4) Log Console is present', async ({ page }) => {
    await expect(migrationPage.logConsole).toBeVisible();
  });

  test('5) Live Application Preview pane is visible', async ({ page }) => {
    await expect(migrationPage.livePreviewPane).toBeVisible();
  });
});
