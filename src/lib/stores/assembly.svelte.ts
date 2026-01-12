/**
 * Genome assembly management store using Svelte 5 runes
 * Supports built-in assemblies, URL loading, file loading, and inference from tracks
 */

import type { GenomeAssembly, ChromosomeInfo, GenomicFeature } from '$lib/types/genome';
import assembliesData from '$lib/data/assemblies.json';

// Load assemblies from JSON config
export const BUILTIN_ASSEMBLIES: GenomeAssembly[] = assembliesData.assemblies.map(a => ({
	...a,
	source: 'builtin' as const
}));

// Reactive state
let currentAssembly = $state<GenomeAssembly>(BUILTIN_ASSEMBLIES[0]);
let inferredChromosomes = $state<Map<string, number>>(new Map());

// Derived values
const chromosomeList = $derived(currentAssembly.chromosomes.map(c => c.name));
const hasInferredData = $derived(inferredChromosomes.size > 0);

/**
 * Set the current assembly
 */
function setAssembly(assembly: GenomeAssembly): void {
	currentAssembly = assembly;
}

/**
 * Set assembly by ID
 */
function setAssemblyById(id: string): void {
	const assembly = BUILTIN_ASSEMBLIES.find(a => a.id === id);
	if (assembly) {
		currentAssembly = assembly;
	}
}

/**
 * Get chromosome info by name (supports aliases)
 */
function getChromosome(name: string): ChromosomeInfo | undefined {
	// Direct match
	const direct = currentAssembly.chromosomes.find(c => c.name === name);
	if (direct) return direct;

	// Alias match
	return currentAssembly.chromosomes.find(c =>
		c.aliases?.some(a => a.toLowerCase() === name.toLowerCase())
	);
}

/**
 * Normalize chromosome name to canonical form
 */
function normalizeChromosomeName(name: string): string {
	const chr = getChromosome(name);
	return chr?.name ?? name;
}

/**
 * Infer chromosomes from loaded features
 * Tracks the maximum end position seen for each chromosome
 */
function inferFromFeatures(features: GenomicFeature[]): void {
	for (const feature of features) {
		const current = inferredChromosomes.get(feature.chromosome) ?? 0;
		if (feature.end > current) {
			inferredChromosomes.set(feature.chromosome, feature.end);
		}
	}
}

/**
 * Create an inferred assembly from observed chromosomes
 */
function createInferredAssembly(): GenomeAssembly {
	const chromosomes: ChromosomeInfo[] = [];

	for (const [name, maxEnd] of inferredChromosomes) {
		// Check if this chromosome exists in the current assembly
		const existing = getChromosome(name);
		if (existing) {
			// Use the known length if available
			chromosomes.push(existing);
		} else {
			// Use the observed maximum with some padding
			chromosomes.push({
				name,
				length: Math.ceil(maxEnd * 1.1) // 10% padding
			});
		}
	}

	// Sort chromosomes: numbered first, then X, Y, M, then others
	chromosomes.sort((a, b) => {
		const aNum = parseInt(a.name.replace(/^chr/i, ''), 10);
		const bNum = parseInt(b.name.replace(/^chr/i, ''), 10);

		if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
		if (!isNaN(aNum)) return -1;
		if (!isNaN(bNum)) return 1;

		const order = ['X', 'Y', 'M', 'MT'];
		const aIdx = order.findIndex(o => a.name.toUpperCase().includes(o));
		const bIdx = order.findIndex(o => b.name.toUpperCase().includes(o));

		if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
		if (aIdx >= 0) return -1;
		if (bIdx >= 0) return 1;

		return a.name.localeCompare(b.name);
	});

	return {
		id: 'inferred',
		name: 'Inferred from data',
		chromosomes,
		source: 'inferred'
	};
}

/**
 * Use the inferred assembly as current
 */
function useInferredAssembly(): void {
	if (inferredChromosomes.size > 0) {
		currentAssembly = createInferredAssembly();
	}
}

/**
 * Parse a chrom.sizes file content
 */
function parseChromSizes(content: string): ChromosomeInfo[] {
	const chromosomes: ChromosomeInfo[] = [];

	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const [name, lengthStr] = trimmed.split('\t');
		if (name && lengthStr) {
			const length = parseInt(lengthStr, 10);
			if (!isNaN(length)) {
				chromosomes.push({ name, length });
			}
		}
	}

	return chromosomes;
}

/**
 * Load assembly from chrom.sizes URL
 */
async function loadFromURL(url: string, name?: string): Promise<GenomeAssembly | null> {
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const content = await response.text();
		const chromosomes = parseChromSizes(content);

		if (chromosomes.length === 0) {
			throw new Error('No chromosomes found in file');
		}

		const assembly: GenomeAssembly = {
			id: `url-${Date.now()}`,
			name: name ?? url.split('/').pop() ?? 'Custom',
			chromosomes,
			source: 'url'
		};

		return assembly;
	} catch (error) {
		console.error('Failed to load assembly from URL:', error);
		return null;
	}
}

/**
 * Load assembly from a local .chrom.sizes file
 */
async function loadFromFile(file: File): Promise<GenomeAssembly | null> {
	try {
		const content = await file.text();
		const chromosomes = parseChromSizes(content);

		if (chromosomes.length === 0) {
			throw new Error('No chromosomes found in file');
		}

		// Use filename without extension as the assembly name
		const baseName = file.name.replace(/\.(chrom\.sizes|genome|sizes|txt)$/i, '');

		const assembly: GenomeAssembly = {
			id: `custom-${Date.now()}`,
			name: baseName || 'Custom Assembly',
			chromosomes,
			source: 'custom'
		};

		return assembly;
	} catch (error) {
		console.error('Failed to load assembly from file:', error);
		return null;
	}
}

/**
 * Clear inferred chromosome data
 */
function clearInferred(): void {
	inferredChromosomes = new Map();
}

/**
 * Get assemblies grouped by species for UI
 */
function getAssembliesBySpecies(): Map<string, GenomeAssembly[]> {
	const grouped = new Map<string, GenomeAssembly[]>();

	for (const assembly of BUILTIN_ASSEMBLIES) {
		const species = assembly.species ?? 'Other';
		const list = grouped.get(species) ?? [];
		list.push(assembly);
		grouped.set(species, list);
	}

	return grouped;
}

// Export as a reactive store object
export function useAssembly() {
	return {
		get current() { return currentAssembly; },
		get chromosomes() { return chromosomeList; },
		get hasInferred() { return hasInferredData; },
		get builtinAssemblies() { return BUILTIN_ASSEMBLIES; },
		get assembliesBySpecies() { return getAssembliesBySpecies(); },
		setAssembly,
		setAssemblyById,
		getChromosome,
		normalizeChromosomeName,
		inferFromFeatures,
		createInferredAssembly,
		useInferredAssembly,
		loadFromURL,
		loadFromFile,
		clearInferred
	};
}
