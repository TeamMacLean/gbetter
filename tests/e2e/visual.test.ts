/**
 * Visual Regression Tests
 * Captures screenshots for baseline comparison
 * Run with: npm run test:e2e -- --update-snapshots (first time)
 */
import { test, expect } from '@playwright/test';
import path from 'path';

// Helper to get the coordinate input
const getCoordInput = (page: import('@playwright/test').Page) =>
	page.locator('input[placeholder*="1,000-10,000"]');

test.describe('Visual Regression - Default State', () => {
	test('homepage renders correctly', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for canvas to be ready
		await expect(page.locator('canvas').first()).toBeVisible();
		await page.waitForTimeout(500); // Allow animations to settle

		await expect(page).toHaveScreenshot('homepage-default.png', {
			maxDiffPixels: 100,
		});
	});

	test('sidebar collapsed state', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const collapseButton = page.locator('button[title="Collapse sidebar"]');
		if (await collapseButton.isVisible()) {
			await collapseButton.click();
			await page.waitForTimeout(300);
		}

		await expect(page).toHaveScreenshot('sidebar-collapsed.png', {
			maxDiffPixels: 100,
		});
	});
});

test.describe('Visual Regression - Navigation', () => {
	test('different chromosome views', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Default chr1 view
		await expect(page.locator('canvas').first()).toBeVisible();
		await page.waitForTimeout(300);

		await expect(page).toHaveScreenshot('viewport-chr1.png', {
			maxDiffPixels: 100,
		});

		// Switch to chr17
		const chrSelect = page.locator('select').first();
		await chrSelect.selectOption('chr17');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('viewport-chr17.png', {
			maxDiffPixels: 100,
		});
	});

	test('zoomed in view', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Zoom in several times
		const zoomIn = page.locator('button:has-text("+")').first();
		for (let i = 0; i < 3; i++) {
			await zoomIn.click();
			await page.waitForTimeout(200);
		}

		await expect(page).toHaveScreenshot('viewport-zoomed-in.png', {
			maxDiffPixels: 100,
		});
	});

	test('zoomed out view', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Zoom out several times
		const zoomOut = page.locator('button:has-text("−")').first();
		for (let i = 0; i < 3; i++) {
			await zoomOut.click();
			await page.waitForTimeout(200);
		}

		await expect(page).toHaveScreenshot('viewport-zoomed-out.png', {
			maxDiffPixels: 100,
		});
	});
});

test.describe('Visual Regression - GQL Console', () => {
	test('GQL console expanded', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Find and click the GQL console button
		const gqlButton = page.locator('button').filter({ hasText: /GQL Console/i }).first();
		if (await gqlButton.isVisible()) {
			await gqlButton.click();
			await page.waitForTimeout(300);

			// Click expand if available
			const expandButton = page.locator('button:has-text("Expand")');
			if (await expandButton.isVisible()) {
				await expandButton.click();
				await page.waitForTimeout(300);
			}
		}

		await expect(page).toHaveScreenshot('gql-console-expanded.png', {
			maxDiffPixels: 100,
		});
	});

	test('GQL console with query result', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Execute a search query
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('list genes');
		await searchInput.press('Enter');
		await page.waitForTimeout(1000);

		await expect(page).toHaveScreenshot('gql-console-with-result.png', {
			maxDiffPixels: 100,
		});
	});
});

test.describe('Visual Regression - Responsive', () => {
	test('large viewport (1920x1080)', async ({ page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('responsive-1920x1080.png', {
			maxDiffPixels: 200,
		});
	});

	test('medium viewport (1280x720)', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('responsive-1280x720.png', {
			maxDiffPixels: 200,
		});
	});

	test('small viewport (1024x768)', async ({ page }) => {
		await page.setViewportSize({ width: 1024, height: 768 });
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('responsive-1024x768.png', {
			maxDiffPixels: 200,
		});
	});
});

test.describe('Visual Regression - UI Components', () => {
	test('header controls', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Screenshot just the header
		const header = page.locator('header');
		await expect(header).toHaveScreenshot('header-controls.png', {
			maxDiffPixels: 50,
		});
	});

	test('sidebar tracks section', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Screenshot just the sidebar
		const sidebar = page.locator('aside');
		await expect(sidebar).toHaveScreenshot('sidebar-tracks.png', {
			maxDiffPixels: 50,
		});
	});

	test('assembly dropdown open', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const assemblyButton = page.locator('button').filter({ hasText: /GRCh|hg/i }).first();
		await assemblyButton.click();
		await page.waitForTimeout(300);

		// Full page screenshot with dropdown open
		await expect(page).toHaveScreenshot('assembly-dropdown-open.png', {
			maxDiffPixels: 100,
		});
	});
});

test.describe('Visual Regression - Track Loading', () => {
	test('GFF track loaded', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Load GFF file via file input
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/filter-test.gff3');
		await page.waitForTimeout(1000);

		// Navigate to see the data
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-50000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('track-gff-loaded.png', {
			maxDiffPixels: 200,
		});
	});

	test('BED track loaded', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/sample-genes.bed');
		await page.waitForTimeout(1000);

		await expect(page).toHaveScreenshot('track-bed-loaded.png', {
			maxDiffPixels: 200,
		});
	});
});

test.describe('Visual Regression - Filter States', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Load the filter test GFF
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/filter-test.gff3');
		await page.waitForTimeout(1000);

		// Navigate to chr1 to see all genes
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-50000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);
	});

	test('no filter - all features visible', async ({ page }) => {
		await expect(page).toHaveScreenshot('filter-none.png', {
			maxDiffPixels: 200,
		});
	});

	test('filter type=exon - exons bright, CDS dimmed', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('filter type=exon');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('filter-type-exon.png', {
			maxDiffPixels: 200,
		});
	});

	test('filter type=CDS - CDS bright, exons dimmed', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('filter type=CDS');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('filter-type-cds.png', {
			maxDiffPixels: 200,
		});
	});

	test('filter strand=+ - plus strand bright', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('filter strand=+');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('filter-strand-plus.png', {
			maxDiffPixels: 200,
		});
	});

	test('filter strand=- - minus strand bright', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('filter strand=-');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('filter-strand-minus.png', {
			maxDiffPixels: 200,
		});
	});

	test('clear filters - back to normal', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');

		// Apply filter first
		await searchInput.fill('filter type=exon');
		await searchInput.press('Enter');
		await page.waitForTimeout(300);

		// Clear it
		await searchInput.fill('clear filters');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('filter-cleared.png', {
			maxDiffPixels: 200,
		});
	});
});

test.describe('Visual Regression - Highlight States', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Load a track so we have context
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/filter-test.gff3');
		await page.waitForTimeout(1000);

		// Navigate to chr1
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-50000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);
	});

	test('highlight region', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('highlight chr1:5000-15000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('highlight-region.png', {
			maxDiffPixels: 200,
		});
	});

	test('multiple highlights', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');

		// Add first highlight
		await searchInput.fill('highlight chr1:2000-8000');
		await searchInput.press('Enter');
		await page.waitForTimeout(300);

		// Add second highlight
		await searchInput.fill('highlight chr1:20000-30000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('highlight-multiple.png', {
			maxDiffPixels: 200,
		});
	});

	test('clear highlights', async ({ page }) => {
		const searchInput = page.locator('input[placeholder*="Search"]');

		// Add highlight
		await searchInput.fill('highlight chr1:5000-15000');
		await searchInput.press('Enter');
		await page.waitForTimeout(300);

		// Clear it
		await searchInput.fill('clear highlights');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('highlight-cleared.png', {
			maxDiffPixels: 200,
		});
	});
});

test.describe('Visual Regression - Combined Filter and Highlight', () => {
	test('filter with highlight overlay', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Load track
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/filter-test.gff3');
		await page.waitForTimeout(1000);

		// Navigate
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-50000');
		await searchInput.press('Enter');
		await page.waitForTimeout(300);

		// Apply filter
		await searchInput.fill('filter type=exon');
		await searchInput.press('Enter');
		await page.waitForTimeout(300);

		// Add highlight
		await searchInput.fill('highlight chr1:5000-25000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('filter-and-highlight-combined.png', {
			maxDiffPixels: 200,
		});
	});

	test('clear all removes both filter and highlight', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Load track
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/filter-test.gff3');
		await page.waitForTimeout(1000);

		// Navigate
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-50000');
		await searchInput.press('Enter');
		await page.waitForTimeout(300);

		// Apply filter and highlight
		await searchInput.fill('filter type=CDS');
		await searchInput.press('Enter');
		await page.waitForTimeout(200);

		await searchInput.fill('highlight chr1:10000-20000');
		await searchInput.press('Enter');
		await page.waitForTimeout(300);

		// Clear all
		await searchInput.fill('clear all');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('clear-all-result.png', {
			maxDiffPixels: 200,
		});
	});
});

test.describe('Visual Regression - Different Data Structures', () => {
	test('mRNA-only data (no gene parent)', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/mrna-only.gff3');
		await page.waitForTimeout(1000);

		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-30000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('data-mrna-only.png', {
			maxDiffPixels: 200,
		});
	});

	test('mRNA-only with exon filter', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/mrna-only.gff3');
		await page.waitForTimeout(1000);

		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-30000');
		await searchInput.press('Enter');
		await page.waitForTimeout(300);

		await searchInput.fill('filter type=exon');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('data-mrna-only-filter-exon.png', {
			maxDiffPixels: 200,
		});
	});
});
