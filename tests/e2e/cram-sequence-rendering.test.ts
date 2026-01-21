/**
 * CRAM Sequence Rendering Tests
 *
 * Tests that CRAM reads display nucleotide letters at high zoom,
 * matching BAM rendering behavior.
 *
 * BUG: CRAM reads currently show blocks instead of nucleotide letters.
 * This is because the read sequence data is not being properly extracted.
 *
 * SUCCESS CRITERIA:
 * - At sequence zoom (pixelsPerBase >= 8), CRAM should show colored nucleotide letters
 * - CRAM rendering should look like BAM rendering (colored letters, not blocks)
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CRAM_FILE = path.join(__dirname, '../../scripts/cram-test-files/output/cigar-test.cram');
const CRAI_FILE = path.join(__dirname, '../../scripts/cram-test-files/output/cigar-test.cram.crai');
const BAM_FILE = path.join(__dirname, '../../scripts/bam-test-files/output/cigar-test.bam');
const BAI_FILE = path.join(__dirname, '../../scripts/bam-test-files/output/cigar-test.bam.bai');

async function loadTrack(page: import('@playwright/test').Page, files: string[]) {
	await page.getByRole('button', { name: 'File' }).click();
	const fileInput = page.locator('input[data-testid="sidebar-file-input"]');
	await fileInput.waitFor({ state: 'attached' });
	await fileInput.setInputFiles(files);
	await page.waitForTimeout(1000);
}

async function navigateTo(page: import('@playwright/test').Page, coords: string) {
	const coordInput = page.locator('input[type="text"]').first();
	await coordInput.click();
	await coordInput.fill(coords);
	await coordInput.press('Enter');
	await page.waitForTimeout(2000);
}

test.describe('CRAM Sequence Rendering', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/?assembly=ecoli-k12');
		await page.waitForSelector('canvas');
	});

	test('CRAM shows nucleotide letters at sequence zoom (must match BAM)', async ({ page }) => {
		// Load CRAM and navigate to sequence zoom level
		await loadTrack(page, [CRAM_FILE, CRAI_FILE]);
		await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });
		await navigateTo(page, 'NC_000913.3:100000-100050');

		// The CRAM rendering should show nucleotide letters like BAM does
		// This baseline was created from BAM rendering (the correct behavior)
		// If CRAM shows blocks instead of letters, this test will FAIL
		await expect(page).toHaveScreenshot('cram-sequence-with-letters.png', {
			maxDiffPixels: 500, // Allow some variance for timing/anti-aliasing
		});
	});

	test('CRAM track loads and shows features', async ({ page }) => {
		await loadTrack(page, [CRAM_FILE, CRAI_FILE]);
		await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });
		await navigateTo(page, 'NC_000913.3:100000-100100');
		await page.waitForTimeout(2000);

		// Verify CRAM type indicator is visible
		await expect(page.locator('text=CRAM')).toBeVisible({ timeout: 10000 });
	});

	test('CRAM shows triangle insertion markers at block level (must match BAM)', async ({ page }) => {
		// Load CRAM and navigate to block level zoom (200-500bp view)
		await loadTrack(page, [CRAM_FILE, CRAI_FILE]);
		await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });
		await navigateTo(page, 'NC_000913.3:100000-100300');

		// The CRAM rendering at block level should show triangle insertion markers like BAM
		await expect(page).toHaveScreenshot('cram-block-level-insertions.png', {
			maxDiffPixels: 500,
		});
	});

	test('BAM block level for comparison', async ({ page }) => {
		// Load BAM at same coordinates for visual comparison
		await loadTrack(page, [BAM_FILE, BAI_FILE]);
		await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });
		await navigateTo(page, 'NC_000913.3:100000-100300');

		await expect(page).toHaveScreenshot('bam-block-level-insertions.png', {
			maxDiffPixels: 500,
		});
	});

	test('CRAM insertion markers close-up', async ({ page }) => {
		// Narrower view to see insertion markers more clearly
		await loadTrack(page, [CRAM_FILE, CRAI_FILE]);
		await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });
		await navigateTo(page, 'NC_000913.3:100020-100080');

		await expect(page).toHaveScreenshot('cram-insertion-closeup.png', {
			maxDiffPixels: 500,
		});
	});

	test('BAM insertion markers close-up', async ({ page }) => {
		// Same narrower view for BAM comparison
		await loadTrack(page, [BAM_FILE, BAI_FILE]);
		await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });
		await navigateTo(page, 'NC_000913.3:100020-100080');

		await expect(page).toHaveScreenshot('bam-insertion-closeup.png', {
			maxDiffPixels: 500,
		});
	});

	test('CRAM block level at insertion position', async ({ page }) => {
		// Block level view (150bp) focused on insertion region
		await loadTrack(page, [CRAM_FILE, CRAI_FILE]);
		await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });
		await navigateTo(page, 'NC_000913.3:100050-100200');

		await expect(page).toHaveScreenshot('cram-block-insertion-region.png', {
			maxDiffPixels: 500,
		});
	});

	test('BAM block level at insertion position', async ({ page }) => {
		// Block level view (150bp) focused on insertion region
		await loadTrack(page, [BAM_FILE, BAI_FILE]);
		await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });
		await navigateTo(page, 'NC_000913.3:100050-100200');

		await expect(page).toHaveScreenshot('bam-block-insertion-region.png', {
			maxDiffPixels: 500,
		});
	});
});
