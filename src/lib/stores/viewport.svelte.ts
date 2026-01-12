/**
 * Viewport state management using Svelte 5 runes
 * Supports URL state persistence for shareable links
 */

import type { Viewport } from '$lib/types/genome';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

// Default viewport: shows a region of chromosome 1
const DEFAULT_VIEWPORT: Viewport = {
	chromosome: 'chr1',
	start: 0,
	end: 100000
};

// Reactive viewport state
let viewport = $state<Viewport>({ ...DEFAULT_VIEWPORT });

// Track whether we've initialized from URL
let initialized = false;

// Debounce timer for URL updates
let urlUpdateTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Parse viewport from URL search params
 */
function parseViewportFromURL(): Viewport | null {
	if (!browser) return null;

	const params = new URLSearchParams(window.location.search);
	const chr = params.get('chr');
	const startStr = params.get('start');
	const endStr = params.get('end');

	// Also support compact format: ?loc=chr17:7668421-7687490
	const loc = params.get('loc');
	if (loc) {
		const match = loc.match(/^([^:]+):(\d+)-(\d+)$/);
		if (match) {
			return {
				chromosome: match[1],
				start: parseInt(match[2], 10),
				end: parseInt(match[3], 10)
			};
		}
	}

	if (chr && startStr && endStr) {
		const start = parseInt(startStr, 10);
		const end = parseInt(endStr, 10);
		if (!isNaN(start) && !isNaN(end) && end > start) {
			return { chromosome: chr, start, end };
		}
	}

	return null;
}

// Session persistence timer
let sessionPersistTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Update URL with current viewport state (debounced)
 */
function syncViewportToURL(): void {
	if (!browser || !initialized) return;

	// Debounce URL updates to avoid history spam during pan/zoom
	if (urlUpdateTimeout) {
		clearTimeout(urlUpdateTimeout);
	}

	urlUpdateTimeout = setTimeout(() => {
		const params = new URLSearchParams(window.location.search);
		params.set('chr', viewport.chromosome);
		params.set('start', String(Math.round(viewport.start)));
		params.set('end', String(Math.round(viewport.end)));

		// Remove loc param if present (we use expanded format)
		params.delete('loc');

		const newUrl = `?${params.toString()}`;
		goto(newUrl, { replaceState: true, noScroll: true, keepFocus: true });
	}, 150);

	// Also persist to localStorage (more debounced)
	if (sessionPersistTimeout) {
		clearTimeout(sessionPersistTimeout);
	}
	sessionPersistTimeout = setTimeout(() => {
		// Trigger session save via tracks store
		import('./tracks.svelte').then(({ useTracks }) => {
			useTracks().persistSession();
		});
	}, 500);
}

/**
 * Initialize viewport from URL params (call once on mount)
 */
function initializeFromURL(): void {
	if (initialized) return;

	const urlViewport = parseViewportFromURL();
	if (urlViewport) {
		viewport.chromosome = urlViewport.chromosome;
		viewport.start = urlViewport.start;
		viewport.end = urlViewport.end;
	}

	initialized = true;
}

// Derived values
const viewportWidth = $derived(viewport.end - viewport.start);
const viewportCenter = $derived(viewport.start + viewportWidth / 2);

// Viewport actions
function setViewport(newViewport: Viewport): void {
	viewport.chromosome = newViewport.chromosome;
	viewport.start = Math.max(0, newViewport.start);
	viewport.end = Math.max(viewport.start + 1, newViewport.end);
	syncViewportToURL();
}

function navigateTo(chromosome: string, start: number, end: number): void {
	setViewport({ chromosome, start, end });
}

function pan(deltaPixels: number, pixelsPerBase: number): void {
	const deltaBases = Math.round(deltaPixels / pixelsPerBase);
	const newStart = Math.max(0, viewport.start - deltaBases);
	const newEnd = newStart + viewportWidth;
	setViewport({ ...viewport, start: newStart, end: newEnd });
}

function zoom(factor: number, centerBase?: number): void {
	const center = centerBase ?? viewportCenter;
	const newWidth = Math.max(100, Math.round(viewportWidth * factor));
	const newStart = Math.max(0, Math.round(center - newWidth / 2));
	const newEnd = newStart + newWidth;
	setViewport({ ...viewport, start: newStart, end: newEnd });
}

function zoomIn(): void {
	zoom(0.5);
}

function zoomOut(): void {
	zoom(2);
}

function reset(): void {
	setViewport({ ...DEFAULT_VIEWPORT });
}

// Export as a reactive store object
export function useViewport() {
	return {
		get current() { return viewport; },
		get width() { return viewportWidth; },
		get center() { return viewportCenter; },
		setViewport,
		navigateTo,
		pan,
		zoom,
		zoomIn,
		zoomOut,
		reset,
		initializeFromURL
	};
}
