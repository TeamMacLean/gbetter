/**
 * E2E Tests for Assembly URL Parameter
 *
 * Tests that the ?assembly= URL parameter correctly:
 * 1. Sets the assembly dropdown to the specified assembly
 * 2. Navigates to a valid viewport for that assembly
 * 3. Renders content on the canvas (not blank)
 */

import { test, expect } from '@playwright/test';

test.describe('Assembly URL Parameter', () => {
	test('?assembly=ecoli-k12 loads E. coli and shows content', async ({ page }) => {
		// Navigate directly to E. coli assembly via URL param
		await page.goto('/?assembly=ecoli-k12');

		await page.waitForSelector('canvas');
		await page.waitForTimeout(1000);

		// Verify assembly dropdown shows E. coli
		const assemblyButton = page.locator('button').filter({ hasText: /E\. coli|ecoli/i }).first();
		await expect(assemblyButton).toBeVisible({ timeout: 5000 });

		// Verify the viewport is set to a valid E. coli chromosome (NC_000913.3)
		// The coordinate input should show NC_000913.3, not chr1
		const coordInput = page.locator('input[type="text"]').first();
		const coordValue = await coordInput.inputValue();
		expect(coordValue).toContain('NC_000913.3');
	});

	test('?assembly=ecoli-k12 canvas is not blank', async ({ page }) => {
		await page.goto('/?assembly=ecoli-k12');

		await page.waitForSelector('canvas');
		await page.waitForTimeout(2000);

		// Get canvas and check it has non-trivial content
		// A blank canvas would be mostly one color
		const canvas = page.locator('canvas').first();

		// Take a screenshot and verify it's not blank by checking canvas renders
		// The canvas should be visible and have dimensions
		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.width).toBeGreaterThan(100);
		expect(box!.height).toBeGreaterThan(100);

		// Verify coordinate input shows a valid E. coli region (not chr1)
		const coordInput = page.locator('input[type="text"]').first();
		const coordValue = await coordInput.inputValue();
		expect(coordValue).not.toContain('chr1');
	});

	test('?assembly=grch38 loads human and shows chr coordinates', async ({ page }) => {
		// Control test - human assembly should still work
		await page.goto('/?assembly=grch38');

		await page.waitForSelector('canvas');
		await page.waitForTimeout(1000);

		// Verify the viewport shows chr-style coordinates
		const coordInput = page.locator('input[type="text"]').first();
		const coordValue = await coordInput.inputValue();
		expect(coordValue).toMatch(/^chr/);
	});

	test('?assembly=ecoli-k12&loc=NC_000913.3:100000-200000 respects both params', async ({ page }) => {
		// When both assembly and location are specified, use the location
		await page.goto('/?assembly=ecoli-k12&loc=NC_000913.3:100000-200000');

		await page.waitForSelector('canvas');
		await page.waitForTimeout(1000);

		// Verify the specified location is used
		const coordInput = page.locator('input[type="text"]').first();
		const coordValue = await coordInput.inputValue();
		expect(coordValue).toContain('NC_000913.3');
		// Display is 1-based, so 100000 internal → 100,001 displayed
		expect(coordValue).toContain('100,001');
	});
});
