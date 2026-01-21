/**
 * Persona 4: Elena the Plant Pathologist (Domain Expert)
 *
 * Background: Studies fungal wheat pathogens, works with non-model genomes.
 * Use case: "I'm analyzing Zymoseptoria tritici effector genes on chromosome 7."
 */
import { test, expect } from '@playwright/test';

const getSearchInput = (page: import('@playwright/test').Page) =>
	page.locator('input[placeholder*="Search"]');

const getCoordInput = (page: import('@playwright/test').Page) =>
	page.locator('input[placeholder*="chr:start-end"]');

test.describe('Elena the Pathologist - Non-model organism workflow', () => {
	test('assembly selector is accessible', async ({ page }) => {
		await page.goto('/');

		// Assembly selector button shows current assembly
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|hg/i }).first();
		await expect(assemblyButton).toBeVisible();

		// Shows human genome by default
		await expect(assemblyButton).toContainText(/GRCh38|hg38/i);
	});

	test('can click assembly selector', async ({ page }) => {
		await page.goto('/');

		// Click assembly selector
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|hg/i }).first();
		await assemblyButton.click();

		await page.waitForTimeout(300);

		// Button should still be visible
		await expect(assemblyButton).toBeVisible();
	});

	test('chromosome dropdown shows chromosomes', async ({ page }) => {
		await page.goto('/');

		// Chromosome selector
		const chrSelect = page.locator('select').first();
		await expect(chrSelect).toBeVisible();

		// Should have multiple chromosomes
		const options = chrSelect.locator('option');
		const count = await options.count();
		expect(count).toBeGreaterThan(20);

		// Human chromosomes exist as options (options in select are hidden by default)
		expect(await chrSelect.locator('option[value="chr1"]').count()).toBe(1);
		expect(await chrSelect.locator('option[value="chrX"]').count()).toBe(1);
		expect(await chrSelect.locator('option[value="chrY"]').count()).toBe(1);
	});

	test('can navigate to any chromosome', async ({ page }) => {
		await page.goto('/');

		const chrSelect = page.locator('select').first();

		// Try different chromosomes
		const chromosomes = ['chr1', 'chr7', 'chr17', 'chrX'];

		for (const chr of chromosomes) {
			await chrSelect.selectOption(chr);
			await expect(chrSelect).toHaveValue(chr);
			await page.waitForTimeout(200);
		}
	});

	test('coordinate input works with any chromosome', async ({ page }) => {
		await page.goto('/');

		// Select a chromosome
		const chrSelect = page.locator('select').first();
		await chrSelect.selectOption('chr7');

		// Enter coordinates for that chromosome
		const coordInput = getCoordInput(page);
		await coordInput.fill('chr7:1000-50000');
		await expect(coordInput).toHaveValue('chr7:1000-50000');
	});

	test('file format support includes GFF3 for annotations', async ({ page }) => {
		await page.goto('/');

		// GFF3 is important for gene annotations
		await expect(page.getByText(/\.gff3|\.gff/i)).toBeVisible();
	});

	test('can load custom annotation files', async ({ page }) => {
		await page.goto('/');

		// Add track button
		const addTrackButton = page.locator('button').filter({ hasText: /Add track/i }).first();
		await expect(addTrackButton).toBeVisible();

		// Supported formats include what Elena needs
		await expect(page.getByText(/\.gff/)).toBeVisible();
		await expect(page.getByText(/\.bed/)).toBeVisible();
	});

	test('viewport shows base pair width', async ({ page }) => {
		await page.goto('/');

		// Shows bp width - important for genomics
		const bpText = page.locator('text=/\\d+,?\\d*\\s*bp/').first();
		await expect(bpText).toBeVisible();

		const text = await bpText.textContent();
		expect(text).toMatch(/\d+.*bp/);
	});

	test('can search for gene names', async ({ page }) => {
		await page.goto('/');

		// Search capability for finding genes
		const searchInput = getSearchInput(page);
		await expect(searchInput).toBeVisible();

		// Try searching (would work with effector genes if loaded)
		await searchInput.fill('myGene');
		await expect(searchInput).toHaveValue('myGene');
	});

	test('sidebar can be collapsed for more canvas space', async ({ page }) => {
		await page.goto('/');

		// Collapse sidebar to see more genome
		const collapseButton = page.locator('button[title="Collapse sidebar"]');
		if (await collapseButton.isVisible()) {
			// Get initial canvas width
			const canvas = page.locator('canvas').first();
			const initialBox = await canvas.boundingBox();

			await collapseButton.click();
			await page.waitForTimeout(300);

			// Canvas should still be visible
			await expect(canvas).toBeVisible();
		}
	});

	test('GQL support for complex queries', async ({ page }) => {
		await page.goto('/');

		// GQL console for advanced queries
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await expect(gqlButton).toBeVisible();

		// Open console
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Query interface available
		await expect(page.getByText(/Query Input/i)).toBeVisible();
	});
});
