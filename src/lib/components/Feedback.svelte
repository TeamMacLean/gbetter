<!--
  In-app feedback link → a prefilled GitHub issue with diagnostic context
  (metadata only, never track data). The channel for learning from field use,
  since gBeta has no analytics.
-->
<script lang="ts">
	import { useViewport } from '$lib/stores/viewport.svelte';
	import { useAssembly } from '$lib/stores/assembly.svelte';
	import { useTracks } from '$lib/stores/tracks.svelte';
	import { useRemoteTracks } from '$lib/stores/remoteTracks.svelte';
	import { useLocalBinaryTracks } from '$lib/stores/localBinaryTracks.svelte';
	import { buildFeedbackUrl, summarizeTracks } from '$lib/services/feedback';

	const viewport = useViewport();
	const assembly = useAssembly();
	const tracks = useTracks();
	const remoteTracks = useRemoteTracks();
	const localBinaryTracks = useLocalBinaryTracks();

	function openFeedback() {
		const vp = viewport.current;
		const types = [
			...tracks.all.map((t) => t.typeId),
			...remoteTracks.all.map((t) => t.type),
			...localBinaryTracks.all.map((t) => t.type)
		];
		const url = buildFeedbackUrl({
			assemblyName: assembly.current.name,
			assemblyId: assembly.current.id,
			view: `${vp.chromosome}:${vp.start.toLocaleString()}-${vp.end.toLocaleString()}`,
			trackSummary: summarizeTracks(types),
			url: typeof window !== 'undefined' ? window.location.href : '',
			userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
		});
		window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

<button
	onclick={openFeedback}
	class="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
	title="Send feedback / report a bug (opens a prefilled GitHub issue)"
	aria-label="Send feedback"
>
	<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
	</svg>
</button>
