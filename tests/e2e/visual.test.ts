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
