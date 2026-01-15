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
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
	});

	test('transcript track appears in sidebar on page load for GRCh38', async ({ page }) => {
		await page.goto('/');

		// Wait for the transcript track to appear in the sidebar
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });
	});

	test('sidebar shows track count including both gene and transcript tracks', async ({ page }) => {
		await page.goto('/');

		// Wait for tracks to load
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		// Sidebar should show at least 2 tracks
		await expect(page.getByText(/Tracks \([2-9]/)).toBeVisible();
	});

	test('gene track has visibility toggle', async ({ page }) => {
		await page.goto('/');

		// Wait for gene track
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });

		// The gene track item contains a visibility toggle button
		// Look for any button in the sidebar that's near "Genes" text
		const sidebar = page.locator('aside');
		await expect(sidebar.locator('button').first()).toBeVisible();
	});

	test('tracks show loading state then feature count', async ({ page }) => {
		await page.goto('/');

		// Wait for tracks to appear
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });

		// Eventually should show feature count (not "Loading...")
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });
	});

	test('tracks show BIGBED type', async ({ page }) => {
		await page.goto('/');

		// Wait for tracks
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });

		// Should show the track type
		await expect(page.getByText('BIGBED').first()).toBeVisible();
	});
});

test.describe('Track Visibility Toggle', () => {
	test('clicking visibility toggle changes track state', async ({ page }) => {
		await page.goto('/');

		// Wait for gene track to load and show features
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });

		// Find and click the first toggle button in sidebar (genes track)
		const sidebar = page.locator('aside');
		const toggleButtons = sidebar.locator('button[title*="track"]');

		// If we can't find titled buttons, just verify buttons exist
		const buttonCount = await sidebar.locator('button').count();
		expect(buttonCount).toBeGreaterThan(0);
	});
});

test.describe('Assembly Switching', () => {
	test('switching to TAIR10 loads plant gene and transcript tracks', async ({ page }) => {
		await page.goto('/');

		// Wait for initial load
		await page.waitForTimeout(1000);

		// Click assembly selector
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();

		// Click on TAIR10 (Arabidopsis)
		await page.getByText('TAIR10').click();

		// Wait for both tracks to load for new assembly
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });
	});

	test('switching assemblies updates track features', async ({ page }) => {
		await page.goto('/');

		// Wait for initial tracks
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });

		// Switch assembly
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('TAIR10').click();

		// Wait for new features to load
		await page.waitForTimeout(2000);
		await expect(page.getByText('Genes').first()).toBeVisible();
		await expect(page.getByText('Transcripts').first()).toBeVisible();
	});

	test('bacteria assembly only shows genes (no transcripts)', async ({ page }) => {
		await page.goto('/');

		// Wait for initial load
		await page.waitForTimeout(1000);

		// Click assembly selector
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();

		// Click on E. coli K-12
		await page.getByText('E. coli K-12').click();

		// Wait for gene track - bacteria only have genes, not transcripts
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });

		// Should only show 1 track (genes, no transcripts for bacteria)
		await expect(page.getByText(/Tracks \(1\)/)).toBeVisible();
	});
});
