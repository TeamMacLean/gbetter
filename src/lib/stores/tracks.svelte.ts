/**
 * Track management store using Svelte 5 runes
 * Uses the track type registry for parsing and rendering
 */

import type { LoadedTrack } from '$lib/types/tracks';
import type { GenomicFeature } from '$lib/types/genome';
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
	};
}
