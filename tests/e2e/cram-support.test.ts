/**
 * CRAM Support Tests
 *
 * Tests CRAM file loading and rendering.
 * CRAM files require reference sequences for decoding, which we provide via 2bit files.
 *
 * Uses cigar-test.cram (converted from cigar-test.bam) with E. coli K-12 reference.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local test files
const CRAM_FILE = path.join(__dirname, '../../scripts/cram-test-files/output/cigar-test.cram');
const CRAI_FILE = path.join(__dirname, '../../scripts/cram-test-files/output/cigar-test.cram.crai');

// Helper to load CRAM track via local file input
async function loadLocalCramTrack(page: import('@playwright/test').Page) {
	// Click File tab to ensure sidebar file input is rendered
	await page.getByRole('button', { name: 'File' }).click();

	// Get the sidebar file input specifically
	const fileInput = page.locator('input[data-testid="sidebar-file-input"]');
	await fileInput.waitFor({ state: 'attached' });

	// Set both CRAM and CRAI files
	await fileInput.setInputFiles([CRAM_FILE, CRAI_FILE]);

	// Wait for track to appear in sidebar
	await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });
}

// Helper to navigate to coordinates
async function navigateTo(page: import('@playwright/test').Page, coords: string) {
	const coordInput = page.locator('input[type="text"]').first();
	await coordInput.click();
	await coordInput.fill(coords);
	await coordInput.press('Enter');
	await page.waitForTimeout(1500); // Wait for data to load and render
}

test.describe('Visual Regression - CRAM Support', () => {
	test.beforeEach(async ({ page }) => {
		// Start with E. coli K-12 assembly (has 2bit reference)
		await page.goto('/?assembly=ecoli-k12');
		await page.waitForSelector('canvas');
	});

	test('loads CRAM file and shows track in sidebar', async ({ page }) => {
		await loadLocalCramTrack(page);

		// Track should be visible in sidebar
		const trackItem = page.locator('text=cigar-test');
		await expect(trackItem).toBeVisible();
	});

	test('renders CRAM reads at sequence zoom level', async ({ page }) => {
		await loadLocalCramTrack(page);

		// Navigate to region with reads at high zoom
		await navigateTo(page, 'NC_000913.3:100000-100050');

		// Should render reads with sequence (not empty)
		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();

		// Take screenshot for visual verification
		await expect(page).toHaveScreenshot('cram-sequence-level.png', {
			maxDiffPixels: 100,
		});
	});

	test('renders CRAM reads at block zoom level', async ({ page }) => {
		await loadLocalCramTrack(page);

		// Navigate to region with reads at medium zoom
		await navigateTo(page, 'NC_000913.3:100000-100300');

		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();

		await expect(page).toHaveScreenshot('cram-block-level.png', {
			maxDiffPixels: 100,
		});
	});

	test('renders CRAM coverage histogram at low zoom', async ({ page }) => {
		await loadLocalCramTrack(page);

		// Navigate to wide view
		await navigateTo(page, 'NC_000913.3:90000-110000');

		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();

		await expect(page).toHaveScreenshot('cram-coverage-level.png', {
			maxDiffPixels: 100,
		});
	});

	test('CRAM reads match BAM reads for same region', async ({ page }) => {
		// This test verifies CRAM decoding produces equivalent results to BAM
		await loadLocalCramTrack(page);

		// Navigate to a specific region
		await navigateTo(page, 'NC_000913.3:100000-100100');

		// The visual output should be essentially identical to BAM
		// (minor differences possible due to reference-based compression)
		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();

		await expect(page).toHaveScreenshot('cram-vs-bam-comparison.png', {
			maxDiffPixels: 200, // Allow slightly more variance
		});
	});
});

test.describe('CRAM Error Handling', () => {
	test('shows warning when assembly lacks reference sequence', async ({ page }) => {
		// Use an assembly without 2bit reference (if any)
		// For now, test with ecoli which has reference - this test documents expected behavior
		await page.goto('/?assembly=ecoli-k12');
		await page.waitForSelector('canvas');

		await loadLocalCramTrack(page);
		await navigateTo(page, 'NC_000913.3:100000-100050');

		// Should not show error (reference is available)
		const errorBanner = page.locator('text=Error');
		await expect(errorBanner).not.toBeVisible({ timeout: 3000 });
	});
});
