/**
 * Zoom Threshold Constants
 *
 * Defines thresholds for different rendering modes based on zoom level.
 * These are used throughout the app to determine what level of detail to show.
 */

export const ZOOM_THRESHOLDS = {
	/**
	 * Minimum pixels per base to show nucleotide letters
	 * At 1000px canvas width with pixelsPerBase >= 8, we show ~125 bases or fewer
	 * Each nucleotide needs ~8px to be readable as a letter
	 */
	SEQUENCE_VISIBLE: 8,

	/**
	 * Minimum pixels per base to show CIGAR blocks for BAM reads
	 * Shows structured blocks instead of simple rectangles
	 */
	CIGAR_BLOCKS: 1,

	/**
	 * Maximum bases per pixel before switching to coverage histogram for BAM
	 * When basesPerPixel > 100, there are too many reads to show individually
	 */
	COVERAGE_HISTOGRAM: 100,

	/**
	 * Minimum pixels per base to show individual BAM reads
	 * Below this, reads are too dense to distinguish
	 */
	INDIVIDUAL_READS: 0.1,

	/**
	 * Minimum pixels per base to show quality scores on reads
	 * Quality-based coloring needs space to be visible
	 */
	QUALITY_VISIBLE: 4,
};

/**
 * Base colors for sequence display
 * Using distinct, colorblind-friendly colors
 */
export const BASE_COLORS: Record<string, string> = {
	A: '#22c55e', // Green
	C: '#3b82f6', // Blue
	G: '#f59e0b', // Amber/Orange
	T: '#ef4444', // Red
	U: '#ef4444', // Red (for RNA)
	N: '#888888', // Gray (unknown)
};

/**
 * Mismatch indicator color (for bases that differ from reference)
 */
export const MISMATCH_COLORS = {
	background: '#7c3aed40', // Semi-transparent purple
	text: '#ffffff',
};

/**
 * Quality score thresholds for BAM read coloring
 * Phred quality scores (0-40+)
 */
export const QUALITY_THRESHOLDS = {
	LOW: 10,      // Below this is considered low quality
	MEDIUM: 20,   // Medium quality threshold
	HIGH: 30,     // High quality threshold
};

/**
 * Convert quality score to opacity (0-1)
 * Higher quality = higher opacity
 */
export function qualityToOpacity(qual: number): number {
	if (qual < QUALITY_THRESHOLDS.LOW) {
		return 0.3;
	}
	if (qual < QUALITY_THRESHOLDS.MEDIUM) {
		return 0.5;
	}
	if (qual < QUALITY_THRESHOLDS.HIGH) {
		return 0.7;
	}
	return 1.0;
}

/**
 * Get rendering mode based on pixels per base
 */
export type RenderingMode = 'density' | 'blocks' | 'sequence';

export function getReadRenderingMode(pixelsPerBase: number): RenderingMode {
	if (pixelsPerBase >= ZOOM_THRESHOLDS.SEQUENCE_VISIBLE) {
		return 'sequence';
	}
	if (pixelsPerBase >= ZOOM_THRESHOLDS.CIGAR_BLOCKS) {
		return 'blocks';
	}
	return 'density';
}

/**
 * Check if we should show sequence at current zoom
 */
export function shouldShowSequence(pixelsPerBase: number): boolean {
	return pixelsPerBase >= ZOOM_THRESHOLDS.SEQUENCE_VISIBLE;
}

/**
 * Check if we should show quality scores at current zoom
 */
export function shouldShowQuality(pixelsPerBase: number): boolean {
	return pixelsPerBase >= ZOOM_THRESHOLDS.QUALITY_VISIBLE;
}
