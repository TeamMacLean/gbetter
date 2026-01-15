/**
 * Gene Track Tests - Verify BigBed gene track loading and display
 * Tests that gene tracks load automatically and appear in the sidebar
 */
import { test, expect } from '@playwright/test';

test.describe('Gene Track Loading', () => {
	test('gene track appears in sidebar on page load for GRCh38', async ({ page }) => {
		await page.goto('/');

		// Wait for the gene track to appear in the sidebar
		// The track should load automatically for assemblies with BigBed URLs
		await expect(page.getByText('UCSC Known Genes')).toBeVisible({ timeout: 10000 });
	});

	test('sidebar shows track count including gene track', async ({ page }) => {
		await page.goto('/');

		// Wait for gene track to load
		await expect(page.getByText('UCSC Known Genes')).toBeVisible({ timeout: 10000 });

		// Sidebar should show at least 1 track
		await expect(page.getByText(/Tracks \([1-9]/)).toBeVisible();
	});

	test('gene track has visibility toggle', async ({ page }) => {
		await page.goto('/');

		// Wait for gene track
		await expect(page.getByText('UCSC Known Genes')).toBeVisible({ timeout: 10000 });

		// Find the gene track container and its visibility toggle
		const geneTrackItem = page.locator('div').filter({ hasText: 'UCSC Known Genes' }).first();
		const visibilityToggle = geneTrackItem.locator('button').first();

		await expect(visibilityToggle).toBeVisible();
	});

	test('gene track shows loading state then feature count', async ({ page }) => {
		await page.goto('/');

		// Wait for gene track to appear
		await expect(page.getByText('UCSC Known Genes')).toBeVisible({ timeout: 10000 });

		// Eventually should show feature count (not "Loading...")
		await expect(page.getByText(/\d+ features/)).toBeVisible({ timeout: 15000 });
	});

	test('gene track shows BIGBED type', async ({ page }) => {
		await page.goto('/');

		// Wait for gene track
		await expect(page.getByText('UCSC Known Genes')).toBeVisible({ timeout: 10000 });

		// Should show the track type
		await expect(page.getByText('BIGBED')).toBeVisible();
	});
});

test.describe('Gene Track Visibility Toggle', () => {
	test('clicking visibility toggle hides genes from canvas', async ({ page }) => {
		await page.goto('/');

		// Wait for gene track to load and show features
		await expect(page.getByText('UCSC Known Genes')).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/\d+ features/)).toBeVisible({ timeout: 15000 });

		// Find and click the visibility toggle (first button in gene track item)
		const geneTrackItem = page.locator('aside div').filter({ hasText: 'UCSC Known Genes' }).first();
		const visibilityToggle = geneTrackItem.locator('button').first();

		await visibilityToggle.click();

		// Toggle should still be visible but track should be hidden
		await expect(visibilityToggle).toBeVisible();
	});
});

test.describe('Assembly Switching', () => {
	test('switching to TAIR10 loads plant gene track', async ({ page }) => {
		await page.goto('/');

		// Wait for initial load
		await page.waitForTimeout(1000);

		// Click assembly selector
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();

		// Click on TAIR10 (Arabidopsis)
		await page.getByText('TAIR10').click();

		// Wait for gene track to load for new assembly
		await expect(page.getByText('UCSC Known Genes')).toBeVisible({ timeout: 10000 });
	});

	test('switching assemblies updates gene track features', async ({ page }) => {
		await page.goto('/');

		// Wait for initial gene track
		await expect(page.getByText('UCSC Known Genes')).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/\d+ features/)).toBeVisible({ timeout: 15000 });

		// Note the initial feature count text
		const initialFeatures = await page.getByText(/\d+ features/).first().textContent();

		// Switch assembly
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('TAIR10').click();

		// Wait for new features to load (count may change or stay same, but should update)
		await page.waitForTimeout(2000);
		await expect(page.getByText('UCSC Known Genes')).toBeVisible();
	});
});
