<script lang="ts">
	import { onMount } from 'svelte';
	import { useViewport } from '$lib/stores/viewport.svelte';
	import { useTracks } from '$lib/stores/tracks.svelte';
	import { formatCoordinate } from '$lib/types/genome';
	import { getTrackType } from '$lib/services/trackRegistry';
	import { createRenderContext } from '$lib/types/tracks';

	const viewport = useViewport();
	const tracks = useTracks();

	// Initialize viewport from URL on mount
	onMount(() => {
		viewport.initializeFromURL();
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
		if (!canvasEl) return;

		// Depend on renderVersion to force re-render when themes change
		const _version = tracks.renderVersion;

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

		// Draw tracks or placeholder
		const visibleTracks = tracks.visible;

		if (visibleTracks.length > 0) {
			// Filter tracks to current chromosome
			const chrTracks = visibleTracks.filter(t =>
				t.features.some(f => f.chromosome === viewport.current.chromosome)
			);

			if (chrTracks.length > 0) {
				renderTracksWithRegistry(ctx, chrTracks, width, rulerHeight);
			} else {
				drawNoDataMessage(ctx, width, height, rulerHeight,
					`No features on ${viewport.current.chromosome}`);
			}
		} else {
			drawPlaceholder(ctx, width, height, rulerHeight);
		}

		// Draw highlights on top
		drawHighlights(ctx, width, height, rulerHeight);
	});

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
