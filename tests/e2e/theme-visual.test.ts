/**
 * Visual Regression Tests for Theme System
 * Captures screenshots for each theme mode and palette combination
 */
import { test, expect } from '@playwright/test';

// Helper to switch theme via Settings panel
async function switchTheme(page: import('@playwright/test').Page, themeName: 'Light' | 'Dark' | 'High Contrast') {
	// Open Settings
	const settingsButton = page.locator('button[title="Settings"]');
	await settingsButton.click();
	await page.waitForTimeout(200);

	// Click Display tab
	const displayTab = page.locator('button').filter({ hasText: 'Display' });
	await displayTab.click();
	await page.waitForTimeout(100);

	// Click the theme button
	const themeButton = page.locator('button').filter({ hasText: themeName }).first();
	await themeButton.click();
	await page.waitForTimeout(300);

	// Close Settings by pressing Escape
	await page.keyboard.press('Escape');
	await page.waitForTimeout(200);
}

// Helper to switch palette via Settings panel
async function switchPalette(page: import('@playwright/test').Page, paletteName: 'Set2' | 'Dark2' | 'Paired') {
	// Open Settings
	const settingsButton = page.locator('button[title="Settings"]');
	await settingsButton.click();
	await page.waitForTimeout(200);

	// Click Display tab
	const displayTab = page.locator('button').filter({ hasText: 'Display' });
	await displayTab.click();
	await page.waitForTimeout(100);

	// Click the palette button
	const paletteButton = page.locator('button').filter({ hasText: paletteName }).first();
	await paletteButton.click();
	await page.waitForTimeout(300);

	// Close Settings by pressing Escape
	await page.keyboard.press('Escape');
	await page.waitForTimeout(200);
}

test.describe('Visual Regression - Theme Modes', () => {
	test('light theme - default state', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(500);

		// Verify we're in light theme (default)
		const html = page.locator('html');
		await expect(html).not.toHaveClass(/dark/);

		await expect(page).toHaveScreenshot('theme-light-default.png', {
			maxDiffPixels: 100,
		});
	});

	test('dark theme - default state', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await switchTheme(page, 'Dark');

		// Verify dark class is applied
		const html = page.locator('html');
		await expect(html).toHaveClass(/dark/);

		await expect(page).toHaveScreenshot('theme-dark-default.png', {
			maxDiffPixels: 100,
		});
	});

	test('high-contrast theme - default state', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await switchTheme(page, 'High Contrast');

		// Verify high-contrast class is applied
		const html = page.locator('html');
		await expect(html).toHaveClass(/high-contrast/);

		await expect(page).toHaveScreenshot('theme-high-contrast-default.png', {
			maxDiffPixels: 100,
		});
	});
});

test.describe('Visual Regression - Themes with Gene Track', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Load GFF file to have visible gene models
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/filter-test.gff3');
		await page.waitForTimeout(1000);

		// Navigate to see the genes
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-50000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);
	});

	test('light theme with gene track', async ({ page }) => {
		await expect(page).toHaveScreenshot('theme-light-genes.png', {
			maxDiffPixels: 200,
		});
	});

	test('dark theme with gene track', async ({ page }) => {
		await switchTheme(page, 'Dark');

		await expect(page).toHaveScreenshot('theme-dark-genes.png', {
			maxDiffPixels: 200,
		});
	});

	test('high-contrast theme with gene track', async ({ page }) => {
		await switchTheme(page, 'High Contrast');

		await expect(page).toHaveScreenshot('theme-high-contrast-genes.png', {
			maxDiffPixels: 200,
		});
	});
});

test.describe('Visual Regression - Color Palettes', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Load GFF file to see palette colors on gene models
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/filter-test.gff3');
		await page.waitForTimeout(1000);

		// Navigate to see the genes
		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-50000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);
	});

	test('Set2 palette (default)', async ({ page }) => {
		// Set2 is default, no switch needed
		await expect(page).toHaveScreenshot('palette-set2-genes.png', {
			maxDiffPixels: 200,
		});
	});

	test('Dark2 palette', async ({ page }) => {
		await switchPalette(page, 'Dark2');

		await expect(page).toHaveScreenshot('palette-dark2-genes.png', {
			maxDiffPixels: 200,
		});
	});

	test('Paired palette', async ({ page }) => {
		await switchPalette(page, 'Paired');

		await expect(page).toHaveScreenshot('palette-paired-genes.png', {
			maxDiffPixels: 200,
		});
	});
});

test.describe('Visual Regression - Theme + Palette Combinations', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Load GFF file
		const fileInput = page.locator('input[type="file"]').first();
		await fileInput.setInputFiles('test-data/filter-test.gff3');
		await page.waitForTimeout(1000);

		const searchInput = page.locator('input[placeholder*="Search"]');
		await searchInput.fill('navigate chr1:1-50000');
		await searchInput.press('Enter');
		await page.waitForTimeout(500);
	});

	test('dark theme with Dark2 palette', async ({ page }) => {
		// Switch theme and palette in one Settings session
		const settingsButton = page.locator('button[title="Settings"]');
		await settingsButton.click();
		await page.waitForTimeout(200);

		const displayTab = page.locator('button').filter({ hasText: 'Display' });
		await displayTab.click();
		await page.waitForTimeout(100);

		// Switch to dark theme
		await page.locator('button').filter({ hasText: 'Dark' }).first().click();
		await page.waitForTimeout(200);

		// Switch to Dark2 palette
		await page.locator('button').filter({ hasText: 'Dark2' }).first().click();
		await page.waitForTimeout(200);

		// Close Settings
		await page.keyboard.press('Escape');
		await page.waitForTimeout(300);

		await expect(page).toHaveScreenshot('theme-dark-palette-dark2.png', {
			maxDiffPixels: 200,
		});
	});

	test('high-contrast theme with Paired palette', async ({ page }) => {
		// Switch theme and palette in one Settings session
		const settingsButton = page.locator('button[title="Settings"]');
		await settingsButton.click();
		await page.waitForTimeout(200);

		const displayTab = page.locator('button').filter({ hasText: 'Display' });
		await displayTab.click();
		await page.waitForTimeout(100);

		// Switch to high-contrast theme
		await page.locator('button').filter({ hasText: 'High Contrast' }).first().click();
		await page.waitForTimeout(200);

		// Switch to Paired palette
		await page.locator('button').filter({ hasText: 'Paired' }).first().click();
		await page.waitForTimeout(200);

		// Close Settings
		await page.keyboard.press('Escape');
		await page.waitForTimeout(300);

		await expect(page).toHaveScreenshot('theme-highcontrast-palette-paired.png', {
			maxDiffPixels: 200,
		});
	});
});

test.describe('Visual Regression - Settings Panel Display Tab', () => {
	test('Settings Display tab shows theme and palette options', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Open Settings
		const settingsButton = page.locator('button[title="Settings"]');
		await settingsButton.click();
		await page.waitForTimeout(200);

		// Click Display tab
		const displayTab = page.locator('button').filter({ hasText: 'Display' });
		await displayTab.click();
		await page.waitForTimeout(200);

		// Screenshot the modal
		const modal = page.locator('.fixed.top-1\\/2.left-1\\/2');
		await expect(modal).toHaveScreenshot('settings-display-tab.png', {
			maxDiffPixels: 50,
		});
	});
});
