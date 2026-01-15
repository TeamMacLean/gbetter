/**
 * Remote Track Store
 *
 * Manages tracks loaded from remote indexed files (BigBed, etc.)
 * Features are fetched on-demand based on the current viewport.
 */

import { browser } from '$app/environment';
import {
	queryBigBed,
	searchBigBedByName,
	hasGeneBigBed,
	getGeneBigBedUrl,
	hasTranscriptBigBed,
	getTranscriptBigBedUrl,
	clearBigBedCache,
} from '$lib/services/bigbed';
import type { BedFeature, Viewport } from '$lib/types/genome';

// Types
interface RemoteTrack {
	id: string;
	name: string;
	type: 'bigbed';
	url: string;
	assemblyId: string;
	visible: boolean;
	color: string;
	height: number;
	userHeight: number | null; // null = auto-height, number = user-set fixed height
	isLoading: boolean;
	error: string | null;
	features: BedFeature[];
	lastViewport: Viewport | null;
}

interface RemoteTrackConfig {
	id: string;
	name: string;
	url: string;
	assemblyId: string;
	color?: string;
	height?: number;
}

// State
let remoteTracks = $state<RemoteTrack[]>([]);
let activeAssemblyId = $state<string | null>(null);

// Debounce timer for viewport changes
let fetchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const FETCH_DEBOUNCE_MS = 150;

/**
 * Add a remote track
 */
function addRemoteTrack(config: RemoteTrackConfig): RemoteTrack {
	const track: RemoteTrack = {
		id: config.id,
		name: config.name,
		type: 'bigbed',
		url: config.url,
		assemblyId: config.assemblyId,
		visible: true,
		color: config.color || '#22c55e',
		height: config.height || 100,
		userHeight: null, // null = auto-height by default
		isLoading: false,
		error: null,
		features: [],
		lastViewport: null,
	};

	remoteTracks = [...remoteTracks, track];
	return track;
}

/**
 * Remove a remote track
 */
function removeRemoteTrack(trackId: string): void {
	remoteTracks = remoteTracks.filter((t) => t.id !== trackId);
}

/**
 * Toggle track visibility
 */
function toggleRemoteTrackVisibility(trackId: string): void {
	remoteTracks = remoteTracks.map((t) =>
		t.id === trackId ? { ...t, visible: !t.visible } : t
	);
}

/**
 * Set track height
 * Set to null for auto-height, or a number for fixed height
 */
function setRemoteTrackHeight(trackId: string, height: number | null): void {
	remoteTracks = remoteTracks.map((t) =>
		t.id === trackId ? { ...t, userHeight: height } : t
	);
}

/**
 * Check if viewport has changed enough to warrant a refetch
 */
function viewportChanged(track: RemoteTrack, viewport: Viewport): boolean {
	if (!track.lastViewport) return true;
	if (track.lastViewport.chromosome !== viewport.chromosome) return true;

	// Refetch if we've panned more than 50% of the view, or zoomed significantly
	const lastWidth = track.lastViewport.end - track.lastViewport.start;
	const currentWidth = viewport.end - viewport.start;

	// Zoom changed significantly
	if (Math.abs(lastWidth - currentWidth) / lastWidth > 0.3) return true;

	// Panned outside the previously fetched region
	if (viewport.start < track.lastViewport.start) return true;
	if (viewport.end > track.lastViewport.end) return true;

	return false;
}

/**
 * Fetch features for a track based on current viewport
 * Fetches a larger region than the viewport for smoother panning
 */
async function fetchTrackFeatures(
	track: RemoteTrack,
	viewport: Viewport,
	signal?: AbortSignal
): Promise<void> {
	// Calculate fetch region (2x viewport width for panning buffer)
	const viewWidth = viewport.end - viewport.start;
	const buffer = viewWidth * 0.5;
	const fetchStart = Math.max(0, Math.floor(viewport.start - buffer));
	const fetchEnd = Math.ceil(viewport.end + buffer);

	// Update track loading state
	remoteTracks = remoteTracks.map((t) =>
		t.id === track.id ? { ...t, isLoading: true, error: null } : t
	);

	try {
		const features = await queryBigBed(
			track.url,
			viewport.chromosome,
			fetchStart,
			fetchEnd,
			{ signal }
		);

		// Update track with features
		remoteTracks = remoteTracks.map((t) =>
			t.id === track.id
				? {
						...t,
						features,
						isLoading: false,
						lastViewport: { chromosome: viewport.chromosome, start: fetchStart, end: fetchEnd },
					}
				: t
		);
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			return; // Ignore aborted requests
		}

		const message = error instanceof Error ? error.message : 'Unknown error';
		remoteTracks = remoteTracks.map((t) =>
			t.id === track.id ? { ...t, isLoading: false, error: message } : t
		);
	}
}

/**
 * Update all visible remote tracks for the current viewport
 */
let currentAbortController: AbortController | null = null;

function updateForViewport(viewport: Viewport): void {
	if (!browser) return;

	// Cancel any pending fetch
	if (fetchDebounceTimer) {
		clearTimeout(fetchDebounceTimer);
	}

	// Debounce to avoid excessive fetches during pan/zoom
	fetchDebounceTimer = setTimeout(() => {
		// Abort any in-flight requests
		if (currentAbortController) {
			currentAbortController.abort();
		}
		currentAbortController = new AbortController();

		// Fetch for all visible tracks that need updating
		const tracksToUpdate = remoteTracks.filter(
			(t) => t.visible && viewportChanged(t, viewport)
		);

		for (const track of tracksToUpdate) {
			fetchTrackFeatures(track, viewport, currentAbortController.signal);
		}
	}, FETCH_DEBOUNCE_MS);
}

/**
 * Search for a gene by name across all remote tracks
 */
async function searchGeneByName(name: string): Promise<BedFeature | null> {
	for (const track of remoteTracks) {
		try {
			const results = await searchBigBedByName(track.url, name);
			if (results.length > 0) {
				// Return the first exact match, or first partial match
				const exactMatch = results.find(
					(f) => f.name?.toLowerCase() === name.toLowerCase()
				);
				return exactMatch || results[0];
			}
		} catch {
			// Continue to next track
		}
	}
	return null;
}

/**
 * Set up gene and transcript tracks for an assembly
 */
function setupGeneTrackForAssembly(assemblyId: string): void {
	// Remove existing tracks for other assemblies
	remoteTracks = remoteTracks.filter(
		(t) => (t.id !== 'genes' && t.id !== 'transcripts') || t.assemblyId === assemblyId
	);

	// Check if we already have tracks for this assembly
	const existingGeneTrack = remoteTracks.find(
		(t) => t.id === 'genes' && t.assemblyId === assemblyId
	);
	const existingTranscriptTrack = remoteTracks.find(
		(t) => t.id === 'transcripts' && t.assemblyId === assemblyId
	);

	// Add gene track if needed
	if (!existingGeneTrack && hasGeneBigBed(assemblyId)) {
		const geneUrl = getGeneBigBedUrl(assemblyId);
		if (geneUrl) {
			addRemoteTrack({
				id: 'genes',
				name: 'Genes',
				url: geneUrl,
				assemblyId,
				color: '#22c55e',
				height: 100,
			});
		}
	}

	// Add transcript track if needed (different from genes - has exon structure)
	if (!existingTranscriptTrack && hasTranscriptBigBed(assemblyId)) {
		const transcriptUrl = getTranscriptBigBedUrl(assemblyId);
		if (transcriptUrl) {
			addRemoteTrack({
				id: 'transcripts',
				name: 'Transcripts',
				url: transcriptUrl,
				assemblyId,
				color: '#3b82f6',
				height: 120,
			});
		}
	}

	activeAssemblyId = assemblyId;
}

/**
 * Clear all remote tracks and caches
 */
function clearAll(): void {
	remoteTracks = [];
	activeAssemblyId = null;
	clearBigBedCache();
}

/**
 * Get all features from all visible remote tracks
 */
function getAllFeatures(): BedFeature[] {
	return remoteTracks
		.filter((t) => t.visible)
		.flatMap((t) => t.features);
}

// Export as a reactive store
export function useRemoteTracks() {
	return {
		get all() {
			return remoteTracks;
		},
		get visible() {
			return remoteTracks.filter((t) => t.visible);
		},
		get isLoading() {
			return remoteTracks.some((t) => t.isLoading);
		},
		get activeAssemblyId() {
			return activeAssemblyId;
		},
		addRemoteTrack,
		removeRemoteTrack,
		toggleRemoteTrackVisibility,
		setRemoteTrackHeight,
		updateForViewport,
		searchGeneByName,
		setupGeneTrackForAssembly,
		getAllFeatures,
		clearAll,
	};
}
