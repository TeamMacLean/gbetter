/**
 * Gene Model Track Type (GFF3)
 * Themeable gene visualization with multiple styles
 */

import type { TrackTypeConfig, RenderContext, ParseResult, GeneModelFeature } from '$lib/types/tracks';
import type { Viewport } from '$lib/types/genome';

// =============================================================================
// THEME SYSTEM
// =============================================================================

interface ColorDef {
	fill: string;
	gradient?: [string, string];  // Optional gradient (top, bottom)
	stroke: string;
	glow?: string;  // Optional glow color
}

interface GeneModelTheme {
	name: string;
	// Dimensions
	cdsHeight: number;
	utrHeight: number;
	exonHeight: number;
	intronHeight: number;
	rowHeight: number;
	labelHeight: number;
	cornerRadius: number;
	// Colors
	cds: ColorDef;
	utr: ColorDef;
	exon: ColorDef;
	gene: ColorDef;
	intron: string;
	chevronColor: string;
	label: string;
	labelSecondary: string;
	labelBg: string;
	// Style options
	useGlow: boolean;
	useGradients: boolean;
	useInnerChevrons: boolean;
	intronStyle: 'peaked' | 'flat' | 'dashed';
}

// -----------------------------------------------------------------------------
// DARK THEME (Default) - Modern with glow effects and peaked introns
// -----------------------------------------------------------------------------
const DARK_THEME: GeneModelTheme = {
	name: 'dark',
	// Dimensions
	cdsHeight: 16,
	utrHeight: 8,
	exonHeight: 12,
	intronHeight: 2,
	rowHeight: 26,
	labelHeight: 18,
	cornerRadius: 4,
	// Colors - vibrant on dark
	cds: {
		fill: '#06b6d4',
		gradient: ['#22d3ee', '#0891b2'],
		stroke: '#0e7490',
		glow: 'rgba(6, 182, 212, 0.3)',
	},
	utr: {
		fill: '#8b5cf6',
		gradient: ['#a78bfa', '#7c3aed'],
		stroke: '#6d28d9',
		glow: 'rgba(139, 92, 246, 0.2)',
	},
	exon: {
		fill: '#3b82f6',
		gradient: ['#60a5fa', '#2563eb'],
		stroke: '#1d4ed8',
		glow: 'rgba(59, 130, 246, 0.25)',
	},
	gene: {
		fill: '#6366f1',
		gradient: ['#818cf8', '#4f46e5'],
		stroke: '#4338ca',
		glow: 'rgba(99, 102, 241, 0.25)',
	},
	intron: '#475569',
	chevronColor: 'rgba(255, 255, 255, 0.4)',
	label: '#f1f5f9',
	labelSecondary: '#94a3b8',
	labelBg: 'rgba(15, 23, 42, 0.75)',
	// Style
	useGlow: true,
	useGradients: true,
	useInnerChevrons: true,
	intronStyle: 'peaked',
};

// -----------------------------------------------------------------------------
// FLAT THEME - Clean FlatUI style, no gradients or shadows
// -----------------------------------------------------------------------------
const FLAT_THEME: GeneModelTheme = {
	name: 'flat',
	// Dimensions - slightly smaller, tighter
	cdsHeight: 14,
	utrHeight: 7,
	exonHeight: 10,
	intronHeight: 2,
	rowHeight: 22,
	labelHeight: 16,
	cornerRadius: 2,
	// Colors - FlatUI palette
	cds: {
		fill: '#1abc9c',  // Turquoise
		stroke: '#16a085',
	},
	utr: {
		fill: '#9b59b6',  // Amethyst
		stroke: '#8e44ad',
	},
	exon: {
		fill: '#3498db',  // Peter River
		stroke: '#2980b9',
	},
	gene: {
		fill: '#2ecc71',  // Emerald
		stroke: '#27ae60',
	},
	intron: '#7f8c8d',  // Asbestos
	chevronColor: 'rgba(255, 255, 255, 0.5)',
	label: '#ecf0f1',  // Clouds
	labelSecondary: '#bdc3c7',  // Silver
	labelBg: 'rgba(44, 62, 80, 0.8)',  // Wet Asphalt
	// Style
	useGlow: false,
	useGradients: false,
	useInnerChevrons: true,
	intronStyle: 'peaked',
};

// Theme registry
const THEMES: Record<string, GeneModelTheme> = {
	dark: DARK_THEME,
	flat: FLAT_THEME,
};

// Current active theme
let currentTheme: GeneModelTheme = DARK_THEME;

/**
 * Set the active gene model theme
 */
export function setGeneModelTheme(themeName: string): void {
	if (THEMES[themeName]) {
		currentTheme = THEMES[themeName];
	}
}

/**
 * Get available theme names
 */
export function getGeneModelThemes(): string[] {
	return Object.keys(THEMES);
}

/**
 * Get current theme name
 */
export function getCurrentThemeName(): string {
	return currentTheme.name;
}

/**
 * Get the current theme object (for use in other renderers)
 */
export function getCurrentTheme(): GeneModelTheme {
	return currentTheme;
}

// Export types for use in other modules
export type { GeneModelTheme, ColorDef };

// =============================================================================
// EXPORTED DRAWING HELPERS (for BigBed and other renderers)
// =============================================================================

export { roundedRect, drawPill, drawIntronConnector, drawInnerChevrons };

function parseGff3(content: string): ParseResult<GeneModelFeature> {
	const features: GeneModelFeature[] = [];
	const errors: string[] = [];
	const lines = content.split(/\r?\n/);
	const byId = new Map<string, GeneModelFeature>();
	let featureId = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line || line.startsWith('#')) continue;
		if (line.startsWith('>')) break; // FASTA section

		const fields = line.split('\t');
		if (fields.length !== 9) {
			errors.push(`Line ${i + 1}: Expected 9 fields`);
			continue;
		}

		const [seqid, source, type, startStr, endStr, scoreStr, strandStr, phaseStr, attrStr] = fields;

		// Convert 1-based to 0-based
		const start = parseInt(startStr, 10) - 1;
		const end = parseInt(endStr, 10);

		if (isNaN(start) || isNaN(end) || start < 0 || end <= start) {
			errors.push(`Line ${i + 1}: Invalid coordinates`);
			continue;
		}

		// Parse attributes
		const attrs: Record<string, string> = {};
		for (const pair of attrStr.split(';')) {
			const [key, value] = pair.split('=');
			if (key && value) {
				attrs[key.trim()] = decodeURIComponent(value.trim());
			}
		}

		// Map GFF3 types to our types
		let featureType: GeneModelFeature['featureType'] = 'exon';
		const lowerType = type.toLowerCase();
		if (lowerType === 'gene') featureType = 'gene';
		else if (lowerType === 'mrna' || lowerType === 'transcript') featureType = 'mRNA';
		else if (lowerType === 'cds') featureType = 'CDS';
		else if (lowerType === 'exon') featureType = 'exon';
		else if (lowerType === 'five_prime_utr' || lowerType === "5'utr") featureType = 'five_prime_UTR';
		else if (lowerType === 'three_prime_utr' || lowerType === "3'utr") featureType = 'three_prime_UTR';
		else if (lowerType === 'utr') featureType = 'UTR';

		const feature: GeneModelFeature = {
			id: attrs['ID'] || `gff_${featureId++}`,
			chromosome: seqid,
			start,
			end,
			name: attrs['Name'] || attrs['gene_name'] || attrs['ID'],
			strand: (strandStr === '+' || strandStr === '-') ? strandStr : '.',
			featureType,
			parent: attrs['Parent'],
			children: [],
			geneId: attrs['gene_id'],
			transcriptId: attrs['transcript_id'],
			attributes: attrs,
		};

		if (attrs['ID']) {
			byId.set(attrs['ID'], feature);
		}

		features.push(feature);
	}

	// Build parent-child relationships
	for (const feature of features) {
		if (feature.parent) {
			const parentIds = feature.parent.split(',');
			for (const pid of parentIds) {
				const parent = byId.get(pid.trim());
				if (parent) {
					parent.children.push(feature);
				}
			}
		}
	}

	return { features, errors };
}

function renderGeneModels(features: GeneModelFeature[], ctx: RenderContext): void {
	const { ctx: c, viewport, toPixelX, trackY, trackHeight, basesPerPixel, dimmedIds } = ctx;
	const theme = currentTheme;

	// Get top-level features (genes or transcripts without parents)
	const topLevel = features.filter(f =>
		f.chromosome === viewport.chromosome &&
		f.end > viewport.start &&
		f.start < viewport.end &&
		!f.parent
	);

	// If no top-level, fall back to all visible features
	const toRender = topLevel.length > 0 ? topLevel : features.filter(f =>
		f.chromosome === viewport.chromosome &&
		f.end > viewport.start &&
		f.start < viewport.end
	);

	// Row packing for genes/transcripts
	const rows: GeneModelFeature[][] = [];
	const padding = 20 * basesPerPixel;

	for (const feature of toRender) {
		let placed = false;
		for (const row of rows) {
			const last = row[row.length - 1];
			if (feature.start >= last.end + padding) {
				row.push(feature);
				placed = true;
				break;
			}
		}
		if (!placed) rows.push([feature]);
	}

	const maxRows = Math.floor((trackHeight - theme.labelHeight) / (theme.rowHeight + theme.labelHeight));
	const displayRows = rows.slice(0, maxRows);

	// Render each row
	for (let rowIdx = 0; rowIdx < displayRows.length; rowIdx++) {
		const baseY = trackY + theme.labelHeight + rowIdx * (theme.rowHeight + theme.labelHeight);

		for (const gene of displayRows[rowIdx]) {
			renderGeneOrTranscript(c, gene, viewport, toPixelX, baseY, basesPerPixel, dimmedIds);
		}
	}

	// Overflow indicator
	if (rows.length > maxRows) {
		c.fillStyle = theme.labelSecondary;
		c.font = '9px Inter, sans-serif';
		c.textAlign = 'right';
		c.fillText(`+${rows.length - maxRows} genes`, ctx.canvasWidth - 8, trackY + trackHeight - 4);
	}
}

// =============================================================================
// DRAWING HELPERS
// =============================================================================

/**
 * Draw a rounded rectangle (pill shape)
 */
function roundedRect(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
): void {
	const r = Math.min(radius, height / 2, width / 2);
	c.beginPath();
	c.moveTo(x + r, y);
	c.lineTo(x + width - r, y);
	c.quadraticCurveTo(x + width, y, x + width, y + r);
	c.lineTo(x + width, y + height - r);
	c.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
	c.lineTo(x + r, y + height);
	c.quadraticCurveTo(x, y + height, x, y + height - r);
	c.lineTo(x, y + r);
	c.quadraticCurveTo(x, y, x + r, y);
	c.closePath();
}

/**
 * Draw a pill with theme-aware styling (gradient, glow, etc.)
 */
function drawPill(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	colors: ColorDef,
	addGlow: boolean = true
): void {
	if (width < 1) width = 1;
	const theme = currentTheme;

	// Add glow effect if theme supports it
	if (theme.useGlow && addGlow && colors.glow && width > 4) {
		c.save();
		c.shadowColor = colors.glow;
		c.shadowBlur = 8;
		c.shadowOffsetY = 2;
		roundedRect(c, x, y, width, height, theme.cornerRadius);
		c.fillStyle = colors.fill;
		c.fill();
		c.restore();
	}

	// Fill - gradient or solid based on theme
	roundedRect(c, x, y, width, height, theme.cornerRadius);
	if (theme.useGradients && colors.gradient) {
		const gradient = c.createLinearGradient(x, y, x, y + height);
		gradient.addColorStop(0, colors.gradient[0]);
		gradient.addColorStop(0.5, colors.fill);
		gradient.addColorStop(1, colors.gradient[1]);
		c.fillStyle = gradient;
	} else {
		c.fillStyle = colors.fill;
	}
	c.fill();

	// Stroke
	if (width > 3) {
		c.strokeStyle = colors.stroke;
		c.lineWidth = 1;
		c.stroke();
	}

	// Highlight on top edge (gradient themes only)
	if (theme.useGradients && width > 6 && height > 4) {
		const highlightGradient = c.createLinearGradient(x, y, x, y + height * 0.4);
		highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
		highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
		roundedRect(c, x + 1, y + 1, width - 2, height * 0.4, theme.cornerRadius - 1);
		c.fillStyle = highlightGradient;
		c.fill();
	}
}

/**
 * Draw intron connector between exons
 * Supports: 'peaked' (GBrowse hat style), 'flat' (straight line), 'dashed' (dashed line)
 */
function drawIntronConnector(
	c: CanvasRenderingContext2D,
	startX: number,
	endX: number,
	centerY: number,
	exonHeight: number
): void {
	const width = endX - startX;
	if (width < 2) return;

	const theme = currentTheme;
	c.strokeStyle = theme.intron;
	c.lineWidth = 1.5;
	c.lineCap = 'round';
	c.lineJoin = 'round';

	if (theme.intronStyle === 'peaked') {
		// GBrowse-style peaked intron (hat shape)
		const peakHeight = Math.min(exonHeight * 0.6, 8);
		const midX = (startX + endX) / 2;
		const peakY = centerY - peakHeight;

		c.beginPath();
		c.moveTo(startX, centerY);
		c.lineTo(midX, peakY);
		c.lineTo(endX, centerY);
		c.stroke();
	} else if (theme.intronStyle === 'dashed') {
		// Dashed line
		c.setLineDash([4, 3]);
		c.beginPath();
		c.moveTo(startX, centerY);
		c.lineTo(endX, centerY);
		c.stroke();
		c.setLineDash([]);
	} else {
		// Flat solid line
		c.beginPath();
		c.moveTo(startX, centerY);
		c.lineTo(endX, centerY);
		c.stroke();
	}
}

/**
 * Draw inner chevrons to indicate strand direction inside exons/CDS
 */
function drawInnerChevrons(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	strand: '+' | '-' | '.'
): void {
	if (!currentTheme.useInnerChevrons) return;
	if (strand === '.' || width < 20) return;

	const chevronSpacing = 12;
	const chevronSize = Math.min(4, height * 0.25);
	const centerY = y + height / 2;

	c.strokeStyle = currentTheme.chevronColor;
	c.lineWidth = 1.5;
	c.lineCap = 'round';
	c.lineJoin = 'round';

	const startOffset = 8;
	const endOffset = 8;

	for (let cx = x + startOffset; cx < x + width - endOffset; cx += chevronSpacing) {
		c.beginPath();
		if (strand === '+') {
			c.moveTo(cx - chevronSize, centerY - chevronSize);
			c.lineTo(cx + chevronSize * 0.5, centerY);
			c.lineTo(cx - chevronSize, centerY + chevronSize);
		} else {
			c.moveTo(cx + chevronSize, centerY - chevronSize);
			c.lineTo(cx - chevronSize * 0.5, centerY);
			c.lineTo(cx + chevronSize, centerY + chevronSize);
		}
		c.stroke();
	}
}

function renderGeneOrTranscript(
	c: CanvasRenderingContext2D,
	feature: GeneModelFeature,
	viewport: Viewport,
	toPixelX: (pos: number) => number,
	baseY: number,
	_basesPerPixel: number,
	dimmedIds?: Set<string>,
	skipLabel?: boolean
): void {
	const theme = currentTheme;
	const x = toPixelX(feature.start);
	const endX = toPixelX(feature.end);
	const width = Math.max(1, endX - x);

	// Helper to check if a feature should be dimmed
	const isDimmed = (f: GeneModelFeature) => dimmedIds?.has(f.id) ?? false;

	// Get children grouped by type
	const exons = feature.children.filter(ch => ch.featureType === 'exon');
	const cdss = feature.children.filter(ch => ch.featureType === 'CDS');
	const utrs = feature.children.filter(ch =>
		ch.featureType === 'UTR' ||
		ch.featureType === 'five_prime_UTR' ||
		ch.featureType === 'three_prime_UTR'
	);

	// If this has transcripts as children, render the first transcript's structure
	const transcripts = feature.children.filter(ch => ch.featureType === 'mRNA');
	if (transcripts.length > 0) {
		const transcript = transcripts[0];
		// Pass skipLabel=true to prevent transcript from drawing its own label
		renderGeneOrTranscript(c, transcript, viewport, toPixelX, baseY, _basesPerPixel, dimmedIds, true);

		// Draw gene label above (only the gene label, not transcript)
		if (feature.name && width > 20) {
			c.fillStyle = theme.label;
			c.font = '600 10px Inter, system-ui, sans-serif';
			c.textAlign = 'left';
			c.fillText(feature.name, x, baseY - 4);
		}
		return;
	}

	const centerY = baseY + theme.rowHeight / 2;
	const strand = feature.strand ?? '.';

	// Collect all exon-like regions for intron drawing
	const allExonRegions = [...exons, ...cdss, ...utrs]
		.sort((a, b) => a.start - b.start);

	// Draw intron connectors between exons (peaked style)
	if (allExonRegions.length > 1) {
		for (let i = 0; i < allExonRegions.length - 1; i++) {
			const current = allExonRegions[i];
			const next = allExonRegions[i + 1];
			const intronStart = toPixelX(current.end);
			const intronEnd = toPixelX(next.start);
			if (intronEnd > intronStart + 2) {
				drawIntronConnector(c, intronStart, intronEnd, centerY, theme.cdsHeight);
			}
		}
	} else if (width > 10 && allExonRegions.length === 0) {
		// Single span with no structure - draw line
		drawIntronConnector(c, x, x + width, centerY, theme.exonHeight);
	}

	// Helper to apply dimming for a feature
	const withDimming = (f: GeneModelFeature, draw: () => void) => {
		if (isDimmed(f)) {
			c.save();
			c.globalAlpha = 0.25;
			draw();
			c.restore();
		} else {
			draw();
		}
	};

	// If we have CDS and exons, draw with filter-aware layering
	if (cdss.length > 0 && exons.length > 0) {
		// Separate dimmed and visible features
		const dimmedExons = exons.filter(isDimmed);
		const visibleExons = exons.filter(e => !isDimmed(e));
		const dimmedCds = cdss.filter(isDimmed);
		const visibleCds = cdss.filter(c => !isDimmed(c));

		// FIRST PASS: Draw all dimmed features (behind)
		c.save();
		c.globalAlpha = 0.25;

		// Dimmed exons as UTR style
		for (const exon of dimmedExons) {
			const ex = toPixelX(exon.start);
			const ew = Math.max(1, toPixelX(exon.end) - ex);
			const ey = centerY - theme.utrHeight / 2;
			drawPill(c, ex, ey, ew, theme.utrHeight, theme.utr, false);
		}

		// Dimmed CDS
		for (const cds of dimmedCds) {
			const cx = toPixelX(cds.start);
			const cw = Math.max(1, toPixelX(cds.end) - cx);
			const cy = centerY - theme.cdsHeight / 2;
			drawPill(c, cx, cy, cw, theme.cdsHeight, theme.cds);
			drawInnerChevrons(c, cx, cy, cw, theme.cdsHeight, strand);
		}

		c.restore();

		// SECOND PASS: Draw visible features on top
		// Visible exons - draw as proper exons (not UTR style) when CDS is dimmed
		for (const exon of visibleExons) {
			const ex = toPixelX(exon.start);
			const ew = Math.max(1, toPixelX(exon.end) - ex);
			// Use full exon style if CDS is being filtered out
			if (dimmedCds.length > 0 && visibleCds.length === 0) {
				const ey = centerY - theme.exonHeight / 2;
				drawPill(c, ex, ey, ew, theme.exonHeight, theme.exon);
				drawInnerChevrons(c, ex, ey, ew, theme.exonHeight, strand);
			} else {
				// Normal UTR style when both visible
				const ey = centerY - theme.utrHeight / 2;
				drawPill(c, ex, ey, ew, theme.utrHeight, theme.utr, false);
			}
		}

		// Visible CDS on top
		for (const cds of visibleCds) {
			const cx = toPixelX(cds.start);
			const cw = Math.max(1, toPixelX(cds.end) - cx);
			const cy = centerY - theme.cdsHeight / 2;
			drawPill(c, cx, cy, cw, theme.cdsHeight, theme.cds);
			drawInnerChevrons(c, cx, cy, cw, theme.cdsHeight, strand);
		}
	} else if (exons.length > 0) {
		// Just exons with inner chevrons
		for (const exon of exons) {
			withDimming(exon, () => {
				const ex = toPixelX(exon.start);
				const ew = Math.max(1, toPixelX(exon.end) - ex);
				const ey = centerY - theme.exonHeight / 2;
				drawPill(c, ex, ey, ew, theme.exonHeight, theme.exon);
				drawInnerChevrons(c, ex, ey, ew, theme.exonHeight, strand);
			});
		}
	} else if (cdss.length > 0) {
		// Just CDS with inner chevrons
		for (const cds of cdss) {
			withDimming(cds, () => {
				const cx = toPixelX(cds.start);
				const cw = Math.max(1, toPixelX(cds.end) - cx);
				const cy = centerY - theme.cdsHeight / 2;
				drawPill(c, cx, cy, cw, theme.cdsHeight, theme.cds);
				drawInnerChevrons(c, cx, cy, cw, theme.cdsHeight, strand);
			});
		}
	} else if (utrs.length > 0) {
		// Just UTRs
		for (const utr of utrs) {
			withDimming(utr, () => {
				const ux = toPixelX(utr.start);
				const uw = Math.max(1, toPixelX(utr.end) - ux);
				drawPill(c, ux, centerY - theme.utrHeight / 2, uw, theme.utrHeight, theme.utr);
			});
		}
	} else {
		// No children - draw as single pill with chevrons (check parent feature)
		withDimming(feature, () => {
			const gy = centerY - theme.exonHeight / 2;
			drawPill(c, x, gy, width, theme.exonHeight, theme.gene);
			drawInnerChevrons(c, x, gy, width, theme.exonHeight, strand);
		});
	}

	// Draw label with modern typography and subtle background (skip if parent handles it)
	if (feature.name && width > 25 && !skipLabel) {
		c.font = '600 10px Inter, system-ui, sans-serif';
		c.textAlign = 'left';

		let label = feature.name;
		const maxWidth = width - 6;
		const textWidth = c.measureText(label).width;

		if (textWidth > maxWidth) {
			while (label.length > 3 && c.measureText(label + '…').width > maxWidth) {
				label = label.slice(0, -1);
			}
			label += '…';
		}

		const labelX = x + 2;
		const labelY = baseY - 4;
		const measuredWidth = c.measureText(label).width;

		// Subtle background pill for label
		if (measuredWidth > 10) {
			c.fillStyle = theme.labelBg;
			roundedRect(c, labelX - 3, labelY - 10, measuredWidth + 6, 13, 3);
			c.fill();
		}

		c.fillStyle = theme.label;
		c.fillText(label, labelX, labelY, maxWidth);
	}
}

export const geneModelTrackType: TrackTypeConfig<GeneModelFeature> = {
	id: 'gene-model',
	name: 'Gene Models (GFF3)',
	extensions: ['gff', 'gff3', 'gtf'],
	style: 'gene-model',
	defaultHeight: 100,
	zoomBehavior: 'collapse',
	parse: parseGff3,
	render: renderGeneModels,
};
