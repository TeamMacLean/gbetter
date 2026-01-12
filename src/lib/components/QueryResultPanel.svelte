<script lang="ts">
	import { useViewport } from '$lib/stores/viewport.svelte';
	import { formatCoordinate } from '$lib/types/genome';

	export interface QueryResultItem {
		id: string;
		name: string;
		chromosome: string;
		start: number;
		end: number;
		type?: string;
		details?: Record<string, string>;
	}

	interface Props {
		title: string;
		query: string;
		results: QueryResultItem[];
		onClose: () => void;
	}

	let { title, query, results, onClose }: Props = $props();

	const viewport = useViewport();

	function navigateToResult(item: QueryResultItem) {
		const padding = Math.round((item.end - item.start) * 0.2);
		viewport.navigateTo(
			item.chromosome,
			Math.max(0, item.start - padding),
			item.end + padding
		);
	}

	function copyQuery() {
		navigator.clipboard.writeText(query);
	}
</script>

<div class="fixed right-4 top-20 w-80 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 max-h-[70vh] flex flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
		<div class="flex-1 min-w-0">
			<h3 class="text-sm font-medium text-[var(--color-text-primary)] truncate">{title}</h3>
			<div class="flex items-center gap-2 mt-1">
				<code class="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded truncate max-w-48">
					{query}
				</code>
				<button
					onclick={copyQuery}
					class="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
					title="Copy GQL"
				>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
				</button>
			</div>
		</div>
		<button
			onclick={onClose}
			class="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
		>
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Results count -->
	<div class="px-3 py-1.5 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)]">
		{results.length} result{results.length === 1 ? '' : 's'}
	</div>

	<!-- Results list -->
	<div class="flex-1 overflow-y-auto">
		{#if results.length === 0}
			<div class="px-3 py-8 text-center text-sm text-[var(--color-text-muted)]">
				No results found
			</div>
		{:else}
			{#each results as item}
				<button
					onclick={() => navigateToResult(item)}
					class="w-full px-3 py-2 text-left hover:bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border)] transition-colors"
				>
					<div class="flex items-center justify-between">
						<span class="font-medium text-sm text-[var(--color-text-primary)]">{item.name}</span>
						{#if item.type}
							<span class="text-xs px-1.5 py-0.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] rounded">
								{item.type}
							</span>
						{/if}
					</div>
					<div class="text-xs text-[var(--color-text-muted)] mt-0.5">
						{formatCoordinate(item.chromosome, item.start, item.end)}
					</div>
					{#if item.details}
						<div class="flex flex-wrap gap-1 mt-1">
							{#each Object.entries(item.details) as [key, value]}
								<span class="text-[10px] text-[var(--color-text-muted)]">
									{key}: <span class="text-[var(--color-accent)]">{value}</span>
								</span>
							{/each}
						</div>
					{/if}
				</button>
			{/each}
		{/if}
	</div>
</div>
