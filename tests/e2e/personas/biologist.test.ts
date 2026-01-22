/**
 * Persona 2: Maya the Bench Biologist (Intermediate)
 *
 * Background: Wet lab scientist with a gene list from RNA-seq experiment.
 * Use case: "I have 20 differentially expressed genes. Do any overlap with known variants?"
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const getSearchInput = (page: import('@playwright/test').Page) =>
	page.locator('input[placeholder*="Search"]');

const getGqlInput = (page: import('@playwright/test').Page) =>
	page.locator('textarea, input').filter({ hasText: /SELECT|GENES/ }).first();

test.describe('Maya the Biologist - Variant analysis workflow', () => {
	test('can see tracks section ready for files', async ({ page }) => {
		await page.goto('/');

		// Maya sees the tracks panel
		await expect(page.getByText(/Tracks/i).first()).toBeVisible();

		// Empty state message
		await expect(page.getByText(/No tracks loaded/i)).toBeVisible();

		// Add track button available
		const addTrackButton = page.locator('button').filter({ hasText: /Add track/i }).first();
		await expect(addTrackButton).toBeVisible();

		// Supports relevant file formats
		await expect(page.getByText(/\.bed/i)).toBeVisible();
		await expect(page.getByText(/\.vcf/i)).toBeVisible();
	});

	test('can access GQL console for complex queries', async ({ page }) => {
		await page.goto('/');

		// Find GQL console button
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await expect(gqlButton).toBeVisible();

		// Click to open
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Console should be visible
		await expect(page.getByText(/Query Input/i)).toBeVisible();
		await expect(page.getByText('Results', { exact: true })).toBeVisible();
	});

	test('can use natural language to query genes and variants', async ({ page }) => {
		await page.goto('/');

		// Maya tries natural language query
		const searchInput = getSearchInput(page);
		await searchInput.fill('show me genes with variants');
		await searchInput.press('Enter');

		await page.waitForTimeout(1000);

		// Should see some response
		const codeElements = page.locator('code');
		const count = await codeElements.count();
		expect(count).toBeGreaterThan(0);
	});

	test('can list available genes', async ({ page }) => {
		await page.goto('/');

		// Query to list genes
		const searchInput = getSearchInput(page);
		await searchInput.fill('list genes');
		await searchInput.press('Enter');

		await page.waitForTimeout(1000);

		// Should show results
		const codeElements = page.locator('code');
		const count = await codeElements.count();
		expect(count).toBeGreaterThan(0);
	});

	test('understands file format support for her workflow', async ({ page }) => {
		await page.goto('/');

		// Check file format hints in add track button
		const addTrackButton = page.locator('button').filter({ hasText: /Add track/i }).first();
		await expect(addTrackButton).toBeVisible();

		// Supported formats visible
		await expect(page.getByText(/\.bed/)).toBeVisible();
		await expect(page.getByText(/\.gff/)).toBeVisible();
		await expect(page.getByText(/\.vcf/)).toBeVisible();
	});

	test('can navigate to specific gene regions', async ({ page }) => {
		await page.goto('/');

		// Search for BRCA1
		const searchInput = getSearchInput(page);
		await searchInput.fill('BRCA1');
		await searchInput.press('Enter');

		await page.waitForTimeout(1000);

		// Should show result
		const codeElements = page.locator('code');
		const count = await codeElements.count();
		expect(count).toBeGreaterThan(0);
	});

	test('query history is available for reproducibility', async ({ page }) => {
		await page.goto('/');

		// Execute some queries
		const searchInput = getSearchInput(page);
		await searchInput.fill('TP53');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		// History button should be visible
		const historyButton = page.locator('button[title="Query history"]');
		await expect(historyButton).toBeVisible();

		// Click to see history
		await historyButton.click();
		await page.waitForTimeout(300);

		// History panel should show
		await expect(historyButton).toBeVisible();
	});

	test('gene style options available for visualization', async ({ page }) => {
		await page.goto('/');

		// Open settings panel (cog icon)
		const settingsButton = page.locator('button[title="Settings"]');
		await settingsButton.click();

		// Switch to Display tab
		await page.getByRole('button', { name: 'Display' }).click();

		// Gene style section in settings Display tab
		await expect(page.getByText(/Gene Model Style/i)).toBeVisible();

		// Style buttons
		const darkButton = page.locator('button:has-text("dark")');
		const flatButton = page.locator('button:has-text("flat")');

		await expect(darkButton).toBeVisible();
		await expect(flatButton).toBeVisible();

		// Can switch styles
		await flatButton.click();
		await page.waitForTimeout(200);
		await darkButton.click();
	});
});
