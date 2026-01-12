/**
 * Canvas-based feature renderer
 */

import type { GenomicFeature, BedFeature, GffFeature, Track } from '$lib/types/genome';

export interface RenderContext {
	ctx: CanvasRenderingContext2D;
	viewStart: number;
	viewEnd: number;
	pixelsPerBase: number;
	trackY: number;
	trackHeight: number;
	color: string;
}

const FEATURE_HEIGHT = 12;
const FEATURE_MARGIN = 2;
const ARROW_SIZE = 6;

/**
 * Convert genomic position to pixel X coordinate
 */
function toPixelX(pos: number, viewStart: number, pixelsPerBase: number): number {
	return (pos - viewStart) * pixelsPerBase;
}

/**
 * Draw a basic rectangular feature
 */
function drawRectFeature(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	color: string,
	strand?: '+' | '-' | '.'
): void {
	ctx.fillStyle = color;

	if (width < 3) {
		// Too small, just draw a line
		ctx.fillRect(x, y, Math.max(1, width), height);
		return;
	}

	// Draw main body
	ctx.fillRect(x, y, width, height);

	// Draw strand arrow if there's room
	if (strand && strand !== '.' && width > ARROW_SIZE * 2) {
		ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
		const arrowY = y + height / 2;

		if (strand === '+') {
			// Right-pointing arrow
			ctx.beginPath();
			ctx.moveTo(x + width - ARROW_SIZE, y + 2);
			ctx.lineTo(x + width - 2, arrowY);
			ctx.lineTo(x + width - ARROW_SIZE, y + height - 2);
			ctx.closePath();
			ctx.fill();
		} else {
			// Left-pointing arrow
			ctx.beginPath();
			ctx.moveTo(x + ARROW_SIZE, y + 2);
			ctx.lineTo(x + 2, arrowY);
			ctx.lineTo(x + ARROW_SIZE, y + height - 2);
			ctx.closePath();
			ctx.fill();
		}
	}
}

/**
 * Draw a gene-style feature with introns (for BED12 or GFF with children)
 */
function drawGeneFeature(
	ctx: CanvasRenderingContext2D,
	feature: BedFeature | GffFeature,
	rc: RenderContext
): void {
	const x = toPixelX(feature.start, rc.viewStart, rc.pixelsPerBase);
	const endX = toPixelX(feature.end, rc.viewStart, rc.pixelsPerBase);
	const width = Math.max(1, endX - x);
	const y = rc.trackY + FEATURE_MARGIN;
	const height = FEATURE_HEIGHT;
	const midY = y + height / 2;

	// Check if this is a BED12 with blocks
	const bedFeature = feature as BedFeature;
	if (bedFeature.blockCount && bedFeature.blockSizes && bedFeature.blockStarts) {
		// Draw intron line
		ctx.strokeStyle = rc.color;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x, midY);
		ctx.lineTo(x + width, midY);
		ctx.stroke();

		// Draw exon blocks
		for (let i = 0; i < bedFeature.blockCount; i++) {
			const blockStart = feature.start + bedFeature.blockStarts[i];
			const blockEnd = blockStart + bedFeature.blockSizes[i];
			const blockX = toPixelX(blockStart, rc.viewStart, rc.pixelsPerBase);
			const blockEndX = toPixelX(blockEnd, rc.viewStart, rc.pixelsPerBase);
			const blockWidth = Math.max(1, blockEndX - blockX);

			drawRectFeature(ctx, blockX, y, blockWidth, height, rc.color, feature.strand);
		}
	} else {
		// Simple rectangle
		drawRectFeature(ctx, x, y, width, height, rc.color, feature.strand);
	}

	// Draw label if there's room
	if (feature.name && width > 30) {
		ctx.fillStyle = '#ffffff';
		ctx.font = '10px Inter, sans-serif';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';

		const labelX = x + 4;
		const maxLabelWidth = width - 8;
		let label = feature.name;

		// Truncate if needed
		const metrics = ctx.measureText(label);
		if (metrics.width > maxLabelWidth) {
			while (label.length > 3 && ctx.measureText(label + '...').width > maxLabelWidth) {
				label = label.slice(0, -1);
			}
			label += '...';
		}

		ctx.fillText(label, labelX, midY, maxLabelWidth);
	}
}

/**
 * Render a single track
 */
export function renderTrack(
	ctx: CanvasRenderingContext2D,
	track: Track,
	viewStart: number,
	viewEnd: number,
	pixelsPerBase: number,
	canvasWidth: number,
	yOffset: number
): number {
	const trackHeight = track.height || 60;

	// Draw track background
	ctx.fillStyle = '#1a1a1a';
	ctx.fillRect(0, yOffset, canvasWidth, trackHeight);

	// Draw track label
	ctx.fillStyle = '#666666';
	ctx.font = '11px Inter, sans-serif';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillText(track.name, 8, yOffset + 4);

	// Get visible features
	const chr = track.features[0]?.chromosome; // Assumes single chromosome for now
	const visibleFeatures = track.features.filter(f =>
		f.end > viewStart && f.start < viewEnd
	);

	// Simple row packing to avoid overlaps
	const rows: GenomicFeature[][] = [];

	for (const feature of visibleFeatures) {
		let placed = false;
		for (const row of rows) {
			const lastInRow = row[row.length - 1];
			// Add padding between features
			const padding = 5 / pixelsPerBase; // 5 pixels in base pairs
			if (feature.start >= lastInRow.end + padding) {
				row.push(feature);
				placed = true;
				break;
			}
		}
		if (!placed) {
			rows.push([feature]);
		}
	}

	// Limit to avoid rendering too many rows
	const maxRows = Math.floor((trackHeight - 20) / (FEATURE_HEIGHT + FEATURE_MARGIN * 2));
	const displayRows = rows.slice(0, maxRows);

	// Render features
	const rc: RenderContext = {
		ctx,
		viewStart,
		viewEnd,
		pixelsPerBase,
		trackY: yOffset + 18, // Start below label
		trackHeight: FEATURE_HEIGHT + FEATURE_MARGIN * 2,
		color: track.color || '#6366f1',
	};

	for (let rowIndex = 0; rowIndex < displayRows.length; rowIndex++) {
		rc.trackY = yOffset + 18 + rowIndex * (FEATURE_HEIGHT + FEATURE_MARGIN * 2);

		for (const feature of displayRows[rowIndex]) {
			drawGeneFeature(ctx, feature as BedFeature | GffFeature, rc);
		}
	}

	// Show overflow indicator if there are more rows
	if (rows.length > maxRows) {
		ctx.fillStyle = '#666666';
		ctx.font = '9px Inter, sans-serif';
		ctx.textAlign = 'right';
		ctx.fillText(`+${rows.length - maxRows} more rows`, canvasWidth - 8, yOffset + trackHeight - 8);
	}

	// Draw bottom border
	ctx.strokeStyle = '#333333';
	ctx.beginPath();
	ctx.moveTo(0, yOffset + trackHeight);
	ctx.lineTo(canvasWidth, yOffset + trackHeight);
	ctx.stroke();

	return trackHeight;
}

/**
 * Render all visible tracks
 */
export function renderAllTracks(
	ctx: CanvasRenderingContext2D,
	tracks: Track[],
	viewStart: number,
	viewEnd: number,
	pixelsPerBase: number,
	canvasWidth: number,
	startY: number
): number {
	let currentY = startY;

	for (const track of tracks) {
		if (!track.visible) continue;

		const trackHeight = renderTrack(
			ctx,
			track,
			viewStart,
			viewEnd,
			pixelsPerBase,
			canvasWidth,
			currentY
		);

		currentY += trackHeight;
	}

	return currentY - startY; // Return total height used
}
