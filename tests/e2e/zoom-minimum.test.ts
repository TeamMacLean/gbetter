/**
 * Zoom Minimum Tests - Verify zoom can go below 100bp
 * Tests that zoom buttons and coordinate input allow sub-100bp viewports
 */
import { test, expect } from '@playwright/test';

// Helper to get the coordinate input
const getCoordInput = (page: import('@playwright/test').Page) =>
	page.locator('input[placeholder*="chr:start-end"]');

// Helper to get viewport width in bp from URL
const getViewportWidthFromURL = async (page: import('@playwright/test').Page) => {
	const url = new URL(page.url());
	const start = parseInt(url.searchParams.get('start') || '0');
	const end = parseInt(url.searchParams.get('end') || '0');
	return end - start;
};

test.describe('Zoom Minimum Limit', () => {
	test('coordinate input accepts viewport under 100bp', async ({ page }) => {
		await page.goto('/');

		const coordInput = getCoordInput(page);
		await expect(coordInput).toBeVisible();

		// Navigate to a ~50bp viewport (under 100bp minimum)
		// Using 1-based display coordinates: 7668421-7668470 = 50 bases (inclusive)
		// Internal 0-based: start=7668420, end=7668470 = 50bp
		await coordInput.click();
		await coordInput.fill('chr17:7668421-7668470');
		await coordInput.press('Enter');

		// Wait for URL update
		await page.waitForTimeout(500);

		// Verify the viewport is under 100bp (50bp expected)
		const width = await getViewportWidthFromURL(page);
		expect(width).toBeLessThan(100);
		expect(width).toBe(50);
	});

	test('coordinate input accepts very small viewport (10bp)', async ({ page }) => {
		await page.goto('/');

		const coordInput = getCoordInput(page);
		await coordInput.click();
		// 1-based: 7668421-7668430 = 10 bases inclusive
		// Internal: start=7668420, end=7668430 = 10bp
		await coordInput.fill('chr17:7668421-7668430');
		await coordInput.press('Enter');

		await page.waitForTimeout(500);

		// Verify the viewport is 10bp
		const width = await getViewportWidthFromURL(page);
		expect(width).toBe(10);
	});

	test('zoom in button allows viewport below 100bp', async ({ page }) => {
		// Start at a small viewport (200bp) so zoom in can get below 100bp
		await page.goto('/?chr=chr17&start=7668421&end=7668621');

		const zoomIn = page.locator('button:has-text("+")').first();
		await expect(zoomIn).toBeVisible();

		// Click zoom in - should halve the viewport to 100bp
		await zoomIn.click();
		await page.waitForTimeout(300);

		let width = await getViewportWidthFromURL(page);
		expect(width).toBe(100);

		// Click zoom in again - should halve to 50bp (below old minimum)
		await zoomIn.click();
		await page.waitForTimeout(300);

		width = await getViewportWidthFromURL(page);
		expect(width).toBe(50);
	});

	test('can zoom to single-base resolution via buttons', async ({ page }) => {
		// Start at 16bp so we can zoom in multiple times
		await page.goto('/?chr=chr17&start=7668421&end=7668437');

		const zoomIn = page.locator('button:has-text("+")').first();

		// Click zoom in: 16bp -> 8bp
		await zoomIn.click();
		await page.waitForTimeout(300);

		let width = await getViewportWidthFromURL(page);
		expect(width).toBe(8);

		// Click zoom in: 8bp -> 4bp
		await zoomIn.click();
		await page.waitForTimeout(300);

		width = await getViewportWidthFromURL(page);
		expect(width).toBe(4);

		// Click zoom in: 4bp -> 2bp
		await zoomIn.click();
		await page.waitForTimeout(300);

		width = await getViewportWidthFromURL(page);
		expect(width).toBe(2);

		// Click zoom in: 2bp -> 1bp (minimum)
		await zoomIn.click();
		await page.waitForTimeout(300);

		width = await getViewportWidthFromURL(page);
		expect(width).toBe(1);
	});
});
