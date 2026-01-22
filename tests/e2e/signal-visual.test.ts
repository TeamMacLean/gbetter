/**
 * Visual Regression Tests for Signal Track Rendering
 * Tests that BigWig/bedGraph signal tracks render with correct color ramps
 */
import { test, expect } from '@playwright/test';

// PhyloP conservation score BigWig - good for visual testing
const TEST_BIGWIG_URL = 'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/phyloP100way/hg38.phyloP100way.bw';

test.describe('Signal Track Visual Regression', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for app to load
		await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
		await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });
	});

	test('BigWig signal track renders with color ramp', async ({ page }) => {
		// Add BigWig track via store API
		await page.evaluate(async (url) => {
			// @ts-ignore - Dynamic imports work in browser via Vite
			const { useRemoteTracks } = await import('/src/lib/stores/remoteTracks.svelte.ts');
			// @ts-ignore - Dynamic imports work in browser via Vite
			const { useViewport } = await import('/src/lib/stores/viewport.svelte.ts');

			const remoteTracks = useRemoteTracks();
			const viewport = useViewport();

			// Navigate to TP53 region (good for phyloP signal)
			viewport.navigateTo('chr17', 7661778, 7687490);

			// Add BigWig track
			remoteTracks.addRemoteTrack({
				id: 'visual-test-bigwig',
				name: 'PhyloP Signal',
				type: 'bigwig',
				url: url,
				assemblyId: 'GRCh38',
				color: '#10b981',
				height: 100
			});

			// Trigger viewport update
			remoteTracks.updateForViewport(viewport.current);
		}, TEST_BIGWIG_URL);

		// Wait for track to load
		await page.waitForTimeout(2000);

		// Use Playwright's polling to wait for features to load
		await expect(async () => {
			const hasFeatures = await page.evaluate(async () => {
				// @ts-ignore
				const { useRemoteTracks } = await import('/src/lib/stores/remoteTracks.svelte.ts');
				const remoteTracks = useRemoteTracks();
				const track = remoteTracks.all.find((t: { id: string }) => t.id === 'visual-test-bigwig');
				return track && track.features && track.features.length > 0 && !track.isLoading;
			});
			expect(hasFeatures).toBe(true);
		}).toPass({ timeout: 30000, intervals: [1000, 2000, 3000] });

		// Wait a bit more for rendering to complete
		await page.waitForTimeout(500);

		// Take screenshot
		await expect(page).toHaveScreenshot('signal-track-color-ramp.png', {
			maxDiffPixels: 200,
		});
	});

	test('signal track with light theme shows blue gradient', async ({ page }) => {
		// Verify we're in light theme (default)
		const html = page.locator('html');
		await expect(html).not.toHaveClass(/dark/);

		// Add BigWig track
		await page.evaluate(async (url) => {
			// @ts-ignore
			const { useRemoteTracks } = await import('/src/lib/stores/remoteTracks.svelte.ts');
			// @ts-ignore
			const { useViewport } = await import('/src/lib/stores/viewport.svelte.ts');

			const remoteTracks = useRemoteTracks();
			const viewport = useViewport();

			viewport.navigateTo('chr17', 7661778, 7675000);

			remoteTracks.addRemoteTrack({
				id: 'light-theme-bigwig',
				name: 'PhyloP Signal',
				type: 'bigwig',
				url: url,
				assemblyId: 'GRCh38',
				color: '#10b981',
				height: 100
			});

			remoteTracks.updateForViewport(viewport.current);
		}, TEST_BIGWIG_URL);

		await page.waitForTimeout(2000);

		await expect(async () => {
			const hasFeatures = await page.evaluate(async () => {
				// @ts-ignore
				const { useRemoteTracks } = await import('/src/lib/stores/remoteTracks.svelte.ts');
				const remoteTracks = useRemoteTracks();
				const track = remoteTracks.all.find((t: { id: string }) => t.id === 'light-theme-bigwig');
				return track && track.features && track.features.length > 0 && !track.isLoading;
			});
			expect(hasFeatures).toBe(true);
		}).toPass({ timeout: 30000, intervals: [1000, 2000, 3000] });

		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('signal-track-light-theme.png', {
			maxDiffPixels: 200,
		});
	});

	test('signal track with dark theme shows color ramp', async ({ page }) => {
		// Switch to dark theme
		const settingsButton = page.locator('button[title="Settings"]');
		await settingsButton.click();
		await page.waitForTimeout(200);

		const displayTab = page.locator('button').filter({ hasText: 'Display' });
		await displayTab.click();
		await page.waitForTimeout(100);

		const darkButton = page.locator('button').filter({ hasText: 'Dark' }).first();
		await darkButton.click();
		await page.waitForTimeout(200);

		await page.keyboard.press('Escape');
		await page.waitForTimeout(200);

		// Verify dark mode
		const html = page.locator('html');
		await expect(html).toHaveClass(/dark/);

		// Add BigWig track
		await page.evaluate(async (url) => {
			// @ts-ignore
			const { useRemoteTracks } = await import('/src/lib/stores/remoteTracks.svelte.ts');
			// @ts-ignore
			const { useViewport } = await import('/src/lib/stores/viewport.svelte.ts');

			const remoteTracks = useRemoteTracks();
			const viewport = useViewport();

			viewport.navigateTo('chr17', 7661778, 7675000);

			remoteTracks.addRemoteTrack({
				id: 'dark-theme-bigwig',
				name: 'PhyloP Signal',
				type: 'bigwig',
				url: url,
				assemblyId: 'GRCh38',
				color: '#10b981',
				height: 100
			});

			remoteTracks.updateForViewport(viewport.current);
		}, TEST_BIGWIG_URL);

		await page.waitForTimeout(2000);

		await expect(async () => {
			const hasFeatures = await page.evaluate(async () => {
				// @ts-ignore
				const { useRemoteTracks } = await import('/src/lib/stores/remoteTracks.svelte.ts');
				const remoteTracks = useRemoteTracks();
				const track = remoteTracks.all.find((t: { id: string }) => t.id === 'dark-theme-bigwig');
				return track && track.features && track.features.length > 0 && !track.isLoading;
			});
			expect(hasFeatures).toBe(true);
		}).toPass({ timeout: 30000, intervals: [1000, 2000, 3000] });

		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('signal-track-dark-theme.png', {
			maxDiffPixels: 200,
		});
	});
});
