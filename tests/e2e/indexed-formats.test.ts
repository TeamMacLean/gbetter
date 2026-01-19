/**
 * E2E Tests for Indexed Format Support
 *
 * Tests remote indexed file formats:
 * - Tabix: .vcf.gz, .gff.gz, .bed.gz (with .tbi index)
 * - BAM/CRAM: .bam, .cram (with .bai/.crai index)
 *
 * These tests use public URLs and will FAIL until the formats are implemented.
 * Use with Ralph Loop to iteratively implement until tests pass.
 */

import { test, expect } from '@playwright/test';

// Public test URLs - need CORS-enabled sources
// Note: Finding stable, CORS-enabled URLs is challenging.
// We may need to host test files on our R2 bucket.

const TEST_URLS = {
	// VCF from 1000 Genomes (small region test file)
	// Note: May need proxy if not CORS-enabled
	vcfGz: 'https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/data_collections/1000_genomes_project/release/20190312_biallelic_SNV_and_INDEL/ALL.chr22.shapeit2_integrated_snvindels_v2a_27022019.GRCh38.phased.vcf.gz',

	// Alternative: Use our R2 bucket for test files
	// These would be uploaded specifically for testing
	// vcfGz: 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/sample.vcf.gz',
	// gffGz: 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/sample.gff.gz',
	// bedGz: 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/sample.bed.gz',
};

test.describe('Tabix Format Support', () => {
	test('sidebar URL input accepts .vcf.gz extension', async ({ page }) => {
		await page.goto('/');

		// Click URL tab
		await page.click('button:has-text("URL")');

		// Enter VCF URL
		const urlInput = page.locator('input[type="url"]');
		await urlInput.fill('https://example.com/sample.vcf.gz');

		// Click add button (the one next to the URL input, not zoom button)
		// Use more specific selector - the add button is a sibling of the URL input
		await urlInput.locator('..').locator('button:has-text("+")').click();

		// Wait a moment for error to potentially appear
		await page.waitForTimeout(500);

		// Should NOT show "Unsupported format" error - check for partial text match
		const errorText = page.locator('p.text-red-400:has-text("Unsupported")');
		await expect(errorText).not.toBeVisible({ timeout: 1000 });

		// Track should be added to the sidebar (may have loading/error from network, but format accepted)
		// Look for a track entry containing "vcf" in its type indicator
		await expect(page.locator('span.uppercase:has-text("vcf")')).toBeVisible({ timeout: 5000 });
	});

	test('sidebar URL input accepts .gff.gz extension', async ({ page }) => {
		await page.goto('/');

		// Click URL tab
		await page.click('button:has-text("URL")');

		// Enter GFF URL
		const urlInput = page.locator('input[type="url"]');
		await urlInput.fill('https://example.com/genes.gff.gz');

		// Click add button (the one next to the URL input)
		await urlInput.locator('..').locator('button:has-text("+")').click();

		// Wait a moment for error to potentially appear
		await page.waitForTimeout(500);

		// Should NOT show "Unsupported format" error
		const errorText = page.locator('p.text-red-400:has-text("Unsupported")');
		await expect(errorText).not.toBeVisible({ timeout: 1000 });

		// Track should be added with "gff" type
		await expect(page.locator('span.uppercase:has-text("gff")')).toBeVisible({ timeout: 5000 });
	});

	test('sidebar URL input accepts .bed.gz extension', async ({ page }) => {
		await page.goto('/');

		// Click URL tab
		await page.click('button:has-text("URL")');

		// Enter BED URL
		const urlInput = page.locator('input[type="url"]');
		await urlInput.fill('https://example.com/intervals.bed.gz');

		// Click add button (the one next to the URL input)
		await urlInput.locator('..').locator('button:has-text("+")').click();

		// Wait a moment for error to potentially appear
		await page.waitForTimeout(500);

		// Should NOT show "Unsupported format" error
		const errorText = page.locator('p.text-red-400:has-text("Unsupported")');
		await expect(errorText).not.toBeVisible({ timeout: 1000 });

		// Track should be added with "bed" type (use exact match to avoid matching "bigbed")
		await expect(page.getByText('bed', { exact: true })).toBeVisible({ timeout: 5000 });
	});

	// This test requires actual data loading - will need real CORS-enabled URLs
	test.skip('VCF.gz loads and displays variants', async ({ page }) => {
		// Skip until we have reliable CORS-enabled test URLs
		await page.goto('/?chr=chr22&start=16000000&end=16100000');

		// Click URL tab
		await page.click('button:has-text("URL")');

		// Enter VCF URL
		await page.locator('input[type="url"]').fill(TEST_URLS.vcfGz);
		await page.click('button:has-text("+")');

		// Wait for track to appear
		await expect(page.getByText(/vcf/i)).toBeVisible({ timeout: 10000 });

		// Wait for features to load
		await expect(page.getByText(/\d+ features/)).toBeVisible({ timeout: 30000 });
	});
});

test.describe('BAM Format Support', () => {
	test('sidebar URL input accepts .bam extension', async ({ page }) => {
		await page.goto('/');

		// Click URL tab
		await page.click('button:has-text("URL")');

		// Enter BAM URL
		const urlInput = page.locator('input[type="url"]');
		await urlInput.fill('https://example.com/alignments.bam');

		// Click add button (the one next to the URL input)
		await urlInput.locator('..').locator('button:has-text("+")').click();

		// Wait a moment for error to potentially appear
		await page.waitForTimeout(500);

		// Should NOT show "Unsupported format" error
		const errorText = page.locator('p.text-red-400:has-text("Unsupported")');
		await expect(errorText).not.toBeVisible({ timeout: 1000 });

		// Track should be added with "bam" type
		await expect(page.locator('span.uppercase:has-text("bam")')).toBeVisible({ timeout: 5000 });
	});

	test('sidebar URL input accepts .cram extension', async ({ page }) => {
		await page.goto('/');

		// Click URL tab
		await page.click('button:has-text("URL")');

		// Enter CRAM URL
		const urlInput = page.locator('input[type="url"]');
		await urlInput.fill('https://example.com/alignments.cram');

		// Click add button (the one next to the URL input)
		await urlInput.locator('..').locator('button:has-text("+")').click();

		// Wait a moment for error to potentially appear
		await page.waitForTimeout(500);

		// Should NOT show "Unsupported format" error
		const errorText = page.locator('p.text-red-400:has-text("Unsupported")');
		await expect(errorText).not.toBeVisible({ timeout: 1000 });

		// Track should be added with "cram" type
		await expect(page.locator('span.uppercase:has-text("cram")')).toBeVisible({ timeout: 5000 });
	});
});
