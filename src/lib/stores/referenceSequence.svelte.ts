/**
 * Reference Sequence Store
 *
 * Manages reference sequence data for the current assembly.
 * Handles both:
 * - Built-in assemblies with auto-fetched references from UCSC 2bit
 * - Custom assemblies with user-provided FASTA/2bit files
 */

import { query2bit, queryFasta, get2bitUrl, clearReferenceCache } from '$lib/services/fasta';

// Types
export interface ReferenceSequenceState {
	/** Current sequence for the visible viewport */
	sequence: string;
	/** Chromosome the sequence is from */
	chromosome: string;
	/** Start position (0-based) */
	start: number;
	/** End position (exclusive) */
	end: number;
	/** Whether we're currently fetching */
	isLoading: boolean;
	/** Any error that occurred */
	error: string | null;
	/** Whether reference is available for current assembly */
	isAvailable: boolean;
	/** Source type */
	sourceType: '2bit' | 'fasta' | 'local-2bit' | 'local-fasta' | null;
	/** Source URL (for remote) */
	sourceUrl: string | null;
}

// State
let sequence = $state('');
let chromosome = $state('');
let start = $state(0);
let end = $state(0);
let isLoading = $state(false);
let error = $state<string | null>(null);
let isAvailable = $state(false);
let sourceType = $state<'2bit' | 'fasta' | 'local-2bit' | 'local-fasta' | null>(null);
let sourceUrl = $state<string | null>(null);

// User-provided reference files for custom assemblies
let userReferenceUrl = $state<string | null>(null);
let userReferenceIndexUrl = $state<string | null>(null); // For FASTA .fai
let userReferenceType = $state<'2bit' | 'fasta' | null>(null);

// Local file references
let localReferenceFile = $state<File | null>(null);
let localReferenceIndexFile = $state<File | null>(null);

// Track current assembly for auto-setup
let currentAssemblyId = $state<string | null>(null);

// Debounce timer for viewport updates
let fetchTimer: ReturnType<typeof setTimeout> | null = null;
const FETCH_DEBOUNCE_MS = 100;

// Track last fetched region to avoid duplicate fetches
let lastFetchKey = '';

/**
 * Set up reference for an assembly
 * Automatically uses UCSC 2bit if available
 */
function setupForAssembly(assemblyId: string): void {
	if (currentAssemblyId === assemblyId) return;
	currentAssemblyId = assemblyId;

	// Clear any existing state
	sequence = '';
	error = null;

	// Check for built-in 2bit URL
	const twoBitUrl = get2bitUrl(assemblyId);
	if (twoBitUrl) {
		sourceType = '2bit';
		sourceUrl = twoBitUrl;
		isAvailable = true;
		return;
	}

	// Check for user-provided reference
	if (userReferenceUrl) {
		sourceType = userReferenceType;
		sourceUrl = userReferenceUrl;
		isAvailable = true;
		return;
	}

	// Check for local reference file
	if (localReferenceFile) {
		sourceType = localReferenceFile.name.toLowerCase().endsWith('.2bit')
			? 'local-2bit'
			: 'local-fasta';
		sourceUrl = null;
		isAvailable = true;
		return;
	}

	// No reference available
	sourceType = null;
	sourceUrl = null;
	isAvailable = false;
}

/**
 * Set a user-provided reference URL
 * For custom assemblies without built-in references
 */
function setUserReference(
	url: string,
	type: '2bit' | 'fasta',
	indexUrl?: string
): void {
	userReferenceUrl = url;
	userReferenceType = type;
	userReferenceIndexUrl = indexUrl || null;

	// Update current state if we have no other source
	if (!sourceUrl && !localReferenceFile) {
		sourceType = type;
		sourceUrl = url;
		isAvailable = true;
	}

	// Re-setup for current assembly to pick up the new reference
	if (currentAssemblyId) {
		const assemblyId = currentAssemblyId;
		currentAssemblyId = null; // Force re-setup
		setupForAssembly(assemblyId);
	}
}

/**
 * Set a user-provided local reference file
 */
function setLocalReference(file: File, indexFile?: File): void {
	localReferenceFile = file;
	localReferenceIndexFile = indexFile || null;

	const is2bit = file.name.toLowerCase().endsWith('.2bit');
	sourceType = is2bit ? 'local-2bit' : 'local-fasta';
	sourceUrl = null;
	isAvailable = true;

	// Clear any remote user reference
	userReferenceUrl = null;
	userReferenceType = null;
	userReferenceIndexUrl = null;
}

/**
 * Clear user-provided reference
 */
function clearUserReference(): void {
	userReferenceUrl = null;
	userReferenceType = null;
	userReferenceIndexUrl = null;
	localReferenceFile = null;
	localReferenceIndexFile = null;

	// Re-setup for current assembly
	if (currentAssemblyId) {
		const assemblyId = currentAssemblyId;
		currentAssemblyId = null;
		setupForAssembly(assemblyId);
	}
}

/**
 * Fetch sequence for a genomic region
 */
async function fetchSequence(
	chr: string,
	regionStart: number,
	regionEnd: number,
	options: { signal?: AbortSignal } = {}
): Promise<string> {
	if (!isAvailable) {
		return '';
	}

	const fetchKey = `${chr}:${regionStart}-${regionEnd}`;
	if (fetchKey === lastFetchKey && sequence) {
		return sequence;
	}

	isLoading = true;
	error = null;

	try {
		let fetchedSequence = '';

		if (sourceType === '2bit' && sourceUrl) {
			fetchedSequence = await query2bit(sourceUrl, chr, regionStart, regionEnd, options);
		} else if (sourceType === 'fasta' && sourceUrl && userReferenceIndexUrl) {
			fetchedSequence = await queryFasta(
				sourceUrl,
				userReferenceIndexUrl,
				chr,
				regionStart,
				regionEnd,
				options
			);
		} else if (sourceType === 'local-2bit' && localReferenceFile) {
			// Import dynamically to avoid circular deps
			const { queryLocal2bit } = await import('$lib/services/fasta');
			fetchedSequence = await queryLocal2bit(localReferenceFile, chr, regionStart, regionEnd, options);
		} else if (sourceType === 'local-fasta' && localReferenceFile && localReferenceIndexFile) {
			const { queryLocalFasta } = await import('$lib/services/fasta');
			fetchedSequence = await queryLocalFasta(
				localReferenceFile,
				localReferenceIndexFile,
				chr,
				regionStart,
				regionEnd,
				options
			);
		}

		sequence = fetchedSequence;
		chromosome = chr;
		start = regionStart;
		end = regionEnd;
		lastFetchKey = fetchKey;

		return fetchedSequence;
	} catch (err) {
		error = err instanceof Error ? err.message : 'Failed to fetch sequence';
		console.error('Error fetching reference sequence:', err);
		return '';
	} finally {
		isLoading = false;
	}
}

/**
 * Update for viewport - debounced
 * Only fetches if zoomed in far enough to show sequence
 */
function updateForViewport(
	chr: string,
	viewportStart: number,
	viewportEnd: number,
	pixelsPerBase: number,
	options: { signal?: AbortSignal } = {}
): void {
	// Only fetch if we can actually show sequence (8+ pixels per base)
	const SEQUENCE_VISIBLE_THRESHOLD = 8;
	if (pixelsPerBase < SEQUENCE_VISIBLE_THRESHOLD) {
		// Clear sequence when zoomed out
		if (sequence) {
			sequence = '';
			lastFetchKey = '';
		}
		return;
	}

	if (!isAvailable) {
		return;
	}

	// Debounce the fetch
	if (fetchTimer) {
		clearTimeout(fetchTimer);
	}

	fetchTimer = setTimeout(() => {
		fetchSequence(chr, viewportStart, viewportEnd, options);
	}, FETCH_DEBOUNCE_MS);
}

/**
 * Get sequence for a specific position (single base)
 */
function getBaseAt(pos: number): string {
	if (!sequence || pos < start || pos >= end) {
		return '';
	}
	return sequence[pos - start] || '';
}

/**
 * Get sequence for a range (relative to current loaded sequence)
 */
function getSequenceRange(rangeStart: number, rangeEnd: number): string {
	if (!sequence) {
		return '';
	}

	// Clamp to loaded range
	const clampedStart = Math.max(start, rangeStart);
	const clampedEnd = Math.min(end, rangeEnd);

	if (clampedStart >= clampedEnd) {
		return '';
	}

	return sequence.slice(clampedStart - start, clampedEnd - start);
}

/**
 * Clear all state and cache
 */
function clear(): void {
	sequence = '';
	chromosome = '';
	start = 0;
	end = 0;
	error = null;
	lastFetchKey = '';
	clearReferenceCache();
}

/**
 * Create the reference sequence store
 */
export function useReferenceSequence() {
	return {
		// State (read-only)
		get sequence() { return sequence; },
		get chromosome() { return chromosome; },
		get start() { return start; },
		get end() { return end; },
		get isLoading() { return isLoading; },
		get error() { return error; },
		get isAvailable() { return isAvailable; },
		get sourceType() { return sourceType; },
		get sourceUrl() { return sourceUrl; },
		get currentAssemblyId() { return currentAssemblyId; },

		// Actions
		setupForAssembly,
		setUserReference,
		setLocalReference,
		clearUserReference,
		fetchSequence,
		updateForViewport,
		getBaseAt,
		getSequenceRange,
		clear,
	};
}

// Singleton instance for components that can't use hooks pattern
let instance: ReturnType<typeof useReferenceSequence> | null = null;

export function getReferenceSequence(): ReturnType<typeof useReferenceSequence> {
	if (!instance) {
		instance = useReferenceSequence();
	}
	return instance;
}
