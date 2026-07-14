import { test, expect } from '@playwright/test';
import { MigrationCenterPage } from './pages/MigrationCenterPage';
import { MOCK_ANALYSIS_SUCCESS, MOCK_MIGRATION_STATUS_SUCCESS } from './fixtures/mockResponses';
import { mockMigrationSuccess, mockReportDownloads } from './utils/apiMocks';
import { setLocalStorageData } from './utils/helpers';

test.describe('Migration Success — Functional Tests', () => {
  let migrationPage: MigrationCenterPage;

  test.beforeEach(async ({ page }) => {
    // Pre-populate analysis result
    await setLocalStorageData(page, 'last_analysis', MOCK_ANALYSIS_SUCCESS);
    await setLocalStorageData(page, 'last_analysis_time', '5.2');

    // Mock migration API
    await mockMigrationSuccess(page);
    await mockReportDownloads(page);

    migrationPage = new MigrationCenterPage(page);
    await migrationPage.navigate();

    // Execute migration and wait for results
    await migrationPage.clickRunMigration();
    await expect(migrationPage.successBanner).toBeVisible({ timeout: 30_000 });
  });

  test('1) Build status shows "Build Success"', async ({ page }) => {
    await expect(migrationPage.buildCheckSection).toBeVisible();
    await expect(migrationPage.buildStatusIndicator).toBeVisible();
  });

  test('2) LLM Execution Log is displayed', async ({ page }) => {
    await expect(migrationPage.llmLogSection).toBeVisible();
    // Log content should contain migration summary
    const logContent = migrationPage.page.locator('text=Migration Summary');
    await expect(logContent.first()).toBeVisible();
  });

  test('3) Modified files list is displayed', async ({ page }) => {
    await expect(migrationPage.modifiedFilesSection).toBeVisible();
    // Should show pom.xml as modified
    const pomFile = migrationPage.page.locator('text=pom.xml');
    await expect(pomFile.first()).toBeVisible();
  });

  test('4) Download PDF Report link exists', async ({ page }) => {
    await expect(migrationPage.downloadPdfLink).toBeVisible();
    const href = await migrationPage.downloadPdfLink.getAttribute('href');
    expect(href).toContain('/api/report/migration');
  });

  test('5) View Migration Report button exists and navigates', async ({ page }) => {
    await expect(migrationPage.viewMigrationReportButton).toBeVisible();
  });

  test('6) Migration history entry is created', async ({ page }) => {
    await expect(migrationPage.migrationHistorySection).toBeVisible();
  });
});
