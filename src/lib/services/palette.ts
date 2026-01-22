/**
 * Color Palette System
 *
 * Accessibility-first color definitions using ColorBrewer palettes.
 * All palettes are colorblind-safe and work on both light and dark backgrounds.
 */

// =============================================================================
// PALETTE DEFINITIONS
// =============================================================================

export interface Palette {
	name: string;
	description: string;
	colors: string[];
	// Semantic assignments for genomic features
	cds: string;
	utr: string;
	exon: string;
	gene: string;
	variant: {
		snv: string;
		insertion: string;
		deletion: string;
		complex: string;
	};
}

/**
 * ColorBrewer Set2 - Soft, professional, colorblind-safe
 */
export const SET2_PALETTE: Palette = {
	name: 'Set2',
	description: 'Soft, professional colors (default)',
	colors: [
		'#66c2a5', // Teal
		'#fc8d62', // Orange
		'#8da0cb', // Blue-purple
		'#e78ac3', // Pink
		'#a6d854', // Yellow-green
		'#ffd92f', // Yellow
		'#e5c494', // Tan
		'#b3b3b3', // Gray
	],
	cds: '#66c2a5', // Teal - most prominent
	utr: '#fc8d62', // Orange - distinct from CDS
	exon: '#8da0cb', // Blue-purple
	gene: '#e78ac3', // Pink
	variant: {
		snv: '#66c2a5',
		insertion: '#fc8d62',
		deletion: '#8da0cb',
		complex: '#e78ac3',
	},
};

/**
 * ColorBrewer Dark2 - Bolder, higher contrast
 */
export const DARK2_PALETTE: Palette = {
	name: 'Dark2',
	description: 'Bold, high-contrast colors',
	colors: [
		'#1b9e77', // Dark teal
		'#d95f02', // Dark orange
		'#7570b3', // Purple
		'#e7298a', // Magenta
		'#66a61e', // Olive green
		'#e6ab02', // Mustard
		'#a6761d', // Brown
		'#666666', // Dark gray
	],
	cds: '#1b9e77',
	utr: '#d95f02',
	exon: '#7570b3',
	gene: '#e7298a',
	variant: {
		snv: '#1b9e77',
		insertion: '#d95f02',
		deletion: '#7570b3',
		complex: '#e7298a',
	},
};

/**
 * ColorBrewer Paired - 12 colors in light/dark pairs
 */
export const PAIRED_PALETTE: Palette = {
	name: 'Paired',
	description: 'Light/dark color pairs',
	colors: [
		'#a6cee3', // Light blue
		'#1f78b4', // Dark blue
		'#b2df8a', // Light green
		'#33a02c', // Dark green
		'#fb9a99', // Light red
		'#e31a1c', // Dark red
		'#fdbf6f', // Light orange
		'#ff7f00', // Dark orange
		'#cab2d6', // Light purple
		'#6a3d9a', // Dark purple
		'#ffff99', // Light yellow
		'#b15928', // Brown
	],
	cds: '#1f78b4', // Dark blue
	utr: '#ff7f00', // Dark orange
	exon: '#33a02c', // Dark green
	gene: '#6a3d9a', // Dark purple
	variant: {
		snv: '#1f78b4',
		insertion: '#33a02c',
		deletion: '#e31a1c',
		complex: '#6a3d9a',
	},
};

// All available palettes
export const PALETTES: Record<string, Palette> = {
	set2: SET2_PALETTE,
	dark2: DARK2_PALETTE,
	paired: PAIRED_PALETTE,
};

export type PaletteName = keyof typeof PALETTES;

// =============================================================================
// NUCLEOTIDE COLORS (Accessible)
// =============================================================================

/**
 * Nucleotide colors designed to avoid red-green confusion
 * Based on ColorBrewer recommendations for colorblind-safe palettes
 */
export const NUCLEOTIDE_COLORS: Record<string, string> = {
	A: '#4393c3', // Blue
	C: '#f4a582', // Orange/salmon
	G: '#7b3294', // Purple
	T: '#008080', // Teal
	U: '#008080', // Teal (RNA)
	N: '#888888', // Gray (unknown)
};

// =============================================================================
// MISMATCH & BAM COLORS
// =============================================================================

export const BAM_COLORS = {
	// Read match colors (neutral, don't distract)
	match: {
		light: '#e0e0e0', // Light gray for light theme
		dark: '#4a5568', // Darker gray for dark theme
	},
	// Mismatch - high contrast, draws attention (red is ok for alarm)
	mismatch: {
		background: '#dc2626', // Red background
		backgroundAlpha: 'rgba(220, 38, 38, 0.4)', // Semi-transparent
		text: '#ffffff',
	},
	// Insertion marker
	insertion: {
		color: '#22c55e', // Green
		marker: '#16a34a', // Darker green for marker
	},
	// Deletion
	deletion: {
		color: '#6b7280', // Gray
		gap: '#374151', // Darker gray for gap
	},
	// Soft clip
	softClip: {
		color: 'rgba(156, 163, 175, 0.5)', // Muted gray, transparent
	},
	// Coverage histogram
	coverage: {
		light: {
			fill: '#3b82f6', // Blue
			stroke: '#1d4ed8',
		},
		dark: {
			fill: '#60a5fa',
			stroke: '#3b82f6',
		},
	},
};

// =============================================================================
// SIGNAL TRACK COLORS
// =============================================================================

export const SIGNAL_COLORS = {
	// Default signal fill
	light: {
		fill: '#3b82f6',
		fillGradient: ['rgba(59, 130, 246, 0.8)', 'rgba(59, 130, 246, 0.2)'],
		stroke: '#1d4ed8',
	},
	dark: {
		fill: '#60a5fa',
		fillGradient: ['rgba(96, 165, 250, 0.8)', 'rgba(96, 165, 250, 0.2)'],
		stroke: '#3b82f6',
	},
};

// =============================================================================
// INTRON COLORS
// =============================================================================

export const INTRON_COLORS = {
	light: '#9ca3af', // Medium gray
	dark: '#475569', // Slate gray
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a palette by name
 */
export function getPalette(name: PaletteName): Palette {
	return PALETTES[name] || SET2_PALETTE;
}

/**
 * Get all available palette names
 */
export function getPaletteNames(): PaletteName[] {
	return Object.keys(PALETTES) as PaletteName[];
}

/**
 * Get color at index from a palette (wraps around)
 */
export function getPaletteColor(palette: Palette, index: number): string {
	return palette.colors[index % palette.colors.length];
}

/**
 * Adjust color lightness for dark theme
 * Increases lightness while maintaining hue
 */
export function adjustForDarkTheme(hex: string): string {
	// Simple adjustment - in practice you might want a more sophisticated approach
	// For now, just return the color (palettes should work on both themes)
	return hex;
}
