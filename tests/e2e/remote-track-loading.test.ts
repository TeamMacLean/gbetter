/**
 * Remote Track Loading Tests
 *
 * Tests for issues with tracks appearing blank or not loading data:
 * 1. Panning out of view and returning
 * 2. Assembly switching
 * 3. BigWig track loading through navigation
 */
import { test, expect } from '@playwright/test';

test.describe('Pan and Return Data Loading', () => {
	test('data loads when navigating away and returning', async ({ page }) => {
		// Start at TP53 region
		await page.goto('/?chr=chr17&start=7661778&end=7687490');

		// Wait for initial data to load
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });

		// Navigate to a different region using coordinate input
		const coordInput = page.locator('input[type="text"]').first();
		await coordInput.fill('chr17:8000000-8100000');
		await page.keyboard.press('Enter');

		// Wait for data at new location
		await page.waitForTimeout(1000);

		// Return to original position
		await coordInput.fill('chr17:7661778-7687490');
		await page.keyboard.press('Enter');

		// Wait for data to reload - should show features, not blank
		await page.waitForTimeout(1000);
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });
	});

	test('data persists when panning with keyboard', async ({ page }) => {
		await page.goto('/?chr=chr17&start=7661778&end=7687490');

		// Wait for data
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });

		// Focus the canvas for keyboard events
		await page.locator('canvas').click();

		// Pan right using arrow keys
		await page.keyboard.press('ArrowRight');
		await page.waitForTimeout(300);
		await page.keyboard.press('ArrowRight');
		await page.waitForTimeout(300);

		// Pan back left
		await page.keyboard.press('ArrowLeft');
		await page.waitForTimeout(300);
		await page.keyboard.press('ArrowLeft');
		await page.waitForTimeout(500);

		// Features should still be visible after panning back
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });
	});
});

test.describe('Assembly Switch Data Loading', () => {
	test('assembly switch loads correct tracks and clears old data', async ({ page }) => {
		await page.goto('/');

		// Wait for initial GRCh38 Transcripts track
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });

		// Switch to TAIR10 (should have both Genes and Transcripts)
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('TAIR10').click();

		// Wait for TAIR10 tracks to load
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		// Features should load for new assembly
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });
	});

	test('switching assembly back and forth reloads data correctly', async ({ page }) => {
		await page.goto('/');

		// Wait for GRCh38 Transcripts
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });

		// Switch to TAIR10
		let assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('TAIR10').click();

		// Wait for TAIR10 tracks
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });

		// Switch back to GRCh38
		assemblyButton = page.locator('button').filter({ hasText: /TAIR|Arabidopsis/i }).first();
		await assemblyButton.click();
		await page.getByText('GRCh38').click();

		// Wait for GRCh38 Transcripts to reload
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		// Features should load correctly (not stale data)
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });
	});

	test('assembly switch clears old features before loading new', async ({ page }) => {
		await page.goto('/');

		// Wait for initial data
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });

		// Store initial feature count indicator
		const initialFeatureText = await page.getByText(/\d+ features/).first().textContent();

		// Switch assembly
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('E. coli K-12').click();

		// Wait for new assembly to load
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });

		// E. coli should have different feature count than human
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });
	});
});

test.describe('BigWig Track Loading', () => {
	// Using a reliable public BigWig for testing
	const TEST_BIGWIG_URL = 'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/phyloP100way/hg38.phyloP100way.bw';

	test('BigWig track loads data and shows in sidebar', async ({ page }) => {
		// Load page with BigWig track
		await page.goto(`/?chr=chr17&start=7661778&end=7687490&bigwig=${encodeURIComponent(TEST_BIGWIG_URL)}`);

		// Wait for BigWig track to appear
		await expect(page.getByText('BigWig Track').first()).toBeVisible({ timeout: 20000 });

		// Should show BIGWIG type badge
		await expect(page.getByText('BIGWIG').first()).toBeVisible();

		// Should load features
		await expect(page.getByText(/[\d,]+ features/).first()).toBeVisible({ timeout: 30000 });
	});

	test('BigWig data reloads when navigating away and back', async ({ page }) => {
		await page.goto(`/?chr=chr17&start=7661778&end=7687490&bigwig=${encodeURIComponent(TEST_BIGWIG_URL)}`);

		// Wait for BigWig data
		await expect(page.getByText(/[\d,]+ features/).first()).toBeVisible({ timeout: 30000 });

		// Navigate to different region
		const coordInput = page.locator('input[type="text"]').first();
		await coordInput.fill('chr17:8000000-8100000');
		await page.keyboard.press('Enter');

		// Wait for data at new location
		await page.waitForTimeout(2000);

		// Return to original position
		await coordInput.fill('chr17:7661778-7687490');
		await page.keyboard.press('Enter');

		// Wait for data to reload
		await page.waitForTimeout(2000);

		// Should show features again
		await expect(page.getByText(/[\d,]+ features/).first()).toBeVisible({ timeout: 30000 });
	});
});
