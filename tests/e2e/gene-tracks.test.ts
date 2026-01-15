/**
 * Gene Track Tests - Verify BigBed gene track loading and display
 * Tests that gene tracks load automatically and appear in the sidebar
 *
 * Note: UCSC assemblies (GRCh38, hg38, etc.) only have transcript-level data,
 * so they only show a Transcripts track. R2-hosted assemblies (TAIR10, etc.)
 * have separate gene-level files, so they show both Genes and Transcripts tracks.
 */
import { test, expect } from '@playwright/test';

test.describe('Gene Track Loading', () => {
	test('transcript track appears in sidebar on page load for GRCh38', async ({ page }) => {
		await page.goto('/');

		// GRCh38 uses UCSC knownGene.bb which only has transcript-level data
		// So only Transcripts track appears (no separate Genes track for UCSC)
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });
	});

	test('GRCh38 shows only one track (UCSC only has transcript data)', async ({ page }) => {
		await page.goto('/');

		// Wait for track to load
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		// Should only show 1 track for UCSC assemblies (no gene-level data available)
		await expect(page.getByText(/Tracks \(1\)/)).toBeVisible();
	});

	test('TAIR10 shows both genes and transcript tracks', async ({ page }) => {
		await page.goto('/');
		await page.waitForTimeout(500);

		// Switch to TAIR10 (R2-hosted with separate gene-level file)
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('TAIR10').click();

		// Wait for both tracks to load
		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		// Should show 2 tracks for R2 assemblies
		await expect(page.getByText(/Tracks \(2\)/)).toBeVisible();
	});

	test('transcript track has visibility toggle', async ({ page }) => {
		await page.goto('/');

		// Wait for transcript track
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		// The track item contains a visibility toggle button
		const sidebar = page.locator('aside');
		await expect(sidebar.locator('button[title="Hide track"]').first()).toBeVisible();
	});

	test('tracks show loading state then feature count', async ({ page }) => {
		await page.goto('/');

		// Wait for track to appear
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		// Eventually should show feature count (not "Loading...")
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });
	});

	test('tracks show BIGBED type', async ({ page }) => {
		await page.goto('/');

		// Wait for track
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		// Should show the track type
		await expect(page.getByText('BIGBED').first()).toBeVisible();
	});
});

test.describe('Track Visibility Toggle', () => {
	test('clicking visibility toggle changes track state', async ({ page }) => {
		await page.goto('/');

		// Wait for transcript track to load
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		const sidebar = page.locator('aside');
		const toggleButton = sidebar.locator('button[title="Hide track"]').first();
		await expect(toggleButton).toBeVisible();

		// Click to hide
		await toggleButton.click();
		await page.waitForTimeout(100);

		// Should now show "Show track"
		await expect(sidebar.locator('button[title="Show track"]').first()).toBeVisible();
	});

	test('each toggle controls its own track independently (TAIR10)', async ({ page }) => {
		await page.goto('/');
		await page.waitForTimeout(500);

		// Switch to TAIR10 which has both Genes and Transcripts tracks
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('TAIR10').click();

		await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

		const sidebar = page.locator('aside');

		// Both should start visible
		let visibleToggles = sidebar.locator('button[title="Hide track"]');
		expect(await visibleToggles.count()).toBe(2);

		// Click first toggle (Genes) - should hide Genes track
		await visibleToggles.nth(0).click();
		await page.waitForTimeout(100);

		// Check which track is hidden
		const hiddenAfterFirst = sidebar.locator('button[title="Show track"]').locator('..').locator('..');
		const hiddenTextFirst = await hiddenAfterFirst.textContent();
		expect(hiddenTextFirst).toContain('Genes');

		// Reset
		await sidebar.locator('button[title="Show track"]').click();
		await page.waitForTimeout(100);

		// Click second toggle (Transcripts) - should hide Transcripts track
		visibleToggles = sidebar.locator('button[title="Hide track"]');
		await visibleToggles.nth(1).click();
		await page.waitForTimeout(100);

		const hiddenAfterSecond = sidebar.locator('button[title="Show track"]').locator('..').locator('..');
		const hiddenTextSecond = await hiddenAfterSecond.textContent();
		expect(hiddenTextSecond).toContain('Transcripts');
	});
});

test.describe('Assembly Switching', () => {
	test('switching to TAIR10 loads plant gene and transcript tracks', async ({ page }) => {
		await page.goto('/');

		// Wait for initial load (GRCh38 only has Transcripts)
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

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

		// Wait for initial track (GRCh38 only has Transcripts)
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/\d+ features/).first()).toBeVisible({ timeout: 15000 });

		// Switch assembly to TAIR10
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('TAIR10').click();

		// Wait for new features to load (TAIR10 has both Genes and Transcripts)
		await page.waitForTimeout(2000);
		await expect(page.getByText('Genes').first()).toBeVisible();
		await expect(page.getByText('Transcripts').first()).toBeVisible();
	});

	test('bacteria assembly only shows genes (no transcripts)', async ({ page }) => {
		await page.goto('/');

		// Wait for initial load
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });

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
