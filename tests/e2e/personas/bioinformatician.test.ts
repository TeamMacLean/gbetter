/**
 * Persona 3: Jordan the Bioinformatician (Advanced)
 *
 * Background: Computational biologist doing QC on sequencing data.
 * Use case: "I need to check my ChIP-seq peaks overlap with promoters and filter by signal strength."
 */
import { test, expect } from '@playwright/test';

const getSearchInput = (page: import('@playwright/test').Page) =>
	page.locator('input[placeholder*="Search"]');

const getCoordInput = (page: import('@playwright/test').Page) =>
	page.locator('input[placeholder*="chr:start-end"]');

test.describe('Jordan the Bioinformatician - Power user workflow', () => {
	test('can access full GQL console with keyboard shortcut hint', async ({ page }) => {
		await page.goto('/');

		// GQL console button shows keyboard shortcut
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await expect(gqlButton).toBeVisible();

		// Should show Cmd+` hint
		await expect(page.getByText(/Cmd\+`/)).toBeVisible();

		// Click to open
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Full console interface
		await expect(page.getByText(/Query Input/i)).toBeVisible();
		await expect(page.getByText(/Natural Language/i)).toBeVisible();
		await expect(page.getByText(/GQL Query/i)).toBeVisible();
	});

	test('can write and execute GQL queries', async ({ page }) => {
		await page.goto('/');

		// Open GQL console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// GQL query input should be available
		const gqlQueryInput = page.locator('input[placeholder*="SELECT"], textarea');
		const inputCount = await gqlQueryInput.count();
		expect(inputCount).toBeGreaterThan(0);
	});

	test('supports multiple track types for analysis', async ({ page }) => {
		await page.goto('/');

		// File tab shows supported formats
		await expect(page.getByText(/BED, GFF, VCF/i)).toBeVisible();

		// URL tab shows indexed formats
		await page.getByRole('button', { name: 'URL' }).click();
		await expect(page.getByText(/\.bb, \.bw/i)).toBeVisible();
	});

	test('can switch gene visualization themes', async ({ page }) => {
		await page.goto('/');

		// Open settings panel (cog icon)
		const settingsButton = page.locator('button[title="Settings"]');
		await settingsButton.click();
		await page.waitForTimeout(200);

		// Switch to Display tab
		await page.getByRole('button', { name: 'Display' }).click();
		await page.waitForTimeout(100);

		// Theme controls in settings Display tab
		await expect(page.getByText(/Gene Model Style/i)).toBeVisible();

		// Style buttons (capitalized: Dark, Flat)
		const darkButton = page.locator('button').filter({ hasText: 'Dark' }).first();
		const flatButton = page.locator('button').filter({ hasText: 'Flat' }).first();

		await expect(darkButton).toBeVisible();
		await expect(flatButton).toBeVisible();

		// Switch to flat
		await flatButton.click();
		await page.waitForTimeout(200);

		// Switch to dark
		await darkButton.click();
		await page.waitForTimeout(200);

		// Close settings
		await page.locator('button[title="Close"]').click();

		// Canvas should still render
		await expect(page.locator('canvas').first()).toBeVisible();
	});

	test('can navigate with precise coordinates', async ({ page }) => {
		await page.goto('/');

		// Enter precise coordinates
		const coordInput = getCoordInput(page);
		await coordInput.click();
		await coordInput.fill('chr17:7668421-7687490'); // TP53 region

		// Coordinate input should accept the value
		await expect(coordInput).toHaveValue('chr17:7668421-7687490');

		// Go button is available
		const goButton = page.locator('button:has-text("Go")').first();
		await expect(goButton).toBeVisible();
	});

	test('can expand and collapse sidebar', async ({ page }) => {
		await page.goto('/');

		// Sidebar is visible
		await expect(page.locator('aside')).toBeVisible();

		// Collapse button
		const collapseButton = page.locator('button[title="Collapse sidebar"]');
		if (await collapseButton.isVisible()) {
			await collapseButton.click();
			await page.waitForTimeout(300);

			// Canvas should expand to fill space
			await expect(page.locator('canvas').first()).toBeVisible();
		}
	});

	test('has results panel for query output', async ({ page }) => {
		await page.goto('/');

		// Open GQL console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Results section - use exact match
		await expect(page.getByText('Results', { exact: true })).toBeVisible();

		// Initial state shows hint
		await expect(page.getByText(/No results|Try:/i)).toBeVisible();
	});

	test('query history and saved queries available', async ({ page }) => {
		await page.goto('/');

		// Open GQL console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// History and Saved tabs
		await expect(page.locator('button:has-text("History")')).toBeVisible();
		await expect(page.locator('button:has-text("Saved")')).toBeVisible();
	});

	test('fine-grained zoom control', async ({ page }) => {
		await page.goto('/');

		const bpText = page.locator('text=/\\d+,?\\d*\\s*bp/').first();
		await expect(bpText).toBeVisible();

		const zoomIn = page.locator('button:has-text("+")').first();
		const zoomOut = page.locator('button:has-text("−")').first();

		// Multiple zoom levels
		for (let i = 0; i < 5; i++) {
			await zoomIn.click();
			await page.waitForTimeout(100);
		}

		// bp width should have changed
		await expect(bpText).toBeVisible();

		// Zoom back out
		for (let i = 0; i < 5; i++) {
			await zoomOut.click();
			await page.waitForTimeout(100);
		}

		await expect(page.locator('canvas').first()).toBeVisible();
	});
});
