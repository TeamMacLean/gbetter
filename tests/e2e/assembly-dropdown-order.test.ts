/**
 * Assembly Dropdown Order Tests - Verify taxonomic sorting with category headers
 * Tests that categories and species groups appear in correct taxonomic order
 */
import { test, expect } from '@playwright/test';

test.describe('Assembly Dropdown Order', () => {
	test('category headers appear in taxonomic order', async ({ page }) => {
		await page.goto('/');

		// Click the assembly dropdown button (shows current assembly name)
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human|hg/i }).first();
		await assemblyButton.click();

		// Wait for dropdown to appear
		const dropdown = page.locator('.absolute.top-full');
		await expect(dropdown).toBeVisible();

		// Get all category headers (uppercase, bold, accent color)
		const categoryHeaders = dropdown.locator('div.uppercase.font-bold');
		const categoryTexts = await categoryHeaders.allTextContents();

		// Define expected category order
		const expectedCategories = [
			'Animals',
			'Plants',
			'Fungi',
			'Protists',
			'Bacteria',
			'Viruses'
		];

		// Verify category order
		expect(categoryTexts.map(s => s.trim().toLowerCase())).toEqual(
			expectedCategories.map(s => s.toLowerCase())
		);
	});

	test('Animals category appears first with Human at top', async ({ page }) => {
		await page.goto('/');

		// Click the assembly dropdown button
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human|hg/i }).first();
		await assemblyButton.click();

		// Wait for dropdown
		const dropdown = page.locator('.absolute.top-full');
		await expect(dropdown).toBeVisible();

		// First category header should be Animals
		const firstCategory = dropdown.locator('div.uppercase.font-bold').first();
		await expect(firstCategory).toContainText(/Animals/i);

		// Human should be the first species under Animals
		const firstSpecies = dropdown.locator('div.bg-\\[var\\(--color-bg-secondary\\)\\]').first();
		await expect(firstSpecies).toContainText(/Human/i);
	});

	test('Animals come before Plants in dropdown', async ({ page }) => {
		await page.goto('/');

		// Click the assembly dropdown button
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human|hg/i }).first();
		await assemblyButton.click();

		const dropdown = page.locator('.absolute.top-full');
		await expect(dropdown).toBeVisible();

		// Get all category headers
		const categoryHeaders = dropdown.locator('div.uppercase.font-bold');
		const categoryTexts = await categoryHeaders.allTextContents();

		// Find indices
		const animalsIndex = categoryTexts.findIndex(s => /Animals/i.test(s));
		const plantsIndex = categoryTexts.findIndex(s => /Plants/i.test(s));

		// Animals should come before Plants
		expect(animalsIndex).toBeLessThan(plantsIndex);
	});

	test('Plants come before Fungi in dropdown', async ({ page }) => {
		await page.goto('/');

		// Click the assembly dropdown button
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human|hg/i }).first();
		await assemblyButton.click();

		const dropdown = page.locator('.absolute.top-full');
		await expect(dropdown).toBeVisible();

		// Get all category headers
		const categoryHeaders = dropdown.locator('div.uppercase.font-bold');
		const categoryTexts = await categoryHeaders.allTextContents();

		// Find indices
		const plantsIndex = categoryTexts.findIndex(s => /Plants/i.test(s));
		const fungiIndex = categoryTexts.findIndex(s => /Fungi/i.test(s));

		// Plants should come before Fungi
		expect(plantsIndex).toBeLessThan(fungiIndex);
	});

	test('Bacteria and Viruses come last in dropdown', async ({ page }) => {
		await page.goto('/');

		// Click the assembly dropdown button
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human|hg/i }).first();
		await assemblyButton.click();

		const dropdown = page.locator('.absolute.top-full');
		await expect(dropdown).toBeVisible();

		// Get all category headers
		const categoryHeaders = dropdown.locator('div.uppercase.font-bold');
		const categoryTexts = await categoryHeaders.allTextContents();

		// Find indices for the last two categories
		const bacteriaIndex = categoryTexts.findIndex(s => /Bacteria/i.test(s));
		const virusesIndex = categoryTexts.findIndex(s => /Viruses/i.test(s));

		// Bacteria should be second to last
		expect(bacteriaIndex).toBe(categoryTexts.length - 2);
		// Viruses should be last
		expect(virusesIndex).toBe(categoryTexts.length - 1);
	});
});
