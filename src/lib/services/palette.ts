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
// SIGNAL TRACK COLORS & RAMPS
// =============================================================================

/**
 * Sequential color ramps for signal tracks (BigWig/bedGraph)
 * Each ramp is an array of colors from low to high values
 * Based on ColorBrewer sequential palettes (colorblind-safe)
 */
export interface SignalRamp {
	name: string;
	colors: string[]; // Array of colors from low (light) to high (dark/saturated)
}

export const SIGNAL_RAMPS: Record<string, SignalRamp> = {
	blues: {
		name: 'Blues',
		colors: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#084594'],
	},
	greens: {
		name: 'Greens',
		colors: ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b'],
	},
	purples: {
		name: 'Purples',
		colors: ['#fcfbfd', '#dadaeb', '#9e9ac8', '#6a51a3', '#3f007d'],
	},
	oranges: {
		name: 'Oranges',
		colors: ['#fff5eb', '#fdd49e', '#fdae6b', '#e6550d', '#8c2d04'],
	},
	viridis: {
		name: 'Viridis',
		colors: ['#fde725', '#5ec962', '#21918c', '#3b528b', '#440154'],
	},
};

export type SignalRampName = keyof typeof SIGNAL_RAMPS;

/**
 * Get a color from a signal ramp based on normalized value (0-1)
 */
export function getSignalRampColor(normalizedValue: number, rampName: SignalRampName = 'blues'): string {
	const ramp = SIGNAL_RAMPS[rampName] || SIGNAL_RAMPS.blues;
	const colors = ramp.colors;

	// Clamp to 0-1
	const t = Math.max(0, Math.min(1, normalizedValue));

	// Find the two colors to interpolate between
	const scaledIndex = t * (colors.length - 1);
	const lowerIndex = Math.floor(scaledIndex);
	const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
	const localT = scaledIndex - lowerIndex;

	// Interpolate between the two colors
	return interpolateColor(colors[lowerIndex], colors[upperIndex], localT);
}

/**
 * Interpolate between two hex colors
 */
function interpolateColor(color1: string, color2: string, t: number): string {
	const r1 = parseInt(color1.slice(1, 3), 16);
	const g1 = parseInt(color1.slice(3, 5), 16);
	const b1 = parseInt(color1.slice(5, 7), 16);

	const r2 = parseInt(color2.slice(1, 3), 16);
	const g2 = parseInt(color2.slice(3, 5), 16);
	const b2 = parseInt(color2.slice(5, 7), 16);

	const r = Math.round(r1 + (r2 - r1) * t);
	const g = Math.round(g1 + (g2 - g1) * t);
	const b = Math.round(b1 + (b2 - b1) * t);

	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get signal ramp color with explicit min/max range
 */
export function getSignalColor(value: number, min: number, max: number, rampName: SignalRampName = 'blues'): string {
	const range = max - min || 1;
	const normalized = (value - min) / range;
	return getSignalRampColor(normalized, rampName);
}

/**
 * Get all available signal ramp names
 */
export function getSignalRampNames(): SignalRampName[] {
	return Object.keys(SIGNAL_RAMPS) as SignalRampName[];
}

export const SIGNAL_COLORS = {
	// Default signal fill (legacy, kept for compatibility)
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
