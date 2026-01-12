<script lang="ts">
	import { onMount } from 'svelte';
	import { useTracks } from '$lib/stores/tracks.svelte';
	import { useViewport } from '$lib/stores/viewport.svelte';
	import { loadSession, clearSession, type SessionState } from '$lib/services/persistence';

	const tracks = useTracks();
	const viewport = useViewport();

	let savedSession = $state<SessionState | null>(null);
	let dismissed = $state(false);
	let fileInput: HTMLInputElement;

	onMount(() => {
		// Check for saved session on mount
		savedSession = loadSession();
	});

	function handleRestore() {
		if (!savedSession) return;

		// Restore viewport position
		viewport.navigateTo(
			savedSession.viewport.chromosome,
			savedSession.viewport.start,
			savedSession.viewport.end
		);

		// Prompt user to re-upload files
		if (savedSession.tracks.length > 0) {
			fileInput?.click();
		}
	}

	function handleDismiss() {
		dismissed = true;
	}

	function handleClearSession() {
		clearSession();
		savedSession = null;
	}

	// Hide banner if tracks are already loaded or no saved session
	const showBanner = $derived(
		savedSession !== null &&
		savedSession.tracks.length > 0 &&
		tracks.all.length === 0 &&
		!dismissed
	);

	// Format saved time
	function formatSavedTime(timestamp: number): string {
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'just now';
	}
</script>

<input
	type="file"
	bind:this={fileInput}
	class="hidden"
	multiple
	accept=".bed,.gff,.gff3,.bedgraph,.vcf"
	onchange={(e) => {
		const files = e.currentTarget.files;
		if (files) {
			for (const file of files) {
				tracks.addTrackFromFile(file);
			}
		}
		dismissed = true;
	}}
/>

{#if showBanner}
	<div class="bg-indigo-900/50 border-b border-indigo-700/50 px-4 py-2 flex items-center gap-3 text-sm">
		<div class="flex-1">
			<span class="text-indigo-200">
				Previous session found
			</span>
			<span class="text-indigo-400 ml-2">
				{savedSession?.tracks.length} track{savedSession?.tracks.length === 1 ? '' : 's'}
				at {savedSession?.viewport.chromosome}:{savedSession?.viewport.start.toLocaleString()}-{savedSession?.viewport.end.toLocaleString()}
			</span>
			<span class="text-indigo-500 ml-2">
				({formatSavedTime(savedSession?.savedAt ?? 0)})
			</span>
		</div>

		<button
			onclick={handleRestore}
			class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
		>
			Restore & Re-upload Files
		</button>

		<button
			onclick={handleDismiss}
			class="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs font-medium transition-colors"
		>
			Dismiss
		</button>

		<button
			onclick={handleClearSession}
			class="text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
			title="Clear saved session"
		>
			Clear
		</button>
	</div>
{/if}
