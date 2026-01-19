/**
 * Pan Data Loading Test
 *
 * This test captures the bug where mouse panning doesn't load new data.
 * Unlike other tests that use coordinate input, this uses actual mouse
 * drag events to replicate user behavior.
 *
 * EXPECTED: This test should FAIL until the bug is fixed.
 */
import { test, expect } from '@playwright/test';

test.describe('Mouse Pan Data Loading', () => {
	/**
	 * Helper to perform a mouse drag on the canvas
	 */
	async function dragCanvas(
		page: import('@playwright/test').Page,
		startX: number,
		endX: number,
		y: number = 200
	) {
		const canvas = page.locator('canvas');
		const box = await canvas.boundingBox();
		if (!box) throw new Error('Canvas not found');

		const absStartX = box.x + startX;
		const absEndX = box.x + endX;
		const absY = box.y + y;

		await page.mouse.move(absStartX, absY);
		await page.mouse.down();
		// Move in steps to simulate real drag
		const steps = 10;
		for (let i = 1; i <= steps; i++) {
			const x = absStartX + ((absEndX - absStartX) * i) / steps;
			await page.mouse.move(x, absY);
			await page.waitForTimeout(10);
		}
		await page.mouse.up();
	}

	test('panning loads new data in different genomic region', async ({ page }) => {
		// Start at TP53 region on chr17
		await page.goto('/?chr=chr17&start=7661778&end=7687490');

		// Wait for initial transcript data to load - must have NON-ZERO features
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 15000 });

		// Wait until we have actual features loaded (not just "0 features")
		// This is critical - we need to ensure initial data is present before panning
		await expect(async () => {
			const text = await page.getByText(/[\d,]+ features/).first().textContent();
			const count = parseInt(text?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');
			expect(count).toBeGreaterThan(0);
		}).toPass({ timeout: 20000 });

		const featureText = page.getByText(/[\d,]+ features/);

		// Get the initial feature count (now guaranteed > 0)
		const initialText = await featureText.first().textContent();
		const initialCount = parseInt(initialText?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');
		console.log(`Initial feature count: ${initialCount}`);
		expect(initialCount).toBeGreaterThan(0);

		// Get initial viewport position from URL or page state
		const initialUrl = page.url();
		const initialMatch = initialUrl.match(/start=(\d+)/);
		const initialStart = initialMatch ? parseInt(initialMatch[1]) : 7661778;
		console.log(`Initial start position: ${initialStart}`);

		// Perform multiple pan drags to move FAR from the initial region
		// Each drag moves left (dragging right to left shifts viewport right)
		// We want to move ~10Mb away to be in a completely different region
		const canvasWidth = 800; // approximate
		for (let i = 0; i < 20; i++) {
			await dragCanvas(page, canvasWidth - 100, 100); // Drag from right to left
			await page.waitForTimeout(50);
		}

		// Wait for debounce (150ms) + network fetch + render
		await page.waitForTimeout(2000);

		// Verify we actually moved by checking URL
		const newUrl = page.url();
		const newMatch = newUrl.match(/start=(\d+)/);
		const newStart = newMatch ? parseInt(newMatch[1]) : 0;
		console.log(`New start position: ${newStart}`);

		// We should have moved significantly (at least 100kb)
		const distanceMoved = Math.abs(newStart - initialStart);
		console.log(`Distance moved: ${distanceMoved} bp`);
		expect(distanceMoved).toBeGreaterThan(100000);

		// THE CRITICAL CHECK: Features should have been re-fetched for the new region
		// This is where the bug manifests - the feature count stays the same
		// because new data isn't being loaded
		await expect(featureText.first()).toBeVisible({ timeout: 15000 });

		// Get the new feature count after panning
		const newText = await featureText.first().textContent();
		const newCount = parseInt(newText?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');
		console.log(`New feature count: ${newCount}`);

		// The feature count should be DIFFERENT because we're in a different region
		// (It could be higher, lower, or even zero - just not the same)
		// If it's the same, that's suspicious and likely the bug
		//
		// Note: There's a small chance they could legitimately be the same,
		// but statistically across different genomic regions, this is unlikely
		//
		// A more robust check: verify features were actually fetched by checking
		// that at least ONE fetch happened after pan stopped
		expect(newCount).not.toBe(initialCount);
	});

	test('rapid panning eventually loads correct data', async ({ page }) => {
		// Start at a known region
		await page.goto('/?chr=chr17&start=7661778&end=7687490');

		// Wait for initial data with actual features (not 0)
		await expect(async () => {
			const text = await page.getByText(/[\d,]+ features/).first().textContent();
			const count = parseInt(text?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');
			expect(count).toBeGreaterThan(0);
		}).toPass({ timeout: 20000 });

		// Perform rapid continuous panning (stress test)
		const canvas = page.locator('canvas');
		const box = await canvas.boundingBox();
		if (!box) throw new Error('Canvas not found');

		// Rapid panning - many small drags in quick succession
		for (let i = 0; i < 30; i++) {
			await page.mouse.move(box.x + 400, box.y + 200);
			await page.mouse.down();
			await page.mouse.move(box.x + 200, box.y + 200, { steps: 3 });
			await page.mouse.up();
			// No wait between - stress the debounce
		}

		// Now wait for everything to settle
		await page.waitForTimeout(3000);

		// Verify the URL reflects the new position
		const url = page.url();
		expect(url).toMatch(/start=\d+/);

		// Features should be visible (not blank)
		// The actual count doesn't matter - just that data loaded
		await expect(page.getByText(/[\d,]+ features/).first()).toBeVisible({ timeout: 15000 });
	});

	test('pan then return shows data at original position', async ({ page }) => {
		// Start at TP53
		await page.goto('/?chr=chr17&start=7661778&end=7687490');

		// Wait for initial data with actual features (not 0)
		await expect(async () => {
			const text = await page.getByText(/[\d,]+ features/).first().textContent();
			const count = parseInt(text?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');
			expect(count).toBeGreaterThan(0);
		}).toPass({ timeout: 20000 });

		const featureText = page.getByText(/[\d,]+ features/);
		const initialText = await featureText.first().textContent();
		const initialCount = parseInt(initialText?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');

		// Pan far away
		for (let i = 0; i < 15; i++) {
			await dragCanvas(page, 600, 200);
			await page.waitForTimeout(30);
		}

		// Wait for data to load at new position
		await page.waitForTimeout(2000);

		// Pan back (opposite direction)
		for (let i = 0; i < 15; i++) {
			await dragCanvas(page, 200, 600);
			await page.waitForTimeout(30);
		}

		// Wait for data to reload at original position
		await page.waitForTimeout(2000);

		// Should show similar feature count as initially
		// (We moved away and came back, so we're approximately at the same place)
		await expect(featureText.first()).toBeVisible({ timeout: 15000 });
		const returnText = await featureText.first().textContent();
		const returnCount = parseInt(returnText?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');

		// The counts should be in a similar range (allow for some drift in position)
		// If the bug exists, returnCount might be from the "away" position, not the return
		console.log(`Initial: ${initialCount}, After return: ${returnCount}`);

		// At minimum, we should have SOME data (not blank)
		expect(returnCount).toBeGreaterThan(0);
	});
});
