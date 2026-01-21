/**
 * BAM Insertion Tooltip Tests
 * Tests that hovering over insertion markers shows a tooltip with inserted bases
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local test files
const BAM_FILE = path.join(__dirname, '../../scripts/bam-test-files/output/cigar-test.bam');
const BAI_FILE = path.join(__dirname, '../../scripts/bam-test-files/output/cigar-test.bam.bai');

// Helper to load BAM track via local file input
async function loadLocalBamTrack(page: import('@playwright/test').Page) {
	await page.getByRole('button', { name: 'File' }).click();
	const fileInput = page.locator('input[data-testid="sidebar-file-input"]');
	await fileInput.setInputFiles([BAM_FILE, BAI_FILE]);
	await expect(page.getByText('cigar-test')).toBeVisible({ timeout: 10000 });
	await page.waitForTimeout(500);
}

// Helper to navigate to insertion region
async function navigateToInsertionRegion(page: import('@playwright/test').Page) {
	const coordInput = page.locator('input[placeholder*="chr:start-end"]');
	await coordInput.fill('NC_000913.3:100050-100080');
	await coordInput.press('Enter');
	await page.waitForTimeout(1000);
}

test.describe('BAM Insertion Tooltip', () => {
	test('shows tooltip when hovering over insertion marker at sequence zoom', async ({ page }) => {
		await page.goto('/');

		// Switch to E. coli assembly
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('E. coli K-12').click();
		await page.waitForTimeout(500);

		await loadLocalBamTrack(page);
		await navigateToInsertionRegion(page);

		const canvas = page.locator('canvas');
		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();

		// The view is 100050-100080 (30bp), insertion is at 100074
		// That's (100074-100050)/30 = 0.8 = 80% of canvas width
		const insertionX = box!.x + Math.round(box!.width * 0.8);

		// Scan near the insertion X position at different Y values
		const yOffsets = [170, 180, 190, 200, 210, 220];
		let tooltipFound = false;

		for (const yOffset of yOffsets) {
			if (tooltipFound) break;
			const scanY = box!.y + yOffset;

			for (let x = insertionX - 20; x <= insertionX + 20; x += 2) {
				await page.mouse.move(x, scanY);
				await page.waitForTimeout(30);

				const tooltip = page.locator('text=/Insertion:/');
				if (await tooltip.isVisible({ timeout: 100 }).catch(() => false)) {
					tooltipFound = true;
					// Verify tooltip content
					await expect(page.locator('text=/Insertion: [ACGT]+/')).toBeVisible();
					await expect(page.locator('text=/\\d+ bp at [\\d,]+/')).toBeVisible();
					break;
				}
			}
		}

		expect(tooltipFound).toBe(true);
	});

	test('tooltip disappears when mouse leaves insertion marker', async ({ page }) => {
		await page.goto('/');

		// Switch to E. coli assembly
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('E. coli K-12').click();
		await page.waitForTimeout(500);

		await loadLocalBamTrack(page);
		await navigateToInsertionRegion(page);

		const canvas = page.locator('canvas');
		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();

		// Go directly to where the insertion should be (80% of canvas width)
		const insertionX = box!.x + Math.round(box!.width * 0.8);
		const yOffsets = [170, 180, 190, 200, 210, 220];
		let tooltipX = -1;

		for (const yOffset of yOffsets) {
			if (tooltipX > 0) break;
			const scanY = box!.y + yOffset;

			for (let x = insertionX - 20; x <= insertionX + 20; x += 2) {
				await page.mouse.move(x, scanY);
				await page.waitForTimeout(30);

				const tooltip = page.locator('text=/Insertion:/');
				if (await tooltip.isVisible({ timeout: 100 }).catch(() => false)) {
					tooltipX = x;
					break;
				}
			}
		}

		// If we found a tooltip, move away and verify it disappears
		if (tooltipX > 0) {
			await page.mouse.move(box!.x + 10, box!.y + 10);
			await page.waitForTimeout(200);
			const tooltip = page.locator('text=/Insertion:/');
			await expect(tooltip).not.toBeVisible();
		}
	});

	test('no tooltip at low zoom (density mode)', async ({ page }) => {
		await page.goto('/');

		// Switch to E. coli assembly
		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
		await assemblyButton.click();
		await page.getByText('E. coli K-12').click();
		await page.waitForTimeout(500);

		await loadLocalBamTrack(page);

		// Navigate to a wide view (low zoom = density mode)
		const coordInput = page.locator('input[placeholder*="chr:start-end"]');
		await coordInput.fill('NC_000913.3:100000-110000');
		await coordInput.press('Enter');
		await page.waitForTimeout(1000);

		const canvas = page.locator('canvas');
		const box = await canvas.boundingBox();
		expect(box).not.toBeNull();

		// Scan where insertions would be if visible (but they're not at this zoom)
		const insertionX = box!.x + Math.round(box!.width * ((100074 - 100000) / 10000));
		const yOffsets = [150, 180, 200, 220];

		for (const yOffset of yOffsets) {
			const scanY = box!.y + yOffset;
			for (let x = insertionX - 50; x <= insertionX + 50; x += 10) {
				await page.mouse.move(x, scanY);
				await page.waitForTimeout(30);

				const tooltip = page.locator('text=/Insertion:/');
				const isVisible = await tooltip.isVisible({ timeout: 50 }).catch(() => false);
				expect(isVisible).toBe(false);
			}
		}
	});
});
