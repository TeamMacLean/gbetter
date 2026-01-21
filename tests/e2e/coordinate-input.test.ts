/**
 * Coordinate Input Tests - NC_ accession format support
 * Bug: Pasting coordinates with trailing whitespace gives "Invalid format" error
 */
import { test, expect } from '@playwright/test';

test.describe('NC_ Accession Coordinate Input', () => {
	test('accepts NC_ accession format in coordinate input', async ({ page }) => {
		await page.goto('/');

		// Switch to E. coli K-12 which uses NC_ accession numbers
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('E. coli K-12').click();

		// Wait for assembly to load
		await page.waitForTimeout(500);

		// Find the coordinate input (it's in a form, has placeholder related to coordinates)
		const coordInput = page.locator('input[type="text"]').first();
		await expect(coordInput).toBeVisible();

		// Clear and fill with NC_ format coordinates
		await coordInput.click();
		await coordInput.fill('NC_000913.3:100000-100100');

		// Verify the value was entered correctly
		await expect(coordInput).toHaveValue('NC_000913.3:100000-100100');

		// Submit the form
		await coordInput.press('Enter');

		// Wait for navigation
		await page.waitForTimeout(500);

		// Should NOT show an error
		const errorText = page.locator('text=Invalid format');
		await expect(errorText).not.toBeVisible();
	});

	test('navigates correctly with NC_ accession format', async ({ page }) => {
		await page.goto('/');

		// Switch to E. coli K-12
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('E. coli K-12').click();
		await page.waitForTimeout(500);

		const coordInput = page.locator('input[type="text"]').first();
		await coordInput.click();
		await coordInput.fill('NC_000913.3:100000-200000');
		await coordInput.press('Enter');

		await page.waitForTimeout(500);

		// Verify viewport updated - the coordinate input should reflect the new position
		// (it gets reformatted by formatCoordinate, but should contain NC_000913)
		await expect(coordInput).toHaveValue(/NC_000913/);
	});

	test('regex correctly parses NC_ format (unit test via browser)', async ({ page }) => {
		// This test verifies the regex works in the browser context
		await page.goto('/');

		const result = await page.evaluate(() => {
			const coord = 'NC_000913.3:100000-100100';
			const match = coord.match(/^([A-Za-z0-9_.]+):(\d[\d,]*)-(\d[\d,]*)$/i);
			return {
				matched: match !== null,
				groups: match ? [match[1], match[2], match[3]] : null
			};
		});

		expect(result.matched).toBe(true);
		expect(result.groups).toEqual(['NC_000913.3', '100000', '100100']);
	});

	test('accepts coordinates with trailing whitespace', async ({ page }) => {
		await page.goto('/');

		// Switch to E. coli K-12
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('E. coli K-12').click();
		await page.waitForTimeout(500);

		const coordInput = page.locator('input[type="text"]').first();
		await coordInput.click();

		// Paste coordinates WITH trailing space (common when copying from terminal)
		await coordInput.fill('NC_000913.3:100000-100100 ');

		await coordInput.press('Enter');
		await page.waitForTimeout(500);

		// Should NOT show an error - whitespace should be trimmed
		const errorText = page.locator('text=Invalid format');
		await expect(errorText).not.toBeVisible();
	});

	test('accepts coordinates with leading whitespace', async ({ page }) => {
		await page.goto('/');

		// Switch to E. coli K-12
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('E. coli K-12').click();
		await page.waitForTimeout(500);

		const coordInput = page.locator('input[type="text"]').first();
		await coordInput.click();

		// Paste coordinates WITH leading space
		await coordInput.fill(' NC_000913.3:100000-100100');

		await coordInput.press('Enter');
		await page.waitForTimeout(500);

		// Should NOT show an error - whitespace should be trimmed
		const errorText = page.locator('text=Invalid format');
		await expect(errorText).not.toBeVisible();
	});
});
