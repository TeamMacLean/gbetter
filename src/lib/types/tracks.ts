/**
 * Track type system - extensible registry for different visualization types
 */

import type { GenomicFeature, Viewport } from './genome';

// Re-export GenomicFeature
export type { GenomicFeature };

/**
 * How a track behaves at different zoom levels
 */
export type ZoomBehavior =
	| 'static'           // Always render the same way
	| 'collapse'         // Collapse features when too dense
	| 'aggregate'        // Aggregate into density/histogram
	| 'detail-on-zoom';  // Show more detail when zoomed in

/**
 * Visual style for the track
 */
export type TrackStyle =
	| 'intervals'        // Simple rectangles (BED)
	| 'gene-model'       // Linked exons with introns, UTRs, CDS
	| 'signal'           // Area chart / histogram (bedGraph, BigWig)
	| 'variants'         // Lollipops / ref-alt display (VCF)
	| 'sequence';        // Nucleotide letters (FASTA)

/**
 * Context passed to renderers
 */
export interface RenderContext {
	ctx: CanvasRenderingContext2D;
	viewport: Viewport;
	canvasWidth: number;
	pixelsPerBase: number;
	trackY: number;
	trackHeight: number;
	color: string;
	// Computed helpers
	basesPerPixel: number;
	toPixelX: (pos: number) => number;
}

/**
 * Result from a parser
 */
export interface ParseResult<T = GenomicFeature> {
	features: T[];
	errors: string[];
	metadata?: Record<string, unknown>;
}

/**
 * Configuration for a track type
 */
export interface TrackTypeConfig<T extends GenomicFeature = GenomicFeature> {
	/** Unique identifier for this track type */
	id: string;

	/** Human-readable name */
	name: string;

	/** File extensions this type handles */
	extensions: string[];

	/** Visual style */
	style: TrackStyle;

	/** Default track height in pixels */
	defaultHeight: number;

	/** Zoom behavior */
	zoomBehavior: ZoomBehavior;

	/** Parse file content into features */
	parse: (content: string) => ParseResult<T>;

	/** Render features to canvas */
	render: (
		features: T[],
		context: RenderContext
	) => void;

	/** Optional: Get features visible in viewport (for optimization) */
	getVisibleFeatures?: (
		features: T[],
		viewport: Viewport
	) => T[];

	/** Optional: Custom tooltip content */
	getTooltip?: (feature: T) => string;
}

/**
 * A loaded track instance
 */
export interface LoadedTrack<T extends GenomicFeature = GenomicFeature> {
	id: string;
	name: string;
	typeId: string;
	features: T[];
	visible: boolean;
	color: string;
	height: number;
	metadata?: Record<string, unknown>;
}

/**
 * Signal data point for peak/coverage tracks
 */
export interface SignalFeature extends GenomicFeature {
	value: number;
}

/**
 * Variant feature for VCF tracks
 */
export interface VariantFeature extends GenomicFeature {
	ref: string;
	alt: string[];
	qual?: number;
	filter?: string;
	info?: Record<string, string>;
	genotypes?: Record<string, string>;
}

/**
 * Gene model with linked children
 */
export interface GeneModelFeature extends GenomicFeature {
	featureType: 'gene' | 'mRNA' | 'exon' | 'CDS' | 'UTR' | 'five_prime_UTR' | 'three_prime_UTR' | 'intron';
	parent?: string;
	children: GeneModelFeature[];
	transcriptId?: string;
	geneId?: string;
}

/**
 * Create a render context helper
 */
export function createRenderContext(
	ctx: CanvasRenderingContext2D,
	viewport: Viewport,
	canvasWidth: number,
	trackY: number,
	trackHeight: number,
	color: string
): RenderContext {
	const pixelsPerBase = canvasWidth / (viewport.end - viewport.start);
	const basesPerPixel = (viewport.end - viewport.start) / canvasWidth;

	return {
		ctx,
		viewport,
		canvasWidth,
		pixelsPerBase,
		trackY,
		trackHeight,
		color,
		basesPerPixel,
		toPixelX: (pos: number) => (pos - viewport.start) * pixelsPerBase,
	};
}
