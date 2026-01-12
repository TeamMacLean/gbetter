<script lang="ts">
	import { useViewport } from '$lib/stores/viewport.svelte';
	import { useQueryHistory } from '$lib/stores/queryHistory.svelte';
	import {
		parseQuery,
		executeQuery,
		translateNaturalLanguage,
		getAvailableGenes,
		type QueryResult,
		type ListResultItem
	} from '$lib/services/queryLanguage';
	import { parseCoordinate } from '$lib/types/genome';
	import QueryResultPanel from './QueryResultPanel.svelte';

	const viewport = useViewport();
	const queryHistory = useQueryHistory();

	let query = $state('');
	let isLoading = $state(false);
	let lastResult = $state<QueryResult | null>(null);
	let showSuggestions = $state(false);
	let showHistory = $state(false);
	let showResultPanel = $state(false);
	let resultPanelData = $state<{ title: string; query: string; results: ListResultItem[] } | null>(null);

	// Compute suggestions based on input
	const suggestions = $derived(() => {
		if (!query.trim()) return [];

		const lower = query.toLowerCase();
		const genes = getAvailableGenes();

		// Gene name suggestions
		const geneMatches = genes
			.filter(g => g.toLowerCase().startsWith(lower) || g.toLowerCase().includes(lower))
			.slice(0, 5);

		// Command suggestions
		const commands = ['navigate', 'search', 'zoom', 'pan'];
		const cmdMatches = commands.filter(c => c.startsWith(lower));

		return [...cmdMatches, ...geneMatches.map(g => `search gene ${g}`)];
	});

	async function handleSearch(event: Event) {
		event.preventDefault();
		if (!query.trim()) return;

		isLoading = true;
		showSuggestions = false;

		// Small delay for UX
		await new Promise(resolve => setTimeout(resolve, 100));

		// Try direct coordinate first
		const coord = parseCoordinate(query);
		if (coord) {
			const parsed = parseQuery(`navigate ${query}`);
			const result = executeQuery(parsed);
			lastResult = result;
			queryHistory.addToHistory(result);
			if (result.success) query = '';
			isLoading = false;
			return;
		}

		// Try as GQL command
		let parsed = parseQuery(query);

		// If not a valid GQL command, try natural language translation
		if (!parsed.valid || parsed.command === 'unknown') {
			const translated = translateNaturalLanguage(query);
			if (translated) {
				parsed = translated;
			}
		}

		// Execute the query
		const result = executeQuery(parsed);

		// Add natural language input if translated
		if (parsed.raw !== query) {
			result.naturalLanguage = query;
		}

		lastResult = result;
		queryHistory.addToHistory(result);

		// Show result panel for list queries
		if (result.showResultPanel && result.results) {
			resultPanelData = {
				title: result.message,
				query: result.query.raw,
				results: result.results
			};
			showResultPanel = true;
		}

		if (result.success) {
			query = '';
		}

		isLoading = false;
	}

	function handleSuggestionClick(suggestion: string) {
		query = suggestion;
		showSuggestions = false;
		// Auto-submit
		handleSearch(new Event('submit'));
	}

	function handleHistoryItemClick(item: QueryResult) {
		query = item.query.raw;
		showHistory = false;
		handleSearch(new Event('submit'));
	}

	function formatTimestamp(ts: number): string {
		const diff = Date.now() - ts;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);

		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'just now';
	}
</script>

<div class="relative flex items-center gap-2 w-full max-w-xl">
	<form onsubmit={handleSearch} class="relative flex-1">
		<input
			type="text"
			bind:value={query}
			onfocus={() => showSuggestions = true}
			onblur={() => setTimeout(() => showSuggestions = false, 200)}
			placeholder="Search genes, coordinates, or use GQL..."
			disabled={isLoading}
			class="w-full px-4 py-1.5 pl-10 pr-16 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-full focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] disabled:opacity-50"
		/>
		<!-- Search icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
		</svg>
		<!-- GQL indicator -->
		<span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-accent)] font-mono">
			GQL
		</span>

		<!-- Suggestions dropdown -->
		{#if showSuggestions && suggestions().length > 0 && query.trim()}
			<div class="absolute top-full left-0 right-0 mt-1 py-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
				{#each suggestions() as suggestion}
					<button
						type="button"
						onclick={() => handleSuggestionClick(suggestion)}
						class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-border)] text-[var(--color-text-primary)] font-mono"
					>
						{suggestion}
					</button>
				{/each}
			</div>
		{/if}
	</form>

	<!-- History button -->
	<button
		onclick={() => showHistory = !showHistory}
		class="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors relative"
		title="Query history"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		{#if queryHistory.count > 0}
			<span class="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-accent)] text-white text-[10px] rounded-full flex items-center justify-center">
				{queryHistory.count > 9 ? '9+' : queryHistory.count}
			</span>
		{/if}
	</button>

	<!-- History dropdown -->
	{#if showHistory}
		<div class="absolute top-full right-0 mt-1 w-80 py-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
			<div class="px-3 py-2 text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)] flex justify-between items-center">
				<span>Query History</span>
				{#if queryHistory.count > 0}
					<button
						onclick={() => queryHistory.clearHistory()}
						class="text-red-400 hover:text-red-300"
					>
						Clear
					</button>
				{/if}
			</div>
			{#if queryHistory.items.length === 0}
				<div class="px-3 py-4 text-sm text-[var(--color-text-muted)] text-center">
					No queries yet
				</div>
			{:else}
				{#each queryHistory.items.slice(0, 20) as item}
					<button
						onclick={() => handleHistoryItemClick(item)}
						class="w-full px-3 py-2 text-left hover:bg-[var(--color-border)] transition-colors"
					>
						<div class="flex items-center gap-2">
							<span class={item.success ? 'text-green-400' : 'text-red-400'}>
								{item.success ? '✓' : '✗'}
							</span>
							<code class="text-xs text-[var(--color-text-primary)] flex-1 truncate">
								{item.query.raw}
							</code>
							<span class="text-[10px] text-[var(--color-text-muted)]">
								{formatTimestamp(item.timestamp)}
							</span>
						</div>
						{#if item.naturalLanguage}
							<div class="text-[10px] text-[var(--color-text-muted)] mt-0.5 pl-5 truncate">
								"{item.naturalLanguage}"
							</div>
						{/if}
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<!-- Result message with GQL visibility -->
{#if lastResult}
	<div class="ml-2 flex items-center gap-2 text-xs">
		<span class={lastResult.success ? 'text-green-400' : 'text-amber-400'}>
			{lastResult.message}
		</span>
		<!-- Always show the GQL that was executed -->
		<code class="text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded font-mono">
			{lastResult.query.raw}
		</code>
		{#if lastResult.naturalLanguage}
			<span class="text-[var(--color-text-muted)]">from "{lastResult.naturalLanguage}"</span>
		{/if}
	</div>
{/if}

<!-- Query Result Panel -->
{#if showResultPanel && resultPanelData}
	<QueryResultPanel
		title={resultPanelData.title}
		query={resultPanelData.query}
		results={resultPanelData.results}
		onClose={() => { showResultPanel = false; resultPanelData = null; }}
	/>
{/if}
