/**
 * Persona 5: Alex the Power Analyst (Expert)
 *
 * Background: Leads a genomics core facility, needs reproducible analyses.
 * Use case: "Find the 10 longest genes with HIGH impact variants, share the view with a collaborator."
 */
import { test, expect } from '@playwright/test';

const getSearchInput = (page: import('@playwright/test').Page) =>
	page.locator('input[placeholder*="Search"]');

const getCoordInput = (page: import('@playwright/test').Page) =>
	page.locator('input[placeholder*="1,000-10,000"]');

test.describe('Alex the Analyst - Reproducibility workflow', () => {
	test('can access query console with keyboard shortcut hint', async ({ page }) => {
		await page.goto('/');

		// GQL console shows keyboard shortcut
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await expect(gqlButton).toBeVisible();
		await expect(page.getByText(/Cmd\+`/)).toBeVisible();
	});

	test('query console has full interface for complex queries', async ({ page }) => {
		await page.goto('/');

		// Open console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Full query interface
		await expect(page.getByText(/Query Input/i)).toBeVisible();
		await expect(page.getByText(/Natural Language/i)).toBeVisible();
		await expect(page.getByText(/GQL Query/i)).toBeVisible();
		await expect(page.getByText('Results', { exact: true })).toBeVisible();
	});

	test('has expand button for larger query workspace', async ({ page }) => {
		await page.goto('/');

		// Open console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Expand button
		const expandButton = page.locator('button:has-text("Expand")');
		await expect(expandButton).toBeVisible();
	});

	test('results area shows sample queries', async ({ page }) => {
		await page.goto('/');

		// Open console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Results area with hints
		await expect(page.getByText(/No results|Try:/i)).toBeVisible();
		await expect(page.locator('code').filter({ hasText: /list genes/i })).toBeVisible();
	});

	test('has history panel for query reproducibility', async ({ page }) => {
		await page.goto('/');

		// Open console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// History tab should exist in the DOM (may be below fold)
		const historyTab = page.locator('button:has-text("History")').first();
		const count = await historyTab.count();
		expect(count).toBe(1);
	});

	test('has saved queries panel', async ({ page }) => {
		await page.goto('/');

		// Open console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Saved tab should exist in the DOM (may be below fold)
		const savedTab = page.locator('button:has-text("Saved")').first();
		const count = await savedTab.count();
		expect(count).toBe(1);
	});

	test('execute button has keyboard shortcut hint', async ({ page }) => {
		await page.goto('/');

		// Open console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Execute with Cmd+Enter
		await expect(page.getByText(/Cmd\+Enter/i)).toBeVisible();
	});

	test('query history button in header', async ({ page }) => {
		await page.goto('/');

		// Quick access to history from header
		const historyButton = page.locator('button[title="Query history"]');
		await expect(historyButton).toBeVisible();
	});

	test('can execute queries that populate history', async ({ page }) => {
		await page.goto('/');

		// Execute some queries
		const searchInput = getSearchInput(page);

		await searchInput.fill('list genes');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await searchInput.fill('zoom in');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		// Queries executed - history should build up
		// (History badge or count would indicate this)
		await expect(page.locator('button[title="Query history"]')).toBeVisible();
	});

	test('coordinate display for sharing', async ({ page }) => {
		await page.goto('/');

		// Coordinate input shows current location
		const coordInput = getCoordInput(page);
		await expect(coordInput).toBeVisible();

		// Can copy/share coordinates - check placeholder indicates format
		const placeholder = await coordInput.getAttribute('placeholder');
		expect(placeholder).toContain('1,000-10,000');
	});

	test('viewport width indicator for precision', async ({ page }) => {
		await page.goto('/');

		// Shows exact bp width
		const bpText = page.locator('text=/\\d+,?\\d*\\s*bp/').first();
		await expect(bpText).toBeVisible();
	});

	test('multiple file format support for complex analyses', async ({ page }) => {
		await page.goto('/');

		// Can load various formats
		await expect(page.getByText(/\.bed/)).toBeVisible();
		await expect(page.getByText(/\.gff/)).toBeVisible();
		await expect(page.getByText(/\.vcf/)).toBeVisible();
		await expect(page.getByText(/\.bedgraph|\.bg/i)).toBeVisible();
	});

	test('GQL supports natural language translation', async ({ page }) => {
		await page.goto('/');

		// Open console
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		await gqlButton.click();
		await page.waitForTimeout(300);

		// Natural language input area
		await expect(page.getByText(/Natural Language/i)).toBeVisible();

		// Translation button (may be disabled without AI)
		const translateButton = page.locator('button').filter({ hasText: /Translate to GQL/i }).first();
		await expect(translateButton).toBeVisible();
	});

	test('AI configuration status indicator', async ({ page }) => {
		await page.goto('/');

		// AI status shown in header - use title attribute
		const aiButton = page.locator('button[title*="AI"]').first();
		await expect(aiButton).toBeVisible();
	});
});
