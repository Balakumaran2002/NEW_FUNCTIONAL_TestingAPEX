import { test, expect } from '@playwright/test';
import { MigrationReportPage } from './pages/MigrationReportPage';
import { MOCK_LAST_MIGRATION_LOCALSTORAGE, MOCK_ANALYSIS_SUCCESS } from './fixtures/mockResponses';
import { mockReportDownloads } from './utils/apiMocks';
import { setLocalStorageData } from './utils/helpers';

test.describe('Migration Report — Functional Tests', () => {
  let reportPage: MigrationReportPage;

  test.beforeEach(async ({ page }) => {
    // Pre-populate localStorage with migration data
    await setLocalStorageData(page, 'last_migration', MOCK_LAST_MIGRATION_LOCALSTORAGE);
    await setLocalStorageData(page, 'last_analysis', MOCK_ANALYSIS_SUCCESS);
    await mockReportDownloads(page);

    reportPage = new MigrationReportPage(page);
    await reportPage.navigate();
  });

  test('1) Report page loads with header', async ({ page }) => {
    await expect(reportPage.pageHeader).toBeVisible();
    await expect(reportPage.pageHeader).toContainText('Java Migration Summary Report');
  });

  test('2) Metadata table is displayed', async ({ page }) => {
    await expect(reportPage.metadataSection).toBeVisible();
    // Target upgrade should show Java 21
    const targetVersion = reportPage.page.locator('text=Java 21');
    await expect(targetVersion.first()).toBeVisible();
  });

  test('3) Modified files are listed', async ({ page }) => {
    await expect(reportPage.modifiedFilesSection).toBeVisible();
    // Should show pom.xml
    const pomFile = reportPage.page.locator('text=pom.xml');
    await expect(pomFile.first()).toBeVisible();
  });

  test('4) Refactoring logs are displayed', async ({ page }) => {
    await expect(reportPage.refactoringLogsSection).toBeVisible();
  });

  test('5) Download PDF button exists with correct URL', async ({ page }) => {
    await expect(reportPage.downloadPdfLink).toBeVisible();
    const href = await reportPage.downloadPdfLink.getAttribute('href');
    expect(href).toContain('/api/report/migration');
  });
});
