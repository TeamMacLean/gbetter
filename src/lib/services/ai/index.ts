/**
 * AI Service - manages providers and translation
 */

import type {
	AIProvider,
	AISettings,
	BrowserContext,
	TranslationResponse,
	TrackInfo
} from './types';
import { DEFAULT_AI_SETTINGS } from './types';
import { anthropicProvider } from './providers/anthropic';
import { openaiProvider } from './providers/openai';
import { browser } from '$app/environment';

// Registry of available providers
const providers: Map<string, AIProvider> = new Map([
	['anthropic', anthropicProvider],
	['openai', openaiProvider]
]);

const SETTINGS_KEY = 'gbetter_ai_settings';

/**
 * Load AI settings from localStorage
 */
export function loadAISettings(): AISettings {
	if (!browser) return DEFAULT_AI_SETTINGS;

	try {
		const stored = localStorage.getItem(SETTINGS_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...DEFAULT_AI_SETTINGS, ...parsed };
		}
	} catch (e) {
		console.warn('Failed to load AI settings:', e);
	}

	return DEFAULT_AI_SETTINGS;
}

/**
 * Save AI settings to localStorage
 */
export function saveAISettings(settings: AISettings): void {
	if (!browser) return;

	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch (e) {
		console.warn('Failed to save AI settings:', e);
	}
}

/**
 * Get all available providers
 */
export function getProviders(): AIProvider[] {
	return Array.from(providers.values());
}

/**
 * Get a specific provider by ID
 */
export function getProvider(id: string): AIProvider | undefined {
	return providers.get(id);
}

/**
 * Get the currently active provider
 */
export function getActiveProvider(): AIProvider | undefined {
	const settings = loadAISettings();
	return providers.get(settings.activeProvider);
}

/**
 * Check if AI is configured (has API key for active provider)
 */
export function isAIConfigured(): boolean {
	const settings = loadAISettings();
	const apiKey = settings.apiKeys[settings.activeProvider];
	return Boolean(apiKey && apiKey.length > 0);
}

/**
 * Translate natural language to GQL using the active provider
 */
export async function translateToGQL(
	input: string,
	context: BrowserContext
): Promise<TranslationResponse> {
	const settings = loadAISettings();
	const provider = providers.get(settings.activeProvider);

	if (!provider) {
		return {
			success: false,
			error: `Unknown AI provider: ${settings.activeProvider}`
		};
	}

	const apiKey = settings.apiKeys[settings.activeProvider];
	const model = settings.activeModels[settings.activeProvider];

	return provider.translate({
		input,
		context,
		apiKey,
		model
	});
}

/**
 * Build browser context from current state
 */
export function buildBrowserContext(
	tracks: Array<{ name: string; typeId: string; features: Array<{ name?: string }> }>,
	viewport: { chromosome: string; start: number; end: number },
	knownGenes: string[] = []
): BrowserContext {
	const trackInfos: TrackInfo[] = tracks.map(t => {
		// Get sample feature names
		const sampleFeatures = t.features
			.filter(f => f.name)
			.slice(0, 10)
			.map(f => f.name as string);

		// Map typeId to type
		const typeMap: Record<string, TrackInfo['type']> = {
			'bed': 'bed',
			'gff3': 'gff3',
			'vcf': 'vcf',
			'bedgraph': 'bedgraph',
			'bigwig': 'bigwig',
			'bam': 'bam',
			'fasta': 'fasta'
		};

		return {
			name: t.name,
			type: typeMap[t.typeId] || 'bed',
			featureCount: t.features.length,
			sampleFeatures
		};
	});

	return {
		tracks: trackInfos,
		viewport,
		knownGenes
	};
}

// Re-export types
export type { AIProvider, AISettings, BrowserContext, TranslationResponse, TrackInfo };
export { DEFAULT_AI_SETTINGS };
