import { test, expect } from '@playwright/test';
import { RepositoryAnalysisPage } from './pages/RepositoryAnalysisPage';
import { MigrationCenterPage } from './pages/MigrationCenterPage';
import { MigrationReportPage } from './pages/MigrationReportPage';
import { ConversionReportPage } from './pages/ConversionReportPage';
import { INVALID_URLS, VALID_REPO_URLS } from './fixtures/testData';
import { 
  mockAnalysisNonJava, 
  mockAnalysisError, 
  mockBackendUnavailable,
  mockMigrationFailure,
  mockMigrationBuildFailure
} from './utils/apiMocks';
import { setLocalStorageData } from './utils/helpers';
import { MOCK_ANALYSIS_SUCCESS } from './fixtures/mockResponses';

test.describe('Negative & Error Handling — Functional Tests', () => {
  
  test.describe('Repository Analysis', () => {
    let analysisPage: RepositoryAnalysisPage;

    test.beforeEach(async ({ page }) => {
      analysisPage = new RepositoryAnalysisPage(page);
      await analysisPage.navigate();
    });

    test('1) Empty repository URL submission is blocked', async ({ page }) => {
      await analysisPage.clearUrlInput();
      await analysisPage.clickAnalyze();
      await analysisPage.isAnalyzeButtonReady();
    });

    test('2) Invalid URL format shows browser validation', async ({ page }) => {
      await analysisPage.enterRepositoryUrl(INVALID_URLS.plainText);
      await analysisPage.clickAnalyze();
      const msg = await analysisPage.getValidationMessage();
      expect(msg.length).toBeGreaterThan(0);
    });

    test('3) Non-Java repository shows applicable warning', async ({ page }) => {
      await mockAnalysisNonJava(page);
      await analysisPage.enterRepositoryUrl('https://github.com/pallets/flask');
      await analysisPage.clickAnalyze();
      await expect(analysisPage.migrationNotApplicableWarning).toBeVisible({ timeout: 10000 });
    });

    test('4) Private repository error is handled', async ({ page }) => {
      await mockAnalysisError(page, 'privateRepo');
      await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.springPetclinic);
      await analysisPage.clickAnalyze();
      await expect(analysisPage.errorTitle).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Authentication required')).toBeVisible();
    });

    test('5) Repository not found (404) error is handled', async ({ page }) => {
      await mockAnalysisError(page, 'notFound');
      await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.springPetclinic);
      await analysisPage.clickAnalyze();
      await expect(analysisPage.errorTitle).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Repository not found')).toBeVisible();
    });

    test('6) Backend server unavailable', async ({ page }) => {
      await mockBackendUnavailable(page);
      await analysisPage.enterRepositoryUrl(VALID_REPO_URLS.springPetclinic);
      await analysisPage.clickAnalyze();
      await expect(analysisPage.errorTitle).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Migration Center', () => {
    let migrationPage: MigrationCenterPage;

    test('8) Migration without prior analysis shows warning', async ({ page }) => {
      // Don't set local storage
      migrationPage = new MigrationCenterPage(page);
      await migrationPage.navigate();
      await expect(migrationPage.noAnalysisWarning).toBeVisible();
      await expect(migrationPage.runMigrationButton).toBeDisabled();
    });

    test('9) Migration API failure is handled', async ({ page }) => {
      await setLocalStorageData(page, 'last_analysis', MOCK_ANALYSIS_SUCCESS);
      await setLocalStorageData(page, 'last_analysis_time', '5.2');
      await mockMigrationFailure(page);
      
      migrationPage = new MigrationCenterPage(page);
      await migrationPage.navigate();
      await migrationPage.clickRunMigration();
      await expect(migrationPage.errorTitle).toBeVisible({ timeout: 10000 });
    });

    test('10) Build failure result is handled correctly', async ({ page }) => {
      await setLocalStorageData(page, 'last_analysis', MOCK_ANALYSIS_SUCCESS);
      await mockMigrationBuildFailure(page);
      
      migrationPage = new MigrationCenterPage(page);
      await migrationPage.navigate();
      await migrationPage.clickRunMigration();
      
      // Should show build failure instead of success
      await expect(migrationPage.buildCheckSection).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Build Failure').first()).toBeVisible();
      await expect(migrationPage.compilerErrorSection).toBeVisible();
    });
  });

  test.describe('Reports', () => {
    test('11) Empty migration report page shows appropriate message', async ({ page }) => {
      // Clear localStorage
      await page.addInitScript(() => localStorage.removeItem('last_migration'));
      const reportPage = new MigrationReportPage(page);
      await reportPage.navigate();
      await expect(reportPage.emptyState).toBeVisible();
    });

    test('12) Empty conversion report page shows appropriate message', async ({ page }) => {
      await page.addInitScript(() => localStorage.removeItem('last_conversion'));
      const reportPage = new ConversionReportPage(page);
      await reportPage.navigate();
      await expect(reportPage.emptyState).toBeVisible();
    });
  });

});
