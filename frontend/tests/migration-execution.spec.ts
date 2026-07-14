import { test, expect } from '@playwright/test';
import { MigrationCenterPage } from './pages/MigrationCenterPage';
import { VALID_REPO_URLS, JAVA_VERSIONS } from './fixtures/testData';
import { MOCK_ANALYSIS_SUCCESS } from './fixtures/mockResponses';
import { mockMigrationSuccess } from './utils/apiMocks';
import { setLocalStorageData } from './utils/helpers';

test.describe('Migration Execution — Functional Tests', () => {
  let migrationPage: MigrationCenterPage;

  test.beforeEach(async ({ page }) => {
    // Pre-populate localStorage with analysis result so MigrationCenter has a repo URL
    await setLocalStorageData(page, 'last_analysis', MOCK_ANALYSIS_SUCCESS);
    await setLocalStorageData(page, 'last_analysis_time', '5.2');

    migrationPage = new MigrationCenterPage(page);
    await migrationPage.navigate();
  });

  test('1) Target project URL is pre-filled from analysis', async ({ page }) => {
    await expect(migrationPage.targetProjectUrl).toBeVisible();
    const targetText = migrationPage.page.locator('text=' + VALID_REPO_URLS.springPetclinic);
    await expect(targetText.first()).toBeVisible();
  });

  test('2) Target Java version radio buttons are visible and clickable', async ({ page }) => {
    for (const version of JAVA_VERSIONS) {
      const versionLabel = migrationPage.page.locator(`text=Java ${version}`);
      await expect(versionLabel.first()).toBeVisible();
    }

    // Click each version and verify
    await migrationPage.selectTargetVersion('17');
    await expect(migrationPage.java17Radio).toBeChecked();

    await migrationPage.selectTargetVersion('11');
    await expect(migrationPage.java11Radio).toBeChecked();
  });

  test('3) Default target version is Java 21', async ({ page }) => {
    await expect(migrationPage.java21Radio).toBeChecked();
  });

  test('4) Run Migration button is enabled when repo URL exists', async ({ page }) => {
    await expect(migrationPage.runMigrationButton).toBeEnabled();
    await expect(migrationPage.runMigrationButton).toContainText('Run Migration');
  });

  test('5) Run Migration button disabled without repo', async ({ page }) => {
    // Clear localStorage and reload
    await page.addInitScript(() => {
      localStorage.removeItem('last_analysis');
    });
    const freshPage = new MigrationCenterPage(page);
    await freshPage.navigate();
    await expect(freshPage.runMigrationButton).toBeDisabled();
  });

  test('6) Clicking Run Migration starts processing', async ({ page }) => {
    await mockMigrationSuccess(page);
    await migrationPage.clickRunMigration();
    await migrationPage.isMigrationLoading();
  });

  test('7) Progress indicator appears during migration', async ({ page }) => {
    await mockMigrationSuccess(page);
    await migrationPage.clickRunMigration();
    await expect(migrationPage.progressBar).toBeVisible();
  });

  test('8) Migration completes with success banner', async ({ page }) => {
    await mockMigrationSuccess(page);
    await migrationPage.clickRunMigration();
    await expect(migrationPage.successBanner).toBeVisible({ timeout: 30_000 });
  });
});
