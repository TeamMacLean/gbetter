/**
 * BAM CIGAR Rendering Visual Tests
 *
 * Tests BAM read rendering at different zoom levels:
 * - Sequence level (<125bp): colored nucleotide letters, mismatch highlighting
 * - Block level (125bp-1000bp): CIGAR blocks with insertions/deletions
 * - Rectangle level (>1000bp): simple rectangles
 *
 * Uses cigar-test.bam which contains reads with various CIGAR operations:
 * - Simple matches (50M)
 * - Insertions (25M2I23M, etc.)
 * - Deletions (25M3D25M, etc.)
 * - Soft clips (5S45M, etc.)
 * - Mismatches (all T's, G's, C's vs reference)
 * - Varying quality scores
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

test.describe('BAM CIGAR Rendering', () => {
	test.beforeEach(async ({ page }) => {
		// Start with E. coli K-12 assembly
		await page.goto('/?assembly=ecoli-k12');
		await page.waitForSelector('canvas');
	});

	test.describe('Sequence-Level Rendering (high zoom)', () => {
		test('renders colored nucleotide letters at <100bp zoom', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Navigate to simple match region at very high zoom (50bp = ~20 pixels/base)
			await navigateTo(page, 'NC_000913.3:100000-100050');

			// Take screenshot for visual verification
			const canvas = page.locator('canvas');
			await expect(canvas).toBeVisible();

			// Screenshot captures the rendered state
			await expect(page).toHaveScreenshot('bam-sequence-simple-match.png', {
				maxDiffPixels: 100,
			});
		});

		test('shows insertion markers (green) at sequence zoom', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Navigate to insertion region (reads have 25M2I23M etc.)
			await navigateTo(page, 'NC_000913.3:100050-100100');

			await expect(page).toHaveScreenshot('bam-sequence-insertions.png', {
				maxDiffPixels: 100,
			});
		});

		test('shows deletion gaps at sequence zoom', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Navigate to deletion region (reads have 25M3D25M etc.)
			await navigateTo(page, 'NC_000913.3:100100-100150');

			await expect(page).toHaveScreenshot('bam-sequence-deletions.png', {
				maxDiffPixels: 100,
			});
		});

		test('highlights mismatches with red background', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Navigate to mismatch region (all T's, G's, C's vs reference)
			await navigateTo(page, 'NC_000913.3:100200-100250');

			await expect(page).toHaveScreenshot('bam-sequence-mismatches.png', {
				maxDiffPixels: 100,
			});
		});

		test('shows quality-based opacity differences', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Navigate to quality score region (high, medium, low quality reads)
			await navigateTo(page, 'NC_000913.3:100250-100300');

			await expect(page).toHaveScreenshot('bam-sequence-quality.png', {
				maxDiffPixels: 100,
			});
		});
	});

	test.describe('Block-Level Rendering (medium zoom)', () => {
		test('renders CIGAR blocks at 200-500bp zoom', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Navigate to region with various CIGAR ops at medium zoom
			await navigateTo(page, 'NC_000913.3:100000-100300');

			await expect(page).toHaveScreenshot('bam-blocks-overview.png', {
				maxDiffPixels: 100,
			});
		});

		test('shows insertion markers as vertical lines', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Focus on insertion region at block zoom
			await navigateTo(page, 'NC_000913.3:100040-100120');

			await expect(page).toHaveScreenshot('bam-blocks-insertions.png', {
				maxDiffPixels: 100,
			});
		});

		test('shows deletion gaps as connecting lines', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Focus on deletion region at block zoom
			await navigateTo(page, 'NC_000913.3:100090-100170');

			await expect(page).toHaveScreenshot('bam-blocks-deletions.png', {
				maxDiffPixels: 100,
			});
		});

		test('renders complex CIGAR patterns correctly', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Navigate to complex CIGAR region
			await navigateTo(page, 'NC_000913.3:100280-100380');

			await expect(page).toHaveScreenshot('bam-blocks-complex.png', {
				maxDiffPixels: 100,
			});
		});
	});

	test.describe('Rectangle-Level Rendering (low zoom)', () => {
		test('renders simple rectangles at >1000bp zoom', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Navigate to wide view
			await navigateTo(page, 'NC_000913.3:99000-102000');

			await expect(page).toHaveScreenshot('bam-rectangles-wide.png', {
				maxDiffPixels: 100,
			});
		});

		test('shows dense coverage region', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Navigate to dense coverage region at medium-wide zoom
			await navigateTo(page, 'NC_000913.3:100300-100500');

			await expect(page).toHaveScreenshot('bam-rectangles-dense.png', {
				maxDiffPixels: 100,
			});
		});
	});

	test.describe('Zoom Transitions', () => {
		test('transitions smoothly from rectangles to blocks to sequence', async ({ page }) => {
			await loadLocalBamTrack(page);

			// Start wide (rectangles)
			await navigateTo(page, 'NC_000913.3:99500-101500');
			await expect(page).toHaveScreenshot('bam-zoom-1-rectangles.png', { maxDiffPixels: 100 });

			// Zoom in (blocks)
			await navigateTo(page, 'NC_000913.3:100000-100200');
			await expect(page).toHaveScreenshot('bam-zoom-2-blocks.png', { maxDiffPixels: 100 });

			// Zoom in more (sequence)
			await navigateTo(page, 'NC_000913.3:100000-100060');
			await expect(page).toHaveScreenshot('bam-zoom-3-sequence.png', { maxDiffPixels: 100 });
		});
	});
});

test.describe('BAM Rendering Without Reference', () => {
	test('renders reads even when reference sequence unavailable', async ({ page }) => {
		// Use assembly without reference (or before it loads)
		await page.goto('/?assembly=ecoli-k12');
		await page.waitForSelector('canvas');

		// Load local BAM using correct sidebar file input
		await page.getByRole('button', { name: 'File' }).click();
		const fileInput = page.locator('input[data-testid="sidebar-file-input"]');
		await fileInput.waitFor({ state: 'attached' });
		await fileInput.setInputFiles([BAM_FILE, BAI_FILE]);
		await expect(page.locator('text=cigar-test')).toBeVisible({ timeout: 15000 });

		// Navigate before reference might load
		const coordInput = page.locator('input[type="text"]').first();
		await coordInput.fill('NC_000913.3:100000-100050');
		await coordInput.press('Enter');

		// Should still render reads (just without mismatch highlighting)
		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();
	});
});
