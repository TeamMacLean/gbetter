/**
 * BigWig Visual Test
 *
 * Tests that BigWig tracks can be added via URL parameter and render visually.
 * Verifies the complete data flow: URL param -> track loading -> data fetch -> canvas rendering.
 */
import { test, expect } from '@playwright/test';

const TEST_BIGWIG_URL = 'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/phyloP100way/hg38.phyloP100way.bw';

test.describe('BigWig Visual Rendering', () => {
	test('BigWig track loads via URL parameter and shows in sidebar', async ({ page }) => {
		// Load the app with BigWig track via URL parameter
		const url = `/?chr=chr17&start=7661778&end=7687490&bigwig=${encodeURIComponent(TEST_BIGWIG_URL)}&bigwig_name=PhyloP%20Conservation`;
		await page.goto(url);

		// Wait for app to load
		await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

		// Verify BigWig track appears in sidebar
		await expect(page.getByText('PhyloP Conservation')).toBeVisible({ timeout: 10000 });

		// Verify track shows as BIGWIG type (use exact match to avoid matching file format hint)
		await expect(page.getByText('bigwig', { exact: true })).toBeVisible({ timeout: 5000 });
	});

	test('BigWig track loads features and displays feature count', async ({ page }) => {
		const url = `/?chr=chr17&start=7661778&end=7687490&bigwig=${encodeURIComponent(TEST_BIGWIG_URL)}&bigwig_name=PhyloP%20Test`;
		await page.goto(url);

		await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

		// Wait for BigWig track to appear and load features
		await expect(page.getByText('PhyloP Test')).toBeVisible({ timeout: 10000 });

		// Wait for BigWig features to load - look for feature count with comma (indicates large number)
		// BigWig typically loads 40,000-60,000 features for this region
		// The feature count will have a comma, e.g., "51,410 features"
		await expect(page.getByText(/\d+,\d+ features/)).toBeVisible({ timeout: 30000 });
	});

	test('BigWig track renders signal on canvas', async ({ page }) => {
		const url = `/?chr=chr17&start=7661778&end=7687490&bigwig=${encodeURIComponent(TEST_BIGWIG_URL)}&bigwig_name=PhyloP%20Visual`;
		await page.goto(url);

		// Wait for app to load
		await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

		// Wait for BigWig track to appear
		await expect(page.getByText('PhyloP Visual')).toBeVisible({ timeout: 10000 });

		// Wait for BigWig features to load (will show count with comma, e.g., "51,410 features")
		await expect(page.getByText(/\d+,\d+ features/)).toBeVisible({ timeout: 30000 });

		// Wait a bit for rendering to complete
		await page.waitForTimeout(500);

		// Verify canvas is rendered
		await expect(page.locator('canvas')).toBeVisible();

		// Take screenshot for visual inspection
		await page.screenshot({ path: 'tests/e2e/results/bigwig-visual-test.png', fullPage: true });
	});

	test('BigWig and Transcripts tracks render together', async ({ page }) => {
		const url = `/?chr=chr17&start=7661778&end=7687490&bigwig=${encodeURIComponent(TEST_BIGWIG_URL)}&bigwig_name=PhyloP%20Combined`;
		await page.goto(url);

		// Wait for app to load
		await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

		// Verify both tracks appear (BigWig + Transcripts)
		await expect(page.getByText(/TRACKS \(2\)/i)).toBeVisible({ timeout: 15000 });

		// Verify BigWig track
		await expect(page.getByText('PhyloP Combined')).toBeVisible();

		// Verify Transcripts track
		await expect(page.getByText('Transcripts').first()).toBeVisible();

		// Wait for both to load features
		await expect(async () => {
			const featureTexts = await page.locator('text=/\\d+,?\\d* features/').allTextContents();
			expect(featureTexts.length).toBe(2); // Both tracks should show feature counts
		}).toPass({ timeout: 30000 });
	});
});
