<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>GBetter - Genome Browser</title>
	<meta name="description" content="A modern, lightweight genome browser with AI-powered navigation" />
</svelte:head>

<div class="min-h-screen flex flex-col bg-[var(--color-bg-primary)]">
	{@render children()}
</div>
