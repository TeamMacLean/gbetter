<script lang="ts">
	import {
		getProviders,
		loadAISettings,
		saveAISettings,
		type AISettings
	} from '$lib/services/ai';
	import { useTheme, type ThemeMode } from '$lib/stores/theme.svelte';
	import { PALETTES, type PaletteName } from '$lib/services/palette';
	import { useTracks } from '$lib/stores/tracks.svelte';

	let { isOpen = $bindable(false) } = $props();

	// Tab state
	type SettingsTab = 'ai' | 'display';
	let activeTab = $state<SettingsTab>('ai');

	// AI Settings state
	const providers = getProviders();
	let settings = $state<AISettings>(loadAISettings());
	let testingConnection = $state(false);
	let testResult = $state<{ success: boolean; message: string } | null>(null);
	let showApiKey = $state<Record<string, boolean>>({});

	const activeProvider = $derived(
		providers.find(p => p.id === settings.activeProvider) || providers[0]
	);

	// Theme and Display Settings
	const theme = useTheme();
	const tracks = useTracks();

	// Theme mode display names
	const themeModeLabels: Record<ThemeMode, string> = {
		'light': 'Light',
		'dark': 'Dark',
		'high-contrast': 'High Contrast',
	};

	// AI Settings functions
	function selectProvider(providerId: string) {
		settings.activeProvider = providerId;
		saveAISettings(settings);
		testResult = null;
	}

	function setApiKey(providerId: string, key: string) {
		settings.apiKeys[providerId] = key;
		saveAISettings(settings);
		testResult = null;
	}

	function setModel(providerId: string, modelId: string) {
		settings.activeModels[providerId] = modelId;
		saveAISettings(settings);
	}

	async function testConnection() {
		const provider = providers.find(p => p.id === settings.activeProvider);
		if (!provider) return;

		const apiKey = settings.apiKeys[settings.activeProvider];
		if (!apiKey) {
			testResult = { success: false, message: 'Enter an API key first' };
			return;
		}

		testingConnection = true;
		testResult = null;

		try {
			const success = await provider.testConnection(apiKey);
			if (success) {
				testResult = { success: true, message: 'Connection successful!' };
			} else {
				testResult = { success: false, message: 'Connection failed. Check browser console for details.' };
			}
		} catch (e) {
			const errorMsg = e instanceof Error ? e.message : 'Unknown error';
			console.error('Connection test error:', e);
			testResult = { success: false, message: `Error: ${errorMsg}` };
		} finally {
			testingConnection = false;
		}
	}

	function toggleShowApiKey(providerId: string) {
		showApiKey[providerId] = !showApiKey[providerId];
	}

	// Display Settings functions
	function handleThemeModeChange(mode: ThemeMode) {
		theme.setMode(mode);
		tracks.invalidateRender();
	}

	function handlePaletteChange(name: PaletteName) {
		theme.setPalette(name);
		tracks.invalidateRender();
	}

	function close() {
		isOpen = false;
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-50"
		onclick={close}
		onkeydown={(e) => e.key === 'Escape' && close()}
		role="button"
		tabindex="0"
	></div>

	<!-- Modal -->
	<div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl">
		<!-- Header with Tabs -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
			<div class="flex gap-1">
				<button
					onclick={() => activeTab = 'ai'}
					class="px-3 py-1.5 text-sm font-medium rounded transition-colors"
					class:bg-[var(--color-accent)]={activeTab === 'ai'}
					class:text-white={activeTab === 'ai'}
					class:text-[var(--color-text-secondary)]={activeTab !== 'ai'}
					class:hover:text-[var(--color-text-primary)]={activeTab !== 'ai'}
				>
					AI
				</button>
				<button
					onclick={() => activeTab = 'display'}
					class="px-3 py-1.5 text-sm font-medium rounded transition-colors"
					class:bg-[var(--color-accent)]={activeTab === 'display'}
					class:text-white={activeTab === 'display'}
					class:text-[var(--color-text-secondary)]={activeTab !== 'display'}
					class:hover:text-[var(--color-text-primary)]={activeTab !== 'display'}
				>
					Display
				</button>
			</div>
			<button
				onclick={close}
				class="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
				title="Close"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
			{#if activeTab === 'ai'}
				<!-- AI Settings Tab -->
				<!-- Provider Selection -->
				<div>
					<label class="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
						AI Provider
					</label>
					<div class="flex gap-2">
						{#each providers as provider}
							<button
								onclick={() => selectProvider(provider.id)}
								class="flex-1 px-3 py-2 text-sm rounded border transition-colors"
								class:bg-[var(--color-accent)]={settings.activeProvider === provider.id}
								class:text-white={settings.activeProvider === provider.id}
								class:border-[var(--color-accent)]={settings.activeProvider === provider.id}
								class:bg-[var(--color-bg-tertiary)]={settings.activeProvider !== provider.id}
								class:text-[var(--color-text-primary)]={settings.activeProvider !== provider.id}
								class:border-[var(--color-border)]={settings.activeProvider !== provider.id}
							>
								{provider.name}
							</button>
						{/each}
					</div>
				</div>

				<!-- API Key -->
				<div>
					<label class="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
						API Key
						<a
							href={activeProvider.apiKeyUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="ml-2 text-[var(--color-accent)] hover:underline"
						>
							Get key
						</a>
					</label>
					<div class="relative">
						<input
							type={showApiKey[settings.activeProvider] ? 'text' : 'password'}
							value={settings.apiKeys[settings.activeProvider] || ''}
							oninput={(e) => setApiKey(settings.activeProvider, e.currentTarget.value)}
							placeholder={activeProvider.apiKeyPlaceholder}
							class="w-full px-3 py-2 pr-20 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-text-primary)] font-mono"
						/>
						<button
							onclick={() => toggleShowApiKey(settings.activeProvider)}
							class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
						>
							{showApiKey[settings.activeProvider] ? 'Hide' : 'Show'}
						</button>
					</div>
					<p class="mt-1 text-xs text-[var(--color-text-muted)]">
						Your API key is stored locally in your browser and sent directly to {activeProvider.name}.
					</p>
				</div>

				<!-- Model Selection -->
				<div>
					<label class="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
						Model
					</label>
					<select
						value={settings.activeModels[settings.activeProvider] || activeProvider.models.find(m => m.isDefault)?.id}
						onchange={(e) => setModel(settings.activeProvider, e.currentTarget.value)}
						class="w-full px-3 py-2 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-text-primary)]"
					>
						{#each activeProvider.models as model}
							<option value={model.id}>
								{model.name} - {model.description}
							</option>
						{/each}
					</select>
				</div>

				<!-- Test Connection -->
				<div class="flex items-center gap-3">
					<button
						onclick={testConnection}
						disabled={testingConnection || !settings.apiKeys[settings.activeProvider]}
						class="px-4 py-2 text-sm bg-[var(--color-accent)] text-white rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
					>
						{testingConnection ? 'Testing...' : 'Test Connection'}
					</button>
					{#if testResult}
						<span
							class="text-sm"
							class:text-green-500={testResult.success}
							class:text-red-500={!testResult.success}
						>
							{testResult.message}
						</span>
					{/if}
				</div>
			{:else if activeTab === 'display'}
				<!-- Display Settings Tab -->

				<!-- Theme Mode -->
				<div>
					<label class="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
						Theme
					</label>
					<p class="text-xs text-[var(--color-text-muted)] mb-3">
						Choose light (default, print-ready), dark, or high-contrast for accessibility.
					</p>
					<div class="flex gap-2">
						{#each theme.getAvailableModes() as mode}
							<button
								onclick={() => handleThemeModeChange(mode)}
								class="flex-1 px-3 py-2 text-sm rounded border transition-colors"
								class:bg-[var(--color-accent)]={theme.mode === mode}
								class:text-white={theme.mode === mode}
								class:border-[var(--color-accent)]={theme.mode === mode}
								class:bg-[var(--color-bg-tertiary)]={theme.mode !== mode}
								class:text-[var(--color-text-primary)]={theme.mode !== mode}
								class:border-[var(--color-border)]={theme.mode !== mode}
								class:hover:border-[var(--color-accent)]={theme.mode !== mode}
							>
								{themeModeLabels[mode]}
							</button>
						{/each}
					</div>
				</div>

				<!-- Color Palette -->
				<div>
					<label class="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
						Color Palette
					</label>
					<p class="text-xs text-[var(--color-text-muted)] mb-3">
						Choose a color palette for genomic features. All palettes are colorblind-safe.
					</p>
					<div class="flex gap-2">
						{#each theme.getAvailablePalettes() as paletteName}
							{@const palette = PALETTES[paletteName]}
							<button
								onclick={() => handlePaletteChange(paletteName)}
								class="flex-1 px-3 py-2 text-sm rounded border transition-colors"
								class:bg-[var(--color-accent)]={theme.paletteName === paletteName}
								class:text-white={theme.paletteName === paletteName}
								class:border-[var(--color-accent)]={theme.paletteName === paletteName}
								class:bg-[var(--color-bg-tertiary)]={theme.paletteName !== paletteName}
								class:text-[var(--color-text-primary)]={theme.paletteName !== paletteName}
								class:border-[var(--color-border)]={theme.paletteName !== paletteName}
								class:hover:border-[var(--color-accent)]={theme.paletteName !== paletteName}
							>
								{palette.name}
							</button>
						{/each}
					</div>
					<p class="mt-2 text-xs text-[var(--color-text-muted)]">
						{PALETTES[theme.paletteName]?.description || ''}
					</p>
					<!-- Palette Preview -->
					<div class="mt-3 flex gap-1">
						{#each PALETTES[theme.paletteName]?.colors.slice(0, 8) || [] as color}
							<div
								class="w-6 h-6 rounded"
								style="background-color: {color}"
								title={color}
							></div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)] rounded-b-lg">
			{#if activeTab === 'ai'}
				<p class="text-xs text-[var(--color-text-muted)]">
					AI is used to translate natural language to GQL commands. Your queries and data are sent to the selected AI provider.
				</p>
			{:else}
				<p class="text-xs text-[var(--color-text-muted)]">
					Display settings are saved automatically and persist across sessions.
				</p>
			{/if}
		</div>
	</div>
{/if}
