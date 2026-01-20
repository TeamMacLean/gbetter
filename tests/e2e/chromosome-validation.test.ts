/**
 * E2E Tests for Remote Track Chromosome Validation
 *
 * Tests the warning system that alerts users when loading a remote track
 * with chromosomes that don't match the current assembly.
 */

import { test, expect } from '@playwright/test';

// E. coli test VCF URL (hosted on R2)
const ECOLI_VCF_URL = 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.vcf.gz';

test.describe('Remote Track Chromosome Validation', () => {
	test('shows warning when loading E. coli VCF with human assembly selected', async ({ page }) => {
		// Start with human GRCh38 assembly (default)
		await page.goto('/');

		// Verify we're on a human assembly
		await expect(page.getByText(/GRCh38|Human/)).toBeVisible({ timeout: 5000 });

		// Click URL tab
		await page.click('button:has-text("URL")');

		// Enter E. coli VCF URL
		const urlInput = page.locator('input[type="url"]');
		await urlInput.fill(ECOLI_VCF_URL);

		// Click add button
		await urlInput.locator('..').locator('button:has-text("+")').click();

		// Wait for track to be added
		await expect(page.locator('span.uppercase:has-text("vcf")')).toBeVisible({ timeout: 10000 });

		// Wait for validation to complete and warning to appear
		// Look for warning text content instead of class selector (class has opacity modifier)
		const warningBanner = page.getByText(/Chromosomes in file.*don't match/i);
		await expect(warningBanner).toBeVisible({ timeout: 15000 });
	});

	test('no warning when loading E. coli VCF with E. coli assembly selected', async ({ page }) => {
		await page.goto('/');

		// Switch to E. coli K-12 assembly
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();

		// Wait for assembly menu to appear
		await page.waitForTimeout(300);

		// Click on E. coli K-12
		await page.getByText('E. coli K-12').click();

		// Wait for assembly to switch
		await expect(page.getByText(/E\. coli|ecoli/i)).toBeVisible({ timeout: 5000 });

		// Click URL tab
		await page.click('button:has-text("URL")');

		// Enter E. coli VCF URL
		const urlInput = page.locator('input[type="url"]');
		await urlInput.fill(ECOLI_VCF_URL);

		// Click add button
		await urlInput.locator('..').locator('button:has-text("+")').click();

		// Wait for track to be added
		await expect(page.locator('span.uppercase:has-text("vcf")')).toBeVisible({ timeout: 10000 });

		// Wait for validation to complete
		await page.waitForTimeout(3000);

		// Should NOT show chromosome mismatch warning
		const warningBanner = page.getByText(/Chromosomes in file.*don't match/i);
		await expect(warningBanner).not.toBeVisible({ timeout: 2000 });
	});

	test('warning can be dismissed', async ({ page }) => {
		// Start with human assembly
		await page.goto('/');

		// Click URL tab
		await page.click('button:has-text("URL")');

		// Enter E. coli VCF URL
		const urlInput = page.locator('input[type="url"]');
		await urlInput.fill(ECOLI_VCF_URL);

		// Click add button
		await urlInput.locator('..').locator('button:has-text("+")').click();

		// Wait for warning to appear
		const warningText = page.getByText(/Chromosomes in file.*don't match/i);
		await expect(warningText).toBeVisible({ timeout: 15000 });

		// Find the dismiss button (button with title="Dismiss" near the warning)
		const dismissButton = page.getByRole('button', { name: 'Dismiss' });
		await dismissButton.click();

		// Warning should disappear
		await expect(warningText).not.toBeVisible({ timeout: 2000 });
	});
});
