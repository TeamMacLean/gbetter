/**
 * Track management store using Svelte 5 runes
 * Uses the track type registry for parsing and rendering
 */

import type { LoadedTrack, GenomicFeature as TrackFeature } from '$lib/types/tracks';
import type { GenomicFeature } from '$lib/types/genome';

/**
 * Filter criteria for features
 */
export interface FilterCriteria {
	field: string;
	operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'matches';
	value: string | number | boolean;
}

/**
 * Active filters per track (null = show all, empty array = show none)
 */
export interface TrackFilters {
	[trackId: string]: FilterCriteria[];
}

/**
 * Global filter (applies to all tracks)
 */
export interface GlobalFilter {
	criteria: FilterCriteria[];
	mode: 'hide' | 'dim'; // hide = don't render, dim = render with low opacity
}
import { getTrackTypeByExtension, getSupportedExtensions } from '$lib/services/trackRegistry';
import { initializeTrackTypes } from '$lib/services/trackTypes';
import { saveSession, loadSession, type TrackMetadata } from '$lib/services/persistence';
import { useAssembly } from '$lib/stores/assembly.svelte';
import { browser } from '$app/environment';

// Initialize track types on module load
initializeTrackTypes();

// Color palette for tracks
const TRACK_COLORS = [
	'#6366f1', // indigo
	'#22c55e', // green
	'#f59e0b', // amber
	'#ef4444', // red
	'#8b5cf6', // violet
	'#06b6d4', // cyan
	'#ec4899', // pink
	'#14b8a6', // teal
];

let colorIndex = 0;

function getNextColor(): string {
	const color = TRACK_COLORS[colorIndex % TRACK_COLORS.length];
	colorIndex++;
	return color;
}

// Reactive tracks state
let tracks = $state<LoadedTrack[]>([]);
let isLoading = $state(false);
let loadError = $state<string | null>(null);
let renderVersion = $state(0);  // Increment to force re-render

// Filter state
let trackFilters = $state<TrackFilters>({});
let globalFilter = $state<GlobalFilter | null>(null);

// Track counter for unique IDs
let trackIdCounter = 0;

function generateTrackId(): string {
	return `track_${++trackIdCounter}`;
}

// Chromosome mismatch warning state
let chromosomeMismatchWarning = $state<string | null>(null);

function clearChromosomeMismatchWarning(): void {
	chromosomeMismatchWarning = null;
}

async function addTrackFromFile(file: File): Promise<LoadedTrack | null> {
	isLoading = true;
	loadError = null;
	chromosomeMismatchWarning = null;

	try {
		const trackType = getTrackTypeByExtension(file.name);

		if (!trackType) {
			const supported = getSupportedExtensions().join(', ');
			throw new Error(`Unsupported file type. Supported: ${supported}`);
		}

		const content = await file.text();
		const result = trackType.parse(content);

		if (result.errors.length > 0) {
			console.warn(`Parse warnings for ${file.name}:`, result.errors);
		}

		if (result.features.length === 0) {
			throw new Error('No features found in file');
		}

		// Check chromosome names against current assembly
		const assembly = useAssembly();
		const featureChromosomes = new Set(result.features.map(f => f.chromosome));
		const assemblyChromosomes = new Set(assembly.chromosomes);

		const matchingChromosomes = [...featureChromosomes].filter(chr =>
			assemblyChromosomes.has(chr) || assembly.getChromosome(chr) !== undefined
		);
		const unmatchedChromosomes = [...featureChromosomes].filter(chr =>
			!assemblyChromosomes.has(chr) && assembly.getChromosome(chr) === undefined
		);

		// Warn if no chromosomes match or all chromosomes are unmatched
		if (matchingChromosomes.length === 0 && unmatchedChromosomes.length > 0) {
			const sampleUnmatched = unmatchedChromosomes.slice(0, 3).join(', ');
			const moreCount = unmatchedChromosomes.length > 3 ? ` (+${unmatchedChromosomes.length - 3} more)` : '';
			chromosomeMismatchWarning = `Warning: "${file.name}" has chromosomes (${sampleUnmatched}${moreCount}) not found in ${assembly.current.name}. Consider switching assemblies or using "inferred from data".`;
		}

		const trackId = generateTrackId();
		const track: LoadedTrack = {
			id: trackId,
			name: file.name.replace(/\.[^.]+$/, ''),
			typeId: trackType.id,
			features: result.features,
			visible: true,
			color: getNextColor(),
			height: trackType.defaultHeight,
			metadata: result.metadata,
		};

		// Store file name for session restore
		trackFileNames.set(trackId, file.name);

		// Infer chromosomes from loaded features
		assembly.inferFromFeatures(result.features);

		tracks = [...tracks, track];
		persistSession();
		return track;
	} catch (error) {
		loadError = error instanceof Error ? error.message : 'Unknown error loading file';
		console.error('Error loading track:', error);
		return null;
	} finally {
		isLoading = false;
	}
}

function removeTrack(trackId: string): void {
	tracks = tracks.filter(t => t.id !== trackId);
	trackFileNames.delete(trackId);
	persistSession();
}

function toggleTrackVisibility(trackId: string): void {
	tracks = tracks.map(t =>
		t.id === trackId ? { ...t, visible: !t.visible } : t
	);
	persistSession();
}

function setTrackColor(trackId: string, color: string): void {
	tracks = tracks.map(t =>
		t.id === trackId ? { ...t, color } : t
	);
	persistSession();
}

function setTrackHeight(trackId: string, height: number): void {
	tracks = tracks.map(t =>
		t.id === trackId ? { ...t, height: Math.max(20, Math.min(200, height)) } : t
	);
	persistSession();
}

function moveTrack(trackId: string, direction: 'up' | 'down'): void {
	const index = tracks.findIndex(t => t.id === trackId);
	if (index === -1) return;

	const newIndex = direction === 'up' ? index - 1 : index + 1;
	if (newIndex < 0 || newIndex >= tracks.length) return;

	const newTracks = [...tracks];
	[newTracks[index], newTracks[newIndex]] = [newTracks[newIndex], newTracks[index]];
	tracks = newTracks;
	persistSession();
}

function clearAllTracks(): void {
	tracks = [];
	colorIndex = 0;
	persistSession();
}

/**
 * Force a re-render of all tracks (e.g., when visual styles change)
 */
function invalidateRender(): void {
	renderVersion++;
}

// ============================================================
// FILTER FUNCTIONS
// ============================================================

/**
 * Set filter for a specific track
 */
function setTrackFilter(trackId: string, criteria: FilterCriteria[]): void {
	trackFilters = { ...trackFilters, [trackId]: criteria };
	invalidateRender();
}

/**
 * Clear filter for a specific track
 */
function clearTrackFilter(trackId: string): void {
	const { [trackId]: _, ...rest } = trackFilters;
	trackFilters = rest;
	invalidateRender();
}

/**
 * Set global filter (applies to all tracks)
 */
function setGlobalFilter(criteria: FilterCriteria[], mode: 'hide' | 'dim' = 'dim'): void {
	globalFilter = { criteria, mode };
	invalidateRender();
}

/**
 * Clear global filter
 */
function clearGlobalFilter(): void {
	globalFilter = null;
	invalidateRender();
}

/**
 * Clear all filters (track-specific and global)
 */
function clearAllFilters(): void {
	trackFilters = {};
	globalFilter = null;
	invalidateRender();
}

/**
 * Check if a feature matches filter criteria
 */
function featureMatchesCriteria(feature: TrackFeature, criteria: FilterCriteria[]): boolean {
	if (criteria.length === 0) return true;

	return criteria.every(criterion => {
		// Get the value from the feature
		let featureValue: unknown;

		// For 'type' field, check featureType first (GFF features use featureType)
		if (criterion.field === 'type' && 'featureType' in feature) {
			featureValue = (feature as { featureType?: string }).featureType;
		}
		// Check direct field on feature (only if value is not undefined)
		else if (criterion.field in feature) {
			const val = (feature as unknown as Record<string, unknown>)[criterion.field];
			if (val !== undefined) {
				featureValue = val;
			}
		}

		// If still undefined, check in attributes/info
		if (featureValue === undefined && 'attributes' in feature) {
			featureValue = (feature as { attributes?: Record<string, string> }).attributes?.[criterion.field];
		}
		if (featureValue === undefined && 'info' in feature) {
			featureValue = (feature as { info?: Record<string, string> }).info?.[criterion.field];
		}

		if (featureValue === undefined) return false;

		const strValue = String(featureValue).toLowerCase();
		const criterionValue = String(criterion.value).toLowerCase();

		switch (criterion.operator) {
			case '=':
				return strValue === criterionValue;
			case '!=':
				return strValue !== criterionValue;
			case '>':
				return Number(featureValue) > Number(criterion.value);
			case '<':
				return Number(featureValue) < Number(criterion.value);
			case '>=':
				return Number(featureValue) >= Number(criterion.value);
			case '<=':
				return Number(featureValue) <= Number(criterion.value);
			case 'contains':
				return strValue.includes(criterionValue);
			case 'matches':
				try {
					return new RegExp(String(criterion.value), 'i').test(String(featureValue));
				} catch {
					return false;
				}
			default:
				return true;
		}
	});
}

/**
 * Get filtered features for a track
 * Returns { visible: features to render normally, dimmed: features to render dimmed }
 */
function getFilteredFeatures(track: LoadedTrack): {
	visible: TrackFeature[];
	dimmed: TrackFeature[];
} {
	const trackCriteria = trackFilters[track.id];
	const hasTrackFilter = trackCriteria && trackCriteria.length > 0;
	const hasGlobalFilter = globalFilter && globalFilter.criteria.length > 0;

	// No filters - all visible
	if (!hasTrackFilter && !hasGlobalFilter) {
		return { visible: track.features, dimmed: [] };
	}

	const visible: TrackFeature[] = [];
	const dimmed: TrackFeature[] = [];

	for (const feature of track.features) {
		let matchesTrack = true;
		let matchesGlobal = true;

		// Check track-specific filter
		if (hasTrackFilter) {
			matchesTrack = featureMatchesCriteria(feature, trackCriteria);
		}

		// Check global filter
		if (hasGlobalFilter) {
			matchesGlobal = featureMatchesCriteria(feature, globalFilter!.criteria);
		}

		// Feature must match BOTH filters to be fully visible
		if (matchesTrack && matchesGlobal) {
			visible.push(feature);
		} else if (globalFilter?.mode === 'dim') {
			// Dim mode - show non-matching features with reduced opacity
			dimmed.push(feature);
		}
		// hide mode - non-matching features are not included at all
	}

	return { visible, dimmed };
}

/**
 * Check if any filters are active
 */
function hasActiveFilters(): boolean {
	return Object.keys(trackFilters).length > 0 || globalFilter !== null;
}

/**
 * Get human-readable description of active filters
 */
function getActiveFilterDescription(): string {
	const parts: string[] = [];

	if (globalFilter) {
		const desc = globalFilter.criteria
			.map(c => `${c.field}${c.operator}${c.value}`)
			.join(' AND ');
		parts.push(`Global: ${desc} (${globalFilter.mode})`);
	}

	for (const [trackId, criteria] of Object.entries(trackFilters)) {
		const track = tracks.find(t => t.id === trackId);
		const trackName = track?.name || trackId;
		const desc = criteria.map(c => `${c.field}${c.operator}${c.value}`).join(' AND ');
		parts.push(`${trackName}: ${desc}`);
	}

	return parts.join('; ') || 'No filters';
}

// Track file names for session restore
const trackFileNames = new Map<string, string>();

/**
 * Convert tracks to metadata for persistence
 */
function getTrackMetadata(): TrackMetadata[] {
	return tracks.map(t => ({
		id: t.id,
		name: t.name,
		typeId: t.typeId,
		color: t.color,
		height: t.height,
		visible: t.visible,
		fileName: trackFileNames.get(t.id) ?? `${t.name}.${t.typeId}`,
		featureCount: t.features.length
	}));
}

/**
 * Persist current session to localStorage
 */
function persistSession(): void {
	if (!browser) return;

	// Import viewport state dynamically to avoid circular dependency
	import('./viewport.svelte').then(({ useViewport }) => {
		const viewport = useViewport();
		saveSession({
			viewport: {
				chromosome: viewport.current.chromosome,
				start: viewport.current.start,
				end: viewport.current.end
			},
			tracks: getTrackMetadata(),
			ui: { sidebarCollapsed: false } // TODO: integrate with sidebar state
		});
	});
}

/**
 * Get saved session info for restore banner
 */
function getSavedSession() {
	return loadSession();
}

// Export as a reactive store object
export function useTracks() {
	return {
		get all() { return tracks; },
		get visible() { return tracks.filter(t => t.visible); },
		get isLoading() { return isLoading; },
		get error() { return loadError; },
		get renderVersion() { return renderVersion; },
		get chromosomeMismatchWarning() { return chromosomeMismatchWarning; },
		get globalFilter() { return globalFilter; },
		get trackFilters() { return trackFilters; },
		addTrackFromFile,
		removeTrack,
		toggleTrackVisibility,
		setTrackColor,
		setTrackHeight,
		moveTrack,
		clearAllTracks,
		invalidateRender,
		clearChromosomeMismatchWarning,
		persistSession,
		getSavedSession,
		getTrackMetadata,
		// Filter methods
		setTrackFilter,
		clearTrackFilter,
		setGlobalFilter,
		clearGlobalFilter,
		clearAllFilters,
		getFilteredFeatures,
		hasActiveFilters,
		getActiveFilterDescription,
	};
}
