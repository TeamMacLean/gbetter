<script lang="ts">
	import { useTracks } from '$lib/stores/tracks.svelte';
	import { useViewport } from '$lib/stores/viewport.svelte';
	import { useRemoteTracks } from '$lib/stores/remoteTracks.svelte';
	import { getSupportedExtensions } from '$lib/services/trackRegistry';
	import { getGeneModelThemes, getCurrentThemeName, setGeneModelTheme } from '$lib/services/trackTypes/geneModel';

	const tracks = useTracks();
	const viewport = useViewport();
	const remoteTracks = useRemoteTracks();

	// Gene model theme state
	let currentGeneTheme = $state(getCurrentThemeName());
	const availableThemes = getGeneModelThemes();

	function handleThemeChange(themeName: string) {
		setGeneModelTheme(themeName);
		currentGeneTheme = themeName;
		// Force tracks to re-render
		tracks.invalidateRender();
	}

	// Get supported extensions for file input
	const supportedExtensions = getSupportedExtensions().map(ext => `.${ext}`).join(',');

	let isCollapsed = $state(false);
	let fileInputEl: HTMLInputElement;

	// Add track mode: 'file' or 'url'
	let addTrackMode = $state<'file' | 'url'>('file');
	let urlInput = $state('');
	let urlError = $state<string | null>(null);
	let isAddingUrl = $state(false);

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files) return;

		for (const file of files) {
			tracks.addTrackFromFile(file);
		}

		// Reset input so same file can be selected again
		input.value = '';
	}

	async function handleUrlSubmit() {
		const url = urlInput.trim();
		if (!url) return;

		urlError = null;

		// Validate URL format
		try {
			new URL(url);
		} catch {
			urlError = 'Invalid URL format';
			return;
		}

		// Detect type from extension
		const lowerUrl = url.toLowerCase();
		let trackType: 'bigbed' | 'bigwig' | null = null;

		if (lowerUrl.endsWith('.bb') || lowerUrl.endsWith('.bigbed')) {
			trackType = 'bigbed';
		} else if (lowerUrl.endsWith('.bw') || lowerUrl.endsWith('.bigwig')) {
			trackType = 'bigwig';
		} else {
			urlError = 'Unsupported format. Use .bb (BigBed) or .bw (BigWig)';
			return;
		}

		// Extract filename for track name
		const filename = url.split('/').pop()?.split('?')[0] || 'Remote Track';
		const trackName = filename.replace(/\.(bb|bw|bigbed|bigwig)$/i, '');

		isAddingUrl = true;

		try {
			// Add to remote tracks store
			const { useAssembly } = await import('$lib/stores/assembly.svelte');
			const assembly = useAssembly();

			remoteTracks.addRemoteTrack({
				id: `url-${Date.now()}`,
				name: trackName,
				type: trackType,
				url: url,
				assemblyId: assembly.current.id,
				color: trackType === 'bigwig' ? '#10b981' : '#8b5cf6',
			});

			// Trigger fetch for current viewport
			const { useViewport } = await import('$lib/stores/viewport.svelte');
			const viewport = useViewport();
			remoteTracks.updateForViewport(viewport.current);

			// Clear input on success
			urlInput = '';
		} catch (err) {
			urlError = err instanceof Error ? err.message : 'Failed to add track';
		} finally {
			isAddingUrl = false;
		}
	}

	function getTrackStats(track: { features: { chromosome: string }[] }) {
		const chromosomes = new Set(track.features.map(f => f.chromosome));
		return {
			featureCount: track.features.length,
			chromosomeCount: chromosomes.size,
		};
	}

	function navigateToTrack(track: { features: { chromosome: string; start: number; end: number }[] }) {
		if (track.features.length === 0) return;

		// Find the extent of all features
		const features = track.features;
		const chr = features[0].chromosome;
		const chrFeatures = features.filter(f => f.chromosome === chr);

		if (chrFeatures.length === 0) return;

		const minStart = Math.min(...chrFeatures.map(f => f.start));
		const maxEnd = Math.max(...chrFeatures.map(f => f.end));

		// Add some padding
		const padding = Math.round((maxEnd - minStart) * 0.1);
		viewport.navigateTo(chr, Math.max(0, minStart - padding), maxEnd + padding);
	}
</script>

<aside
	class="flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] transition-all duration-200"
	class:w-64={!isCollapsed}
	class:w-12={isCollapsed}
>
	<!-- Toggle button -->
	<button
		onclick={() => isCollapsed = !isCollapsed}
		class="p-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
		title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="w-5 h-5 transition-transform"
			class:rotate-180={isCollapsed}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
		</svg>
	</button>

	{#if !isCollapsed}
		<!-- Tracks section -->
		<div class="flex-1 p-3 overflow-y-auto">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
					Tracks ({tracks.all.length + remoteTracks.all.length})
				</h3>
				{#if tracks.all.length > 0}
					<button
						onclick={() => tracks.clearAllTracks()}
						class="text-xs text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
						title="Remove all tracks"
					>
						Clear
					</button>
				{/if}
			</div>

			<div class="space-y-2">
				{#if tracks.all.length === 0 && remoteTracks.all.length === 0}
					<!-- Empty state -->
					<div class="p-3 bg-[var(--color-bg-tertiary)] rounded border border-dashed border-[var(--color-border)] text-center">
						<p class="text-sm text-[var(--color-text-muted)]">No tracks loaded</p>
						<p class="text-xs text-[var(--color-text-muted)] mt-1">Drop files on canvas or use button below</p>
					</div>
				{:else}
					<!-- Remote tracks (genes, etc.) -->
					{#each remoteTracks.all as track (track.id)}
						<div
							class="p-2 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border)] group"
						>
							<div class="flex items-center gap-2">
								<!-- Visibility toggle -->
								<button
									onclick={() => remoteTracks.toggleRemoteTrackVisibility(track.id)}
									class="w-4 h-4 rounded flex items-center justify-center transition-colors"
									style="background-color: {track.visible ? track.color : 'transparent'}; border: 2px solid {track.color}"
									title={track.visible ? 'Hide track' : 'Show track'}
								>
									{#if track.visible}
										<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</button>

								<!-- Track name -->
								<span class="flex-1 text-sm text-[var(--color-text-primary)] truncate">
									{track.name}
								</span>

								<!-- Loading indicator -->
								{#if track.isLoading}
									<span class="text-xs text-[var(--color-accent)]">Loading...</span>
								{/if}
							</div>

							<!-- Track info -->
							<div class="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
								<span class="uppercase">{track.type}</span>
								<span>·</span>
								<span>{track.features.length.toLocaleString()} features</span>
								{#if track.error}
									<span class="text-red-400" title={track.error}>Error</span>
								{/if}
							</div>

							<!-- Height control -->
							<div class="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<span class="text-[10px] text-[var(--color-text-muted)] w-8">
									{track.userHeight ?? 'Auto'}
								</span>
								<input
									type="range"
									min="50"
									max="300"
									step="10"
									value={track.userHeight ?? 150}
									oninput={(e) => remoteTracks.setRemoteTrackHeight(track.id, parseInt(e.currentTarget.value))}
									class="flex-1 h-1 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
									title="Track height"
								/>
								<button
									onclick={() => remoteTracks.setRemoteTrackHeight(track.id, null)}
									class="text-[10px] px-1.5 py-0.5 rounded transition-colors"
									class:bg-[var(--color-accent)]={track.userHeight === null}
									class:text-white={track.userHeight === null}
									class:bg-[var(--color-bg-secondary)]={track.userHeight !== null}
									class:text-[var(--color-text-muted)]={track.userHeight !== null}
									class:hover:bg-[var(--color-border)]={track.userHeight !== null}
									title="Auto-size track height"
								>
									Auto
								</button>
							</div>
						</div>
					{/each}
					<!-- Track list -->
					{#each tracks.all as track (track.id)}
						{@const stats = getTrackStats(track)}
						<div
							class="p-2 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border)] group"
						>
							<div class="flex items-center gap-2">
								<!-- Visibility toggle -->
								<button
									onclick={() => tracks.toggleTrackVisibility(track.id)}
									class="w-4 h-4 rounded flex items-center justify-center transition-colors"
									style="background-color: {track.visible ? track.color : 'transparent'}; border: 2px solid {track.color}"
									title={track.visible ? 'Hide track' : 'Show track'}
								>
									{#if track.visible}
										<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</button>

								<!-- Track name -->
								<button
									onclick={() => navigateToTrack(track)}
									class="flex-1 text-left text-sm text-[var(--color-text-primary)] hover:text-[var(--color-accent)] truncate transition-colors"
									title="Navigate to track"
								>
									{track.name}
								</button>

								<!-- Delete button -->
								<button
									onclick={() => tracks.removeTrack(track.id)}
									class="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-red-400 transition-all"
									title="Remove track"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>

							<!-- Track info -->
							<div class="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
								<span class="uppercase">{track.typeId}</span>
								<span>·</span>
								<span>{stats.featureCount.toLocaleString()} features</span>
								{#if stats.chromosomeCount > 1}
									<span>·</span>
									<span>{stats.chromosomeCount} chr</span>
								{/if}
							</div>

							<!-- Move buttons -->
							<div class="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									onclick={() => tracks.moveTrack(track.id, 'up')}
									class="px-2 py-0.5 text-xs bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] rounded transition-colors"
									title="Move up"
								>
									↑
								</button>
								<button
									onclick={() => tracks.moveTrack(track.id, 'down')}
									class="px-2 py-0.5 text-xs bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] rounded transition-colors"
									title="Move down"
								>
									↓
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<!-- Gene Model Theme Selector -->
		<div class="p-3 border-t border-[var(--color-border)]">
			<h3 class="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
				Gene Style
			</h3>
			<div class="flex gap-1">
				{#each availableThemes as themeName}
					<button
						onclick={() => handleThemeChange(themeName)}
						class="flex-1 px-2 py-1.5 text-xs rounded transition-colors capitalize"
						class:bg-[var(--color-accent)]={currentGeneTheme === themeName}
						class:text-white={currentGeneTheme === themeName}
						class:bg-[var(--color-bg-tertiary)]={currentGeneTheme !== themeName}
						class:text-[var(--color-text-secondary)]={currentGeneTheme !== themeName}
						class:hover:bg-[var(--color-border)]={currentGeneTheme !== themeName}
					>
						{themeName}
					</button>
				{/each}
			</div>
		</div>

		<!-- Add track section -->
		<div class="p-3 border-t border-[var(--color-border)]">
			<!-- Tab buttons -->
			<div class="flex mb-3 bg-[var(--color-bg-tertiary)] rounded-lg p-0.5">
				<button
					onclick={() => addTrackMode = 'file'}
					class="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
					class:bg-[var(--color-bg-secondary)]={addTrackMode === 'file'}
					class:text-[var(--color-text-primary)]={addTrackMode === 'file'}
					class:shadow-sm={addTrackMode === 'file'}
					class:text-[var(--color-text-muted)]={addTrackMode !== 'file'}
				>
					File
				</button>
				<button
					onclick={() => addTrackMode = 'url'}
					class="flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
					class:bg-[var(--color-bg-secondary)]={addTrackMode === 'url'}
					class:text-[var(--color-text-primary)]={addTrackMode === 'url'}
					class:shadow-sm={addTrackMode === 'url'}
					class:text-[var(--color-text-muted)]={addTrackMode !== 'url'}
				>
					URL
				</button>
			</div>

			{#if addTrackMode === 'file'}
				<!-- File input -->
				<input
					bind:this={fileInputEl}
					type="file"
					accept={supportedExtensions}
					multiple
					class="hidden"
					onchange={handleFileSelect}
				/>
				<button
					type="button"
					onclick={() => fileInputEl?.click()}
					class="w-full flex flex-col items-center gap-2 p-4 border-2 border-dashed border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>
					<span class="text-xs text-[var(--color-text-secondary)]">Drop or browse</span>
					<span class="text-[10px] text-[var(--color-text-muted)]">{supportedExtensions}</span>
				</button>
			{:else}
				<!-- URL input -->
				<div class="space-y-2">
					<div class="flex gap-1">
						<input
							type="url"
							bind:value={urlInput}
							placeholder="https://example.com/track.bw"
							class="flex-1 px-2 py-1.5 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
							onkeydown={(e) => e.key === 'Enter' && handleUrlSubmit()}
							disabled={isAddingUrl}
						/>
						<button
							onclick={handleUrlSubmit}
							disabled={!urlInput.trim() || isAddingUrl}
							class="px-2 py-1.5 text-xs font-medium bg-[var(--color-accent)] text-white rounded hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{isAddingUrl ? '...' : '+'}
						</button>
					</div>
					{#if urlError}
						<p class="text-[10px] text-red-400">{urlError}</p>
					{/if}
					<p class="text-[10px] text-[var(--color-text-muted)]">
						Supports .bb (BigBed) and .bw (BigWig)
					</p>
				</div>
			{/if}
		</div>
	{/if}
</aside>
