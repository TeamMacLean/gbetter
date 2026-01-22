/**
 * BAM Coverage Histogram Tests
 *
 * Tests BAM coverage histogram rendering at low zoom (density mode, <1 px/base).
 * At this zoom level, BAM tracks render as a coverage histogram instead of individual reads,
 * showing read depth as an area chart similar to BigWig signal tracks.
 *
 * Uses cigar-test.bam which contains reads in the NC_000913.3:100000-100500 region.
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
	// Click File tab to ensure sidebar file input is rendered
	await page.getByRole('button', { name: 'File' }).click();

	// Get the sidebar file input specifically (not SessionRestoreBanner)
	const fileInput = page.locator('input[data-testid="sidebar-file-input"]');
	await fileInput.waitFor({ state: 'attached' });

	// Set both BAM and BAI files
	await fileInput.setInputFiles([BAM_FILE, BAI_FILE]);

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

test.describe('Visual Regression - BAM Coverage Histogram', () => {
	test.beforeEach(async ({ page }) => {
		// Start with E. coli K-12 assembly
		await page.goto('/?assembly=ecoli-k12');
		await page.waitForSelector('canvas');
	});

	test('renders coverage histogram at very low zoom (>100kb view)', async ({ page }) => {
		await loadLocalBamTrack(page);

		// Navigate to wide view that triggers density mode (<1 px/base)
		// E. coli chromosome is ~4.6Mb, show 100kb region
		await navigateTo(page, 'NC_000913.3:1-100000');

		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();

		// Take screenshot - should show histogram instead of rectangles
		await expect(page).toHaveScreenshot('bam-coverage-histogram-wide.png', {
			maxDiffPixels: 100,
		});
	});

	test('shows Y-axis coverage label', async ({ page }) => {
		await loadLocalBamTrack(page);

		// Navigate to region with reads at low zoom
		// This view should show coverage in the 100000-100500 region where test reads are
		await navigateTo(page, 'NC_000913.3:50000-150000');

		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();

		// Screenshot should show Y-axis label with coverage value
		await expect(page).toHaveScreenshot('bam-coverage-histogram-with-label.png', {
			maxDiffPixels: 100,
		});
	});

	test('coverage histogram shows read depth accurately', async ({ page }) => {
		await loadLocalBamTrack(page);

		// Navigate to region centered on our test reads (100000-100500)
		// At this zoom, we should see the coverage peak
		await navigateTo(page, 'NC_000913.3:90000-110000');

		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();

		await expect(page).toHaveScreenshot('bam-coverage-histogram-peak.png', {
			maxDiffPixels: 100,
		});
	});

	test('transitions from coverage to blocks when zooming in', async ({ page }) => {
		await loadLocalBamTrack(page);

		// Start at coverage view (density mode)
		await navigateTo(page, 'NC_000913.3:90000-110000');
		await expect(page).toHaveScreenshot('bam-transition-1-coverage.png', { maxDiffPixels: 100 });

		// Zoom in to block view (should transition from histogram to blocks)
		await navigateTo(page, 'NC_000913.3:100000-100500');
		await expect(page).toHaveScreenshot('bam-transition-2-blocks.png', { maxDiffPixels: 100 });

		// Zoom in more to sequence view
		await navigateTo(page, 'NC_000913.3:100000-100100');
		await expect(page).toHaveScreenshot('bam-transition-3-sequence.png', { maxDiffPixels: 100 });
	});

	test('empty regions show zero coverage', async ({ page }) => {
		await loadLocalBamTrack(page);

		// Navigate to region without reads (before our test region)
		await navigateTo(page, 'NC_000913.3:1-50000');

		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();

		// Should show flat/empty histogram
		await expect(page).toHaveScreenshot('bam-coverage-histogram-empty.png', {
			maxDiffPixels: 100,
		});
	});
});
