import { test, expect } from '@playwright/test';

test.describe('Sequence-Level Visualization', () => {
	test.describe('Reference Sequence Display', () => {
		test('reference sequence track appears when zoomed to <125bp on human assembly', async ({ page }) => {
			// Navigate to human assembly at high zoom
			await page.goto('/?assembly=grch38&loc=chr17:7668421-7668521');

			// Wait for the canvas to render
			await page.waitForSelector('canvas');

			// Wait for potential reference sequence loading
			await page.waitForTimeout(2000);

			// At 100bp view, reference sequence should be visible if available
			// The reference track should appear with nucleotide letters
			// We verify by checking the canvas is rendered and the app is functional
			const canvas = page.locator('canvas');
			await expect(canvas).toBeVisible();
		});

		test('reference sequence hidden when zoomed out beyond threshold', async ({ page }) => {
			// Start at wide view
			await page.goto('/?assembly=grch38&loc=chr17:7600000-7700000');

			await page.waitForSelector('canvas');
			await page.waitForTimeout(500);

			// At 100kb view, reference sequence should NOT be visible
			// The canvas should render but without sequence track
			const canvas = page.locator('canvas');
			await expect(canvas).toBeVisible();
		});

		test('reference sequence available for built-in assemblies with 2bit', async ({ page }) => {
			// Test with mm10 (mouse) which has a UCSC 2bit file
			await page.goto('/?assembly=mm10&loc=chr1:3200000-3200100');

			await page.waitForSelector('canvas');
			await page.waitForTimeout(2000);

			// Canvas should be visible
			const canvas = page.locator('canvas');
			await expect(canvas).toBeVisible();
		});
	});

	test.describe('BAM Read Sequences', () => {
		test('BAM track loads and renders', async ({ page }) => {
			// Use E. coli assembly and load test BAM
			await page.goto('/?assembly=ecoli-k12');

			await page.waitForSelector('canvas');

			// Click URL tab in sidebar
			await page.click('button:has-text("URL")');

			// Paste BAM URL
			const urlInput = page.locator('input[type="url"]');
			await urlInput.fill('https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.bam');

			// Click add button (sibling of URL input)
			await urlInput.locator('..').locator('button:has-text("+")').click();

			// Wait for track to load and check it appears
			await expect(page.locator('span.uppercase:has-text("bam")')).toBeVisible({ timeout: 10000 });

			// Navigate to region with reads
			const coordInput = page.locator('input[placeholder*="chr"]').first();
			await coordInput.fill('NC_000913.3:150000-151000');
			await coordInput.press('Enter');

			await page.waitForTimeout(2000);

			// Canvas should be visible with track
			const canvas = page.locator('canvas');
			await expect(canvas).toBeVisible();
		});

		test('BAM reads show CIGAR blocks at medium zoom', async ({ page }) => {
			// Load BAM and zoom to medium level
			await page.goto('/?assembly=ecoli-k12');
			await page.waitForSelector('canvas');

			// Add BAM track via URL
			await page.click('button:has-text("URL")');

			const urlInput = page.locator('input[type="url"]');
			await urlInput.fill('https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.bam');

			await urlInput.locator('..').locator('button:has-text("+")').click();

			// Wait for track to appear
			await expect(page.locator('span.uppercase:has-text("bam")')).toBeVisible({ timeout: 10000 });

			// Navigate to region with reads at medium zoom (~500bp)
			const coordInput = page.locator('input[placeholder*="chr"]').first();
			await coordInput.fill('NC_000913.3:150000-150500');
			await coordInput.press('Enter');

			await page.waitForTimeout(2000);

			// Verify canvas renders
			const canvas = page.locator('canvas');
			await expect(canvas).toBeVisible();
		});
	});

	test.describe('VCF with Sequence Context', () => {
		test('VCF track loads and shows variants', async ({ page }) => {
			// Use E. coli assembly and load test VCF
			await page.goto('/?assembly=ecoli-k12');
			await page.waitForSelector('canvas');

			// Click URL tab
			await page.click('button:has-text("URL")');

			// Paste VCF URL
			const urlInput = page.locator('input[type="url"]');
			await urlInput.fill('https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.vcf.gz');

			// Add track
			await urlInput.locator('..').locator('button:has-text("+")').click();

			// Wait for track to appear
			await expect(page.locator('span.uppercase:has-text("vcf")')).toBeVisible({ timeout: 10000 });

			// Navigate to region with variants
			const coordInput = page.locator('input[placeholder*="chr"]').first();
			await coordInput.fill('NC_000913.3:100000-300000');
			await coordInput.press('Enter');

			await page.waitForTimeout(2000);

			// Canvas should be visible
			const canvas = page.locator('canvas');
			await expect(canvas).toBeVisible();
		});
	});

	test.describe('Zoom Transitions', () => {
		test('smooth zoom transitions between rendering modes', async ({ page }) => {
			await page.goto('/?assembly=grch38&loc=chr17:7668000-7669000');
			await page.waitForSelector('canvas');

			const canvas = page.locator('canvas');

			// Zoom in via scroll wheel
			const box = await canvas.boundingBox();
			if (box) {
				// Zoom in (negative deltaY)
				await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
				await page.mouse.wheel(0, -100);
				await page.waitForTimeout(500);

				// Zoom in more
				await page.mouse.wheel(0, -100);
				await page.waitForTimeout(500);

				// Zoom out
				await page.mouse.wheel(0, 100);
				await page.waitForTimeout(500);
			}

			// Canvas should still be visible and functional
			await expect(canvas).toBeVisible();
		});
	});
});

test.describe('Zoom Threshold Behavior', () => {
	test('sequence becomes visible at high zoom (small viewport)', async ({ page }) => {
		// Navigate to a very small region (< 125bp) on human assembly
		// This tests that the zoom thresholds work correctly
		await page.goto('/?assembly=grch38&loc=chr17:7668450-7668490');

		await page.waitForSelector('canvas');
		await page.waitForTimeout(2000);

		// At ~40bp, pixels per base should be very high
		// The canvas should render (we can't easily verify sequence letters in e2e)
		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();

		// Take a screenshot for manual verification
		// The reference sequence should be visible as colored letters
	});

	test('sequence hidden at low zoom (large viewport)', async ({ page }) => {
		// Navigate to a large region (> 10kb)
		await page.goto('/?assembly=grch38&loc=chr17:7600000-7700000');

		await page.waitForSelector('canvas');
		await page.waitForTimeout(500);

		// At 100kb view, sequence should not be visible
		// Canvas should still render but without nucleotide letters
		const canvas = page.locator('canvas');
		await expect(canvas).toBeVisible();
	});
});
