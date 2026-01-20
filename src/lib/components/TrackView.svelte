<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { useViewport } from '$lib/stores/viewport.svelte';
	import { useTracks } from '$lib/stores/tracks.svelte';
	import { useRemoteTracks, getRawFeatures } from '$lib/stores/remoteTracks.svelte';
	import { useLocalBinaryTracks, getLocalBinaryRawFeatures } from '$lib/stores/localBinaryTracks.svelte';
	import { useAssembly } from '$lib/stores/assembly.svelte';
	import { formatCoordinate } from '$lib/types/genome';
	import type { SignalFeature } from '$lib/types/tracks';
	import { getTrackType } from '$lib/services/trackRegistry';
	import { createRenderContext } from '$lib/types/tracks';
	import {
		getCurrentTheme,
		roundedRect,
		drawPill,
		drawIntronConnector,
		drawInnerChevrons,
	} from '$lib/services/trackTypes/geneModel';

	const viewport = useViewport();
	const tracks = useTracks();
	const remoteTracks = useRemoteTracks();
	const localBinaryTracks = useLocalBinaryTracks();
	const assembly = useAssembly();

	// Initialize viewport from URL on mount and set up gene track
	onMount(() => {
		viewport.initializeFromURL();

		// Set up gene track for current assembly
		remoteTracks.setupGeneTrackForAssembly(assembly.current.id);

		// Support loading BigWig track via URL parameter for testing
		// Usage: ?bigwig=<url>&bigwig_name=<name>
		const params = new URLSearchParams(window.location.search);
		const bigwigUrl = params.get('bigwig');
		if (bigwigUrl) {
			const bigwigName = params.get('bigwig_name') || 'BigWig Track';
			remoteTracks.addRemoteTrack({
				id: `bigwig-${Date.now()}`,
				name: bigwigName,
				type: 'bigwig',
				url: bigwigUrl,
				assemblyId: assembly.current.id,
				color: '#10b981',
				height: 100
			});
		}

		// Immediately fetch features for the viewport (after all tracks are added)
		remoteTracks.updateForViewport(viewport.current);
	});

	// Update remote tracks and local binary tracks when viewport changes
	// IMPORTANT: Use untrack to prevent this effect from depending on track state
	// Otherwise updating isLoading/features triggers a loop that aborts in-flight requests
	// CRITICAL: Must explicitly read .chromosome, .start, .end to track fine-grained changes
	// Just reading viewport.current (the object) won't detect property mutations in Svelte 5
	$effect(() => {
		const vp = viewport.current;
		// Explicitly read properties to create fine-grained dependencies
		const _chr = vp.chromosome;
		const _start = vp.start;
		const _end = vp.end;
		untrack(() => {
			remoteTracks.updateForViewport(vp);
			localBinaryTracks.updateForViewport(vp);
		});
	});

	// Update gene track when assembly changes
	$effect(() => {
		const assemblyId = assembly.current.id;
		const activeId = remoteTracks.activeAssemblyId;
		if (assemblyId !== activeId) {
			// Use untrack for the mutations to prevent re-triggering this effect
			untrack(() => {
				remoteTracks.setupGeneTrackForAssembly(assemblyId);
				// Force viewport update to fetch data for new track
				remoteTracks.updateForViewport(viewport.current);
			});
		}
	});

	let containerEl: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let containerWidth = $state(800);
	let containerHeight = $state(400);

	// File drop state
	let isDragOver = $state(false);

	// Track resize state
	interface TrackBorder {
		trackId: string;
		trackType: 'local' | 'remote';
		y: number; // Y position of bottom border
	}
	let trackBorders = $state<TrackBorder[]>([]);
	let isResizing = $state(false);
	let resizeTrackId = $state<string | null>(null);
	let resizeTrackType = $state<'local' | 'remote' | null>(null);
	let resizeStartY = $state(0);
	let resizeStartHeight = $state(0);
	let isNearBorder = $state(false);
	const BORDER_HIT_ZONE = 6; // pixels from border to trigger resize

	// Calculate pixels per base
	const pixelsPerBase = $derived(containerWidth / viewport.width);

	// Handle resize
	$effect(() => {
		if (!containerEl) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerWidth = entry.contentRect.width;
				containerHeight = entry.contentRect.height;
			}
		});

		observer.observe(containerEl);
		return () => observer.disconnect();
	});

	// Render canvas
	$effect(() => {
		// IMPORTANT: Read reactive dependencies BEFORE any early returns
		// Otherwise Svelte won't track them and the effect won't re-run
		const _version = tracks.renderVersion;
		const _remoteRenderVersion = remoteTracks.renderVersion; // Track rawFeaturesStore changes
		const _localBinaryRenderVersion = localBinaryTracks.renderVersion; // Track local binary track changes
		const visibleRemote = remoteTracks.visible;
		const visibleLocalBinary = localBinaryTracks.visible;
		const _remoteFeatures = visibleRemote.map(t => t.features.length);
		const _remoteHeights = visibleRemote.map(t => t.userHeight); // Track height changes
		const _localBinaryFeatures = visibleLocalBinary.map(t => t.features.length);
		const _localBinaryHeights = visibleLocalBinary.map(t => t.userHeight);

		if (!canvasEl) return;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		// Set canvas size with DPR for crisp rendering
		const dpr = window.devicePixelRatio || 1;
		const width = containerWidth;
		const height = containerHeight;

		canvasEl.width = width * dpr;
		canvasEl.height = height * dpr;
		canvasEl.style.width = `${width}px`;
		canvasEl.style.height = `${height}px`;
		ctx.scale(dpr, dpr);

		// Clear with background color
		ctx.fillStyle = '#0f0f0f';
		ctx.fillRect(0, 0, width, height);

		// Draw ruler
		const rulerHeight = drawRuler(ctx, width);

		// Check for content (local tracks, remote tracks, or local binary tracks)
		const visibleLocalTracks = tracks.visible;
		const visibleRemoteTracks = remoteTracks.visible;
		const visibleLocalBinaryTracks = localBinaryTracks.visible;
		const hasLocalContent = visibleLocalTracks.some(t =>
			t.features.some(f => f.chromosome === viewport.current.chromosome)
		);
		const hasRemoteContent = visibleRemoteTracks.some(t => {
			const rawFeatures = getRawFeatures(t.id);
			return rawFeatures && rawFeatures.length > 0;
		});
		const hasLocalBinaryContent = visibleLocalBinaryTracks.some(t => {
			const rawFeatures = getLocalBinaryRawFeatures(t.id);
			return rawFeatures && rawFeatures.length > 0;
		});

		// Reset track borders for resize hit detection
		const newBorders: TrackBorder[] = [];

		if (hasLocalContent || hasRemoteContent || hasLocalBinaryContent) {
			let currentY = rulerHeight;

			// Render remote tracks first (gene models)
			if (hasRemoteContent) {
				currentY = renderRemoteTracks(ctx, width, currentY, newBorders);
			}

			// Render local binary tracks
			if (hasLocalBinaryContent) {
				currentY = renderLocalBinaryTracks(ctx, width, currentY, newBorders);
			}

			// Render local text tracks
			if (hasLocalContent) {
				const chrTracks = visibleLocalTracks.filter(t =>
					t.features.some(f => f.chromosome === viewport.current.chromosome)
				);
				renderTracksWithRegistry(ctx, chrTracks, width, currentY);
			}
		} else {
			drawPlaceholder(ctx, width, height, rulerHeight);
		}

		// Update track borders state for resize detection
		trackBorders = newBorders;

		// Draw highlights on top
		drawHighlights(ctx, width, height, rulerHeight);
	});

	/**
	 * Calculate the number of rows needed for gene packing
	 */
	function calculateGeneRows(
		features: import('$lib/types/genome').BedFeature[],
		width: number
	): number {
		const rows: Array<{ end: number }> = [];

		const visibleFeatures = features.filter(f =>
			f.end > viewport.current.start && f.start < viewport.current.end
		);

		for (const feature of visibleFeatures) {
			const startX = Math.max(0, (feature.start - viewport.current.start) * pixelsPerBase);
			let rowIndex = 0;

			for (let i = 0; i < rows.length; i++) {
				if (rows[i].end < startX - 5) {
					rowIndex = i;
					break;
				}
				rowIndex = i + 1;
			}

			const endX = Math.min(width, (feature.end - viewport.current.start) * pixelsPerBase);
			if (rows[rowIndex]) {
				rows[rowIndex].end = endX;
			} else {
				rows[rowIndex] = { end: endX };
			}
		}

		return Math.max(1, rows.length);
	}

	/**
	 * Render remote tracks (BigBed gene models)
	 */
	function renderRemoteTracks(
		ctx: CanvasRenderingContext2D,
		width: number,
		startY: number,
		borders: TrackBorder[]
	): number {
		let currentY = startY;

		for (const track of remoteTracks.visible) {
			if (track.features.length === 0 && !track.isLoading) continue;

			// Calculate track height - use user-set height if available, otherwise auto-calculate
			let trackHeight: number;
			if (track.userHeight !== null && track.userHeight !== undefined) {
				// User has set a specific height
				trackHeight = track.userHeight;
			} else {
				// Auto-calculate based on number of gene rows
				// Note: For BigWig tracks, we don't need row packing - use a fixed height
				if (track.type === 'bigwig') {
					trackHeight = track.height || 100;
				} else {
					const labelOffset = 18;
					const featureHeight = 12;
					const rowSpacing = 4;
					const rowCount = calculateGeneRows(track.features as import('$lib/types/genome').BedFeature[], width);
					const minHeight = 50;
					const maxHeight = 300;
					const calculatedHeight = labelOffset + (rowCount * (featureHeight + rowSpacing)) + 20;
					trackHeight = Math.min(maxHeight, Math.max(minHeight, calculatedHeight));
				}
			}

			// Draw track label background
			ctx.fillStyle = '#1a1a1a';
			ctx.fillRect(0, currentY, width, trackHeight);

			// Draw track label
			ctx.fillStyle = '#666666';
			ctx.font = '11px Inter, sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(track.name, 8, currentY + 11);

			// Draw loading indicator
			if (track.isLoading) {
				ctx.fillStyle = '#6366f1';
				ctx.font = '10px Inter, sans-serif';
				ctx.fillText('Loading...', 8, currentY + 24);
			}

			// Draw error if any
			if (track.error) {
				ctx.fillStyle = '#ef4444';
				ctx.font = '10px Inter, sans-serif';
				ctx.fillText(`Error: ${track.error}`, 8, currentY + 24);
			}

			// Draw badge (based on track type)
			ctx.fillStyle = '#444444';
			ctx.font = '9px Inter, sans-serif';
			let badge = track.id === 'transcripts' ? 'TRANSCRIPTS' : 'GENES';
			if (track.type === 'bigwig') {
				badge = 'SIGNAL';
			}
			const badgeWidth = ctx.measureText(badge).width + 8;
			ctx.fillRect(width - badgeWidth - 8, currentY + 2, badgeWidth, 14);
			ctx.fillStyle = '#888888';
			ctx.textAlign = 'center';
			ctx.fillText(badge, width - badgeWidth / 2 - 8, currentY + 11);

			// Render features based on track type
			if (track.features.length > 0) {
				if (track.type === 'bigwig') {
					// CRITICAL: Use getRawFeatures() to get non-proxied array for performance
					// Svelte 5's $state creates deep proxies that cause O(n^2) behavior in tight loops
					const rawFeatures = getRawFeatures(track.id) as SignalFeature[];
					renderSignalFeatures(ctx, rawFeatures, width, currentY, trackHeight, track.color);
				} else {
					renderBedFeatures(ctx, track.features as import('$lib/types/genome').BedFeature[], width, currentY, trackHeight, track.color);
				}
			}

			// Draw bottom border (thicker when being hovered for resize)
			const borderY = currentY + trackHeight;
			const isHoveredBorder = isNearBorder && resizeTrackId === track.id;
			ctx.strokeStyle = isHoveredBorder ? '#666666' : '#333333';
			ctx.lineWidth = isHoveredBorder ? 2 : 1;
			ctx.beginPath();
			ctx.moveTo(0, borderY);
			ctx.lineTo(width, borderY);
			ctx.stroke();
			ctx.lineWidth = 1;

			// Record border position for resize hit detection
			borders.push({
				trackId: track.id,
				trackType: 'remote',
				y: borderY
			});

			currentY += trackHeight;
		}

		return currentY;
	}

	/**
	 * Render local binary tracks (BigBed, BigWig, BAM, tabix)
	 */
	function renderLocalBinaryTracks(
		ctx: CanvasRenderingContext2D,
		width: number,
		startY: number,
		borders: TrackBorder[]
	): number {
		let currentY = startY;

		for (const track of localBinaryTracks.visible) {
			if (track.features.length === 0 && !track.isLoading) continue;

			// Calculate track height
			let trackHeight: number;
			if (track.userHeight !== null && track.userHeight !== undefined) {
				trackHeight = track.userHeight;
			} else {
				// Auto-calculate based on track type
				if (track.type === 'bigwig') {
					trackHeight = track.height || 100;
				} else {
					const labelOffset = 18;
					const featureHeight = 12;
					const rowSpacing = 4;
					const rowCount = calculateGeneRows(track.features as import('$lib/types/genome').BedFeature[], width);
					const minHeight = 50;
					const maxHeight = 300;
					const calculatedHeight = labelOffset + (rowCount * (featureHeight + rowSpacing)) + 20;
					trackHeight = Math.min(maxHeight, Math.max(minHeight, calculatedHeight));
				}
			}

			// Draw track label background
			ctx.fillStyle = '#1a1a1a';
			ctx.fillRect(0, currentY, width, trackHeight);

			// Draw track label
			ctx.fillStyle = '#666666';
			ctx.font = '11px Inter, sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(track.name, 8, currentY + 11);

			// Draw loading indicator
			if (track.isLoading) {
				ctx.fillStyle = '#6366f1';
				ctx.font = '10px Inter, sans-serif';
				ctx.fillText('Loading...', 8, currentY + 24);
			}

			// Draw error if any
			if (track.error) {
				ctx.fillStyle = '#ef4444';
				ctx.font = '10px Inter, sans-serif';
				ctx.fillText(`Error: ${track.error}`, 8, currentY + 24);
			}

			// Draw badge
			ctx.fillStyle = '#444444';
			ctx.font = '9px Inter, sans-serif';
			const badgeMap: Record<string, string> = {
				bigwig: 'SIGNAL',
				bigbed: 'BIGBED',
				bam: 'BAM',
				vcf: 'VCF',
				gff: 'GFF',
				bed: 'BED',
			};
			const badge = (badgeMap[track.type] || track.type.toUpperCase()) + ' (local)';
			const badgeWidth = ctx.measureText(badge).width + 8;
			ctx.fillRect(width - badgeWidth - 8, currentY + 2, badgeWidth, 14);
			ctx.fillStyle = '#888888';
			ctx.textAlign = 'center';
			ctx.fillText(badge, width - badgeWidth / 2 - 8, currentY + 11);

			// Render features based on track type
			if (track.features.length > 0) {
				if (track.type === 'bigwig') {
					const rawFeatures = getLocalBinaryRawFeatures(track.id) as SignalFeature[];
					renderSignalFeatures(ctx, rawFeatures, width, currentY, trackHeight, track.color);
				} else {
					renderBedFeatures(ctx, track.features as import('$lib/types/genome').BedFeature[], width, currentY, trackHeight, track.color);
				}
			}

			// Draw bottom border
			const borderY = currentY + trackHeight;
			const isHoveredBorder = isNearBorder && resizeTrackId === track.id;
			ctx.strokeStyle = isHoveredBorder ? '#666666' : '#333333';
			ctx.lineWidth = isHoveredBorder ? 2 : 1;
			ctx.beginPath();
			ctx.moveTo(0, borderY);
			ctx.lineTo(width, borderY);
			ctx.stroke();
			ctx.lineWidth = 1;

			// Record border position
			borders.push({
				trackId: track.id,
				trackType: 'local',
				y: borderY
			});

			currentY += trackHeight;
		}

		return currentY;
	}

	/**
	 * Render BED12 features (genes with exons) using gene model theme system
	 */
	function renderBedFeatures(
		ctx: CanvasRenderingContext2D,
		features: import('$lib/types/genome').BedFeature[],
		width: number,
		trackY: number,
		trackHeight: number,
		_color: string
	): void {
		const theme = getCurrentTheme();
		const labelOffset = theme.labelHeight;
		const featureHeight = theme.exonHeight;
		const rowSpacing = 4;

		// Simple row packing
		const rows: Array<{ end: number }> = [];
		const featureRows: Map<string, number> = new Map();

		// Filter to visible features
		const visibleFeatures = features.filter(f =>
			f.end > viewport.current.start && f.start < viewport.current.end
		);

		// Assign rows
		for (const feature of visibleFeatures) {
			const startX = Math.max(0, (feature.start - viewport.current.start) * pixelsPerBase);
			let rowIndex = 0;

			for (let i = 0; i < rows.length; i++) {
				if (rows[i].end < startX - 5) {
					rowIndex = i;
					break;
				}
				rowIndex = i + 1;
			}

			const endX = Math.min(width, (feature.end - viewport.current.start) * pixelsPerBase);
			if (rows[rowIndex]) {
				rows[rowIndex].end = endX;
			} else {
				rows[rowIndex] = { end: endX };
			}

			featureRows.set(feature.id, rowIndex);
		}

		// Render features with theme-aware styling
		for (const feature of visibleFeatures) {
			const rowIndex = featureRows.get(feature.id) ?? 0;
			const rowY = trackY + labelOffset + rowIndex * (featureHeight + rowSpacing + theme.labelHeight);

			if (rowY + featureHeight > trackY + trackHeight) continue;

			const startX = (feature.start - viewport.current.start) * pixelsPerBase;
			const endX = (feature.end - viewport.current.start) * pixelsPerBase;
			const featureWidth = endX - startX;
			const centerY = rowY + featureHeight / 2;
			const strand = (feature.strand === '+' || feature.strand === '-') ? feature.strand : '.';
			const colors = theme.gene;

			// Draw with BED12 block structure (exons) if available
			if (feature.blockCount && feature.blockSizes && feature.blockStarts && feature.blockCount > 1) {
				// Calculate block positions for intron drawing
				const blocks: Array<{ startX: number; endX: number }> = [];

				for (let i = 0; i < feature.blockCount; i++) {
					const blockStart = feature.start + (feature.blockStarts[i] || 0);
					const blockSize = feature.blockSizes[i] || 0;
					const blockStartX = (blockStart - viewport.current.start) * pixelsPerBase;
					const blockEndX = blockStartX + blockSize * pixelsPerBase;

					if (blockEndX > 0 && blockStartX < width) {
						blocks.push({ startX: blockStartX, endX: blockEndX });
					}
				}

				// Draw intron connectors between blocks (peaked style)
				for (let i = 0; i < blocks.length - 1; i++) {
					const intronStart = blocks[i].endX;
					const intronEnd = blocks[i + 1].startX;
					if (intronEnd > intronStart + 2) {
						drawIntronConnector(ctx, intronStart, intronEnd, centerY, featureHeight);
					}
				}

				// Draw exon blocks with theme styling
				for (let i = 0; i < feature.blockCount; i++) {
					const blockStart = feature.start + (feature.blockStarts[i] || 0);
					const blockSize = feature.blockSizes[i] || 0;
					const blockStartX = (blockStart - viewport.current.start) * pixelsPerBase;
					const blockWidth = blockSize * pixelsPerBase;

					if (blockStartX + blockWidth > 0 && blockStartX < width) {
						const clampedStartX = Math.max(0, blockStartX);
						const clampedWidth = Math.min(blockWidth, width - clampedStartX);
						const blockY = centerY - featureHeight / 2;

						drawPill(ctx, clampedStartX, blockY, clampedWidth, featureHeight, colors);
						drawInnerChevrons(ctx, clampedStartX, blockY, clampedWidth, featureHeight, strand);
					}
				}
			} else {
				// No block data or single block - draw as single themed pill
				const clampedStartX = Math.max(0, startX);
				const clampedWidth = Math.min(featureWidth, width - clampedStartX);
				const pillY = centerY - featureHeight / 2;

				drawPill(ctx, clampedStartX, pillY, clampedWidth, featureHeight, colors);
				drawInnerChevrons(ctx, clampedStartX, pillY, clampedWidth, featureHeight, strand);
			}

			// Draw gene label above with theme styling
			if (feature.name && featureWidth > 25) {
				ctx.font = '600 10px Inter, system-ui, sans-serif';
				ctx.textAlign = 'left';

				let label = feature.name;
				const maxWidth = featureWidth - 6;
				const textWidth = ctx.measureText(label).width;

				if (textWidth > maxWidth) {
					while (label.length > 3 && ctx.measureText(label + '…').width > maxWidth) {
						label = label.slice(0, -1);
					}
					label += '…';
				}

				const labelX = Math.max(4, startX + 2);
				const labelY = rowY - 4;
				const measuredWidth = ctx.measureText(label).width;

				// Subtle background pill for label (theme-aware)
				if (measuredWidth > 10) {
					ctx.fillStyle = theme.labelBg;
					roundedRect(ctx, labelX - 3, labelY - 10, measuredWidth + 6, 13, 3);
					ctx.fill();
				}

				ctx.fillStyle = theme.label;
				ctx.fillText(label, labelX, labelY, maxWidth);
			}
		}
	}

	/**
	 * Render signal features (BigWig) as area chart
	 */
	function renderSignalFeatures(
		ctx: CanvasRenderingContext2D,
		features: SignalFeature[],
		width: number,
		trackY: number,
		trackHeight: number,
		color: string
	): void {
		const labelOffset = 16;
		const plotHeight = trackHeight - labelOffset - 8;
		const plotY = trackY + labelOffset;

		// Filter to visible features
		// Note: features should be raw (non-proxied) arrays from getRawFeatures()
		const vpStart = viewport.current.start;
		const vpEnd = viewport.current.end;
		const visible = features.filter(f => f.end > vpStart && f.start < vpEnd);

		if (visible.length === 0) return;

		// Calculate Y scale (auto-scale to visible data)
		let minVal = Infinity;
		let maxVal = -Infinity;
		for (const f of visible) {
			minVal = Math.min(minVal, f.value);
			maxVal = Math.max(maxVal, f.value);
		}

		// Add padding to range
		const range = maxVal - minVal || 1;
		minVal = Math.min(0, minVal); // Always include 0 if data is positive
		maxVal = maxVal + range * 0.1;

		const valueToY = (val: number): number => {
			const normalized = (val - minVal) / (maxVal - minVal);
			return plotY + plotHeight - (normalized * plotHeight);
		};

		// Draw baseline at 0
		const zeroY = valueToY(0);
		ctx.strokeStyle = '#333333';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, zeroY);
		ctx.lineTo(width, zeroY);
		ctx.stroke();

		// Bin data if too dense
		const basesPerPixel = (viewport.current.end - viewport.current.start) / width;
		const binWidth = Math.max(1, Math.ceil(basesPerPixel));
		const bins = new Map<number, { sum: number; count: number }>();

		for (const f of visible) {
			const startBin = Math.floor(f.start / binWidth);
			const endBin = Math.ceil(f.end / binWidth);

			for (let bin = startBin; bin < endBin; bin++) {
				const existing = bins.get(bin) || { sum: 0, count: 0 };
				existing.sum += f.value;
				existing.count += 1;
				bins.set(bin, existing);
			}
		}

		// Create gradient for fill
		const gradient = ctx.createLinearGradient(0, plotY, 0, plotY + plotHeight);
		gradient.addColorStop(0, color);
		gradient.addColorStop(1, color + '20'); // Fade to transparent

		// Draw as filled area
		ctx.beginPath();
		ctx.moveTo(0, zeroY);

		let lastX = 0;
		const sortedBins = Array.from(bins.entries()).sort((a, b) => a[0] - b[0]);

		for (const [bin, data] of sortedBins) {
			const binStart = bin * binWidth;
			const binEnd = binStart + binWidth;

			const x1 = (binStart - viewport.current.start) * pixelsPerBase;
			const x2 = (binEnd - viewport.current.start) * pixelsPerBase;
			const avgValue = data.sum / data.count;
			const y = valueToY(avgValue);

			if (x1 > lastX + 1) {
				// Gap - go down to zero and back up
				ctx.lineTo(lastX, zeroY);
				ctx.lineTo(x1, zeroY);
			}

			ctx.lineTo(x1, y);
			ctx.lineTo(x2, y);
			lastX = x2;
		}

		ctx.lineTo(lastX, zeroY);
		ctx.closePath();

		ctx.fillStyle = gradient;
		ctx.fill();

		// Draw outline
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.beginPath();
		let started = false;

		for (const [bin, data] of sortedBins) {
			const binStart = bin * binWidth;
			const binEnd = binStart + binWidth;
			const x1 = (binStart - viewport.current.start) * pixelsPerBase;
			const x2 = (binEnd - viewport.current.start) * pixelsPerBase;
			const avgValue = data.sum / data.count;
			const y = valueToY(avgValue);

			if (!started) {
				ctx.moveTo(x1, y);
				started = true;
			} else {
				ctx.lineTo(x1, y);
			}
			ctx.lineTo(x2, y);
		}
		ctx.stroke();

		// Draw Y-axis labels
		ctx.fillStyle = '#666666';
		ctx.font = '9px Inter, sans-serif';
		ctx.textAlign = 'left';
		ctx.fillText(maxVal.toFixed(1), 4, plotY + 8);
		ctx.fillText(minVal.toFixed(1), 4, plotY + plotHeight - 2);
	}

	/**
	 * Draw highlight regions as semi-transparent overlays
	 */
	function drawHighlights(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		rulerHeight: number
	): void {
		const visibleHighlights = viewport.getVisibleHighlights();
		if (visibleHighlights.length === 0) return;

		for (const highlight of visibleHighlights) {
			// Calculate x positions
			const startX = (highlight.start - viewport.current.start) * pixelsPerBase;
			const endX = (highlight.end - viewport.current.start) * pixelsPerBase;
			const highlightWidth = endX - startX;

			// Skip if completely off-screen
			if (endX < 0 || startX > width) continue;

			// Clamp to visible area
			const clampedStartX = Math.max(0, startX);
			const clampedEndX = Math.min(width, endX);
			const clampedWidth = clampedEndX - clampedStartX;

			if (clampedWidth <= 0) continue;

			// Draw highlight overlay (semi-transparent)
			const color = highlight.color || 'rgba(255, 221, 51, 0.25)'; // Default yellow
			ctx.fillStyle = color;
			ctx.fillRect(clampedStartX, rulerHeight, clampedWidth, height - rulerHeight);

			// Draw highlight borders
			ctx.strokeStyle = highlight.color?.replace(/[\d.]+\)$/, '0.6)') || 'rgba(255, 221, 51, 0.6)';
			ctx.lineWidth = 2;
			ctx.beginPath();
			if (startX >= 0) {
				ctx.moveTo(clampedStartX, rulerHeight);
				ctx.lineTo(clampedStartX, height);
			}
			if (endX <= width) {
				ctx.moveTo(clampedEndX, rulerHeight);
				ctx.lineTo(clampedEndX, height);
			}
			ctx.stroke();

			// Draw label if provided
			if (highlight.label) {
				const labelX = clampedStartX + clampedWidth / 2;
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 11px Inter, sans-serif';
				ctx.textAlign = 'center';
				ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
				ctx.shadowBlur = 3;
				ctx.fillText(highlight.label, labelX, rulerHeight + 16);
				ctx.shadowBlur = 0;
			}
		}
	}

	function renderTracksWithRegistry(
		ctx: CanvasRenderingContext2D,
		trackList: typeof tracks.visible,
		width: number,
		startY: number
	): void {
		let currentY = startY;

		for (const track of trackList) {
			const trackType = getTrackType(track.typeId);
			if (!trackType) {
				console.warn(`Unknown track type: ${track.typeId}`);
				continue;
			}

			// Draw track label background
			ctx.fillStyle = '#1a1a1a';
			ctx.fillRect(0, currentY, width, track.height);

			// Draw track label
			ctx.fillStyle = '#666666';
			ctx.font = '11px Inter, sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(track.name, 8, currentY + 11);

			// Draw track type badge
			ctx.fillStyle = '#444444';
			ctx.font = '9px Inter, sans-serif';
			const badge = trackType.name.split(' ')[0].toUpperCase();
			const badgeWidth = ctx.measureText(badge).width + 8;
			ctx.fillRect(width - badgeWidth - 8, currentY + 2, badgeWidth, 14);
			ctx.fillStyle = '#888888';
			ctx.textAlign = 'center';
			ctx.fillText(badge, width - badgeWidth / 2 - 8, currentY + 11);

			// Get filtered features to determine which should be dimmed
			const { dimmed } = tracks.getFilteredFeatures(track);
			const dimmedIds = new Set(dimmed.map(f => f.id));

			// Create render context with dimmed IDs for smart rendering
			const renderCtx = createRenderContext(
				ctx,
				viewport.current,
				width,
				currentY,
				track.height,
				track.color,
				dimmedIds.size > 0 ? dimmedIds : undefined
			);

			// Render all features - renderer handles dimming internally
			trackType.render(track.features, renderCtx);

			// Draw bottom border
			ctx.strokeStyle = '#333333';
			ctx.beginPath();
			ctx.moveTo(0, currentY + track.height);
			ctx.lineTo(width, currentY + track.height);
			ctx.stroke();

			currentY += track.height;
		}
	}

	function drawRuler(ctx: CanvasRenderingContext2D, width: number): number {
		const rulerHeight = 30;

		// Background
		ctx.fillStyle = '#252525';
		ctx.fillRect(0, 0, width, rulerHeight);

		// Chromosome label
		ctx.fillStyle = '#a0a0a0';
		ctx.font = 'bold 11px Inter, sans-serif';
		ctx.textAlign = 'left';
		ctx.fillText(viewport.current.chromosome, 8, 12);

		// Calculate tick spacing
		const minPixelsBetweenTicks = 80;
		const basesPerPixel = viewport.width / width;
		const minBasesPerTick = minPixelsBetweenTicks * basesPerPixel;

		// Round to nice numbers
		const magnitude = Math.pow(10, Math.floor(Math.log10(minBasesPerTick)));
		let tickInterval = magnitude;
		if (minBasesPerTick > magnitude * 5) tickInterval = magnitude * 10;
		else if (minBasesPerTick > magnitude * 2) tickInterval = magnitude * 5;
		else if (minBasesPerTick > magnitude) tickInterval = magnitude * 2;

		const firstTick = Math.ceil(viewport.current.start / tickInterval) * tickInterval;

		ctx.strokeStyle = '#444444';
		ctx.fillStyle = '#888888';
		ctx.font = '10px Inter, sans-serif';
		ctx.textAlign = 'center';

		for (let pos = firstTick; pos < viewport.current.end; pos += tickInterval) {
			const x = (pos - viewport.current.start) * pixelsPerBase;

			// Tick line
			ctx.beginPath();
			ctx.moveTo(x, rulerHeight - 8);
			ctx.lineTo(x, rulerHeight);
			ctx.stroke();

			// Label - pass tickInterval for appropriate precision
			ctx.fillText(formatTickLabel(pos, tickInterval), x, rulerHeight - 12);
		}

		// Bottom border
		ctx.strokeStyle = '#333333';
		ctx.beginPath();
		ctx.moveTo(0, rulerHeight);
		ctx.lineTo(width, rulerHeight);
		ctx.stroke();

		return rulerHeight;
	}

	function drawPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number, rulerHeight: number): void {
		// Background
		ctx.fillStyle = '#1a1a1a';
		ctx.fillRect(0, rulerHeight, width, height - rulerHeight);

		// Drop zone indicator
		const centerY = rulerHeight + (height - rulerHeight) / 2;

		ctx.fillStyle = isDragOver ? '#6366f1' : '#333333';
		ctx.strokeStyle = isDragOver ? '#6366f1' : '#444444';
		ctx.setLineDash([8, 4]);
		ctx.lineWidth = 2;

		const boxWidth = Math.min(400, width - 40);
		const boxHeight = 120;
		const boxX = (width - boxWidth) / 2;
		const boxY = centerY - boxHeight / 2;

		ctx.beginPath();
		ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
		ctx.stroke();
		ctx.setLineDash([]);

		// Icon
		ctx.fillStyle = isDragOver ? '#818cf8' : '#666666';
		ctx.font = '32px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('📁', width / 2, centerY - 20);

		// Text
		ctx.fillStyle = isDragOver ? '#a5b4fc' : '#888888';
		ctx.font = '14px Inter, sans-serif';
		ctx.fillText(
			isDragOver ? 'Drop to load track' : 'Drop BED or GFF3 files here',
			width / 2,
			centerY + 20
		);

		ctx.fillStyle = '#666666';
		ctx.font = '12px Inter, sans-serif';
		ctx.fillText(
			formatCoordinate(viewport.current.chromosome, viewport.current.start, viewport.current.end),
			width / 2,
			centerY + 45
		);
	}

	function drawNoDataMessage(ctx: CanvasRenderingContext2D, width: number, height: number, rulerHeight: number, message: string): void {
		ctx.fillStyle = '#1a1a1a';
		ctx.fillRect(0, rulerHeight, width, height - rulerHeight);

		const centerY = rulerHeight + (height - rulerHeight) / 2;
		ctx.fillStyle = '#666666';
		ctx.font = '14px Inter, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(message, width / 2, centerY);
	}

	/**
	 * Format tick label with appropriate precision based on tick interval
	 * The key insight: precision should show the difference between ticks
	 */
	function formatTickLabel(pos: number, tickInterval: number): string {
		// Determine appropriate unit and precision based on tick interval
		if (tickInterval >= 1000000) {
			// Ticks are 1M+ apart, show in M with minimal decimals
			const decimals = tickInterval >= 10000000 ? 0 : 1;
			return (pos / 1000000).toFixed(decimals) + 'M';
		} else if (tickInterval >= 1000) {
			// Ticks are 1K-999K apart
			if (pos >= 1000000) {
				// Position is in millions, need enough precision to show K differences
				const decimals = tickInterval >= 100000 ? 1 : tickInterval >= 10000 ? 2 : 3;
				return (pos / 1000000).toFixed(decimals) + 'M';
			} else {
				const decimals = tickInterval >= 10000 ? 0 : 1;
				return (pos / 1000).toFixed(decimals) + 'K';
			}
		} else if (tickInterval >= 100) {
			// Ticks are 100-999bp apart
			if (pos >= 1000000) {
				return (pos / 1000000).toFixed(4) + 'M';
			} else if (pos >= 1000) {
				return (pos / 1000).toFixed(2) + 'K';
			}
			return pos.toLocaleString();
		} else {
			// Very fine resolution, show exact positions
			if (pos >= 1000000) {
				return (pos / 1000000).toFixed(5) + 'M';
			} else if (pos >= 1000) {
				return (pos / 1000).toFixed(3) + 'K';
			}
			return pos.toLocaleString();
		}
	}

	// Check if mouse Y is near a track border
	function findNearbyBorder(mouseY: number): TrackBorder | null {
		for (const border of trackBorders) {
			if (Math.abs(mouseY - border.y) <= BORDER_HIT_ZONE) {
				return border;
			}
		}
		return null;
	}

	// Get current height of a track
	function getTrackHeight(trackId: string, trackType: 'local' | 'remote'): number {
		if (trackType === 'remote') {
			const track = remoteTracks.all.find(t => t.id === trackId);
			return track?.userHeight ?? track?.height ?? 100;
		}
		// Check local binary tracks first
		const localBinaryTrack = localBinaryTracks.all.find(t => t.id === trackId);
		if (localBinaryTrack) {
			return localBinaryTrack.userHeight ?? localBinaryTrack.height ?? 100;
		}
		// Fall back to text tracks
		const track = tracks.all.find(t => t.id === trackId);
		return track?.height ?? 100;
	}

	// Mouse handlers for panning and resizing
	function handleMouseDown(event: MouseEvent) {
		const rect = canvasEl.getBoundingClientRect();
		const mouseY = event.clientY - rect.top;
		const border = findNearbyBorder(mouseY);

		if (border) {
			// Start resizing
			isResizing = true;
			resizeTrackId = border.trackId;
			resizeTrackType = border.trackType;
			resizeStartY = event.clientY;
			resizeStartHeight = getTrackHeight(border.trackId, border.trackType);
			document.body.style.cursor = 'ns-resize';
		} else {
			// Start panning
			isDragging = true;
			dragStartX = event.clientX;
			document.body.style.cursor = 'grabbing';
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (isResizing && resizeTrackId && resizeTrackType) {
			// Handle resize drag
			const deltaY = event.clientY - resizeStartY;
			const newHeight = Math.max(50, Math.min(500, resizeStartHeight + deltaY));

			if (resizeTrackType === 'remote') {
				remoteTracks.setRemoteTrackHeight(resizeTrackId, newHeight);
			} else if (resizeTrackType === 'local') {
				// Check if it's a local binary track
				const isLocalBinary = localBinaryTracks.all.some(t => t.id === resizeTrackId);
				if (isLocalBinary) {
					localBinaryTracks.setLocalBinaryTrackHeight(resizeTrackId, newHeight);
				}
			}
			return;
		}

		if (isDragging) {
			// Handle pan drag
			const deltaX = event.clientX - dragStartX;
			viewport.pan(deltaX, pixelsPerBase);
			dragStartX = event.clientX;
			return;
		}

		// Not dragging - check if hovering near a border
		if (!canvasEl) return;
		const rect = canvasEl.getBoundingClientRect();
		const mouseY = event.clientY - rect.top;
		const border = findNearbyBorder(mouseY);

		if (border) {
			isNearBorder = true;
			resizeTrackId = border.trackId;
			canvasEl.style.cursor = 'ns-resize';
		} else {
			isNearBorder = false;
			resizeTrackId = null;
			canvasEl.style.cursor = '';
		}
	}

	function handleMouseUp() {
		if (isResizing) {
			isResizing = false;
			resizeTrackId = null;
			resizeTrackType = null;
		}
		isDragging = false;
		document.body.style.cursor = '';
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		const rect = canvasEl.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseBase = viewport.current.start + (mouseX / pixelsPerBase);

		// Zoom factor based on scroll direction
		const factor = event.deltaY > 0 ? 1.2 : 0.8;
		viewport.zoom(factor, mouseBase);
	}

	// File drop handlers
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;

		const files = event.dataTransfer?.files;
		if (!files) return;

		for (const file of files) {
			// Let the track store handle validation via registry
			await tracks.addTrackFromFile(file);
		}
	}
</script>

<svelte:window
	onmousemove={handleMouseMove}
	onmouseup={handleMouseUp}
/>

<div
	bind:this={containerEl}
	role="application"
	aria-label="Genome track viewer - drag to pan, scroll to zoom, drop files to load"
	class="flex-1 relative overflow-hidden cursor-grab"
	class:cursor-grabbing={isDragging}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<canvas
		bind:this={canvasEl}
		onmousedown={handleMouseDown}
		onwheel={handleWheel}
		class="block w-full h-full"
	></canvas>

	{#if tracks.isLoading}
		<div class="absolute inset-0 bg-black/50 flex items-center justify-center">
			<div class="text-[var(--color-text-secondary)]">Loading...</div>
		</div>
	{/if}

	{#if tracks.error}
		<div class="absolute bottom-4 left-4 right-4 bg-red-900/80 text-red-200 px-4 py-2 rounded text-sm">
			{tracks.error}
		</div>
	{/if}

	{#if tracks.chromosomeMismatchWarning}
		<div class="absolute bottom-4 left-4 right-4 bg-amber-900/90 text-amber-200 px-4 py-2 rounded text-sm flex items-start gap-2">
			<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
			<span class="flex-1">{tracks.chromosomeMismatchWarning}</span>
			<button
				onclick={() => tracks.clearChromosomeMismatchWarning()}
				class="text-amber-300 hover:text-amber-100 transition-colors"
				title="Dismiss"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/if}

	<!-- Remote track chromosome mismatch warnings -->
	{#each remoteTracks.all.filter(t => t.chromosomeMismatchWarning) as track (track.id)}
		<div class="absolute bottom-4 left-4 right-4 bg-amber-900/90 text-amber-200 px-4 py-2 rounded text-sm flex items-start gap-2" style="bottom: {remoteTracks.all.filter(t => t.chromosomeMismatchWarning).indexOf(track) * 60 + 16}px">
			<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
			<span class="flex-1"><strong>{track.name}:</strong> {track.chromosomeMismatchWarning}</span>
			<button
				onclick={() => remoteTracks.clearRemoteTrackWarning(track.id)}
				class="text-amber-300 hover:text-amber-100 transition-colors"
				title="Dismiss"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/each}

	<!-- Local binary track chromosome mismatch warnings -->
	{#each localBinaryTracks.all.filter(t => t.chromosomeMismatchWarning) as track (track.id)}
		{@const remoteWarningCount = remoteTracks.all.filter(t => t.chromosomeMismatchWarning).length}
		<div class="absolute bottom-4 left-4 right-4 bg-amber-900/90 text-amber-200 px-4 py-2 rounded text-sm flex items-start gap-2" style="bottom: {(remoteWarningCount + localBinaryTracks.all.filter(t => t.chromosomeMismatchWarning).indexOf(track)) * 60 + 16}px">
			<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
			<span class="flex-1"><strong>{track.name}:</strong> {track.chromosomeMismatchWarning}</span>
			<button
				onclick={() => localBinaryTracks.clearLocalBinaryTrackWarning(track.id)}
				class="text-amber-300 hover:text-amber-100 transition-colors"
				title="Dismiss"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/each}
</div>
