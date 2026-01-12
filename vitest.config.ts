import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		// Unit tests run in jsdom environment
		environment: 'jsdom',

		// Include test files
		include: ['tests/unit/**/*.{test,spec}.{js,ts}'],

		// Exclude e2e tests (handled by Playwright)
		exclude: ['tests/e2e/**/*', 'node_modules/**/*'],

		// Global test utilities
		globals: true,

		// Setup files (if needed)
		// setupFiles: ['tests/setup.ts'],

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/lib/**/*.{js,ts}'],
			exclude: [
				'src/lib/**/*.svelte',
				'src/lib/types/**/*',
			],
		},

		// Resolve aliases like $lib
		alias: {
			$lib: '/src/lib',
		},
	},
});
