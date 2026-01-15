<script lang="ts">
	import { onMount } from 'svelte';
	import { useViewport } from '$lib/stores/viewport.svelte';
	import { useTracks } from '$lib/stores/tracks.svelte';
	import { useRemoteTracks } from '$lib/stores/remoteTracks.svelte';
	import { useAssembly } from '$lib/stores/assembly.svelte';
	import { formatCoordinate } from '$lib/types/genome';
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
	const assembly = useAssembly();

	// Initialize viewport from URL on mount and set up gene track
	onMount(() => {
		viewport.initializeFromURL();
		// Set up gene track for current assembly
		remoteTracks.setupGeneTrackForAssembly(assembly.current.id);
		// Immediately fetch features for the viewport
		remoteTracks.updateForViewport(viewport.current);
	});

	// Update remote tracks when viewport changes
	$effect(() => {
		remoteTracks.updateForViewport(viewport.current);
	});

	// Update gene track when assembly changes
	$effect(() => {
		const assemblyId = assembly.current.id;
		if (assemblyId !== remoteTracks.activeAssemblyId) {
			remoteTracks.setupGeneTrackForAssembly(assemblyId);
			// Force viewport update to fetch data for new track
			remoteTracks.updateForViewport(viewport.current);
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
		const visibleRemote = remoteTracks.visible;
		const _remoteFeatures = visibleRemote.map(t => t.features.length);

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

		// Check for content (local tracks or remote tracks)
		const visibleLocalTracks = tracks.visible;
		const visibleRemoteTracks = remoteTracks.visible;
		const hasLocalContent = visibleLocalTracks.some(t =>
			t.features.some(f => f.chromosome === viewport.current.chromosome)
		);
		const hasRemoteContent = visibleRemoteTracks.some(t => t.features.length > 0);

		if (hasLocalContent || hasRemoteContent) {
			let currentY = rulerHeight;

			// Render remote tracks first (gene models)
			if (hasRemoteContent) {
				currentY = renderRemoteTracks(ctx, width, currentY);
			}

			// Render local tracks
			if (hasLocalContent) {
				const chrTracks = visibleLocalTracks.filter(t =>
					t.features.some(f => f.chromosome === viewport.current.chromosome)
				);
				renderTracksWithRegistry(ctx, chrTracks, width, currentY);
			}
		} else {
			drawPlaceholder(ctx, width, height, rulerHeight);
		}

		// Draw highlights on top
		drawHighlights(ctx, width, height, rulerHeight);
	});

	/**
	 * Render remote tracks (BigBed gene models)
	 */
	function renderRemoteTracks(
		ctx: CanvasRenderingContext2D,
		width: number,
		startY: number
	): number {
		let currentY = startY;

		for (const track of remoteTracks.visible) {
			if (track.features.length === 0 && !track.isLoading) continue;

			const trackHeight = track.height;

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
			const badge = 'GENES';
			const badgeWidth = ctx.measureText(badge).width + 8;
			ctx.fillRect(width - badgeWidth - 8, currentY + 2, badgeWidth, 14);
			ctx.fillStyle = '#888888';
			ctx.textAlign = 'center';
			ctx.fillText(badge, width - badgeWidth / 2 - 8, currentY + 11);

			// Render features as simple gene boxes (BED12 style)
			if (track.features.length > 0) {
				renderBedFeatures(ctx, track.features, width, currentY, trackHeight, track.color);
			}

			// Draw bottom border
			ctx.strokeStyle = '#333333';
			ctx.beginPath();
			ctx.moveTo(0, currentY + trackHeight);
			ctx.lineTo(width, currentY + trackHeight);
			ctx.stroke();

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

	// Mouse handlers for panning
	function handleMouseDown(event: MouseEvent) {
		isDragging = true;
		dragStartX = event.clientX;
		document.body.style.cursor = 'grabbing';
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging) return;
		const deltaX = event.clientX - dragStartX;
		viewport.pan(deltaX, pixelsPerBase);
		dragStartX = event.clientX;
	}

	function handleMouseUp() {
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
</div>
