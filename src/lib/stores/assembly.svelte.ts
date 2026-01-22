/**
 * Genome assembly management store using Svelte 5 runes
 * Supports built-in assemblies, URL loading, file loading, and inference from tracks
 */

import { browser } from '$app/environment';
import type { GenomeAssembly, ChromosomeInfo, GenomicFeature } from '$lib/types/genome';
import assembliesData from '$lib/data/assemblies.json';

// Load assemblies from JSON config
export const BUILTIN_ASSEMBLIES: GenomeAssembly[] = assembliesData.assemblies.map(a => ({
	...a,
	source: 'builtin' as const
}));

/**
 * Get initial assembly from URL parameter or default to first
 */
function getInitialAssembly(): GenomeAssembly {
	if (browser) {
		const params = new URLSearchParams(window.location.search);
		const assemblyId = params.get('assembly');
		if (assemblyId) {
			// Case-insensitive match
			const found = BUILTIN_ASSEMBLIES.find(
				a => a.id.toLowerCase() === assemblyId.toLowerCase()
			);
			if (found) return found;
		}
	}
	return BUILTIN_ASSEMBLIES[0];
}

// Reactive state
let currentAssembly = $state<GenomeAssembly>(getInitialAssembly());
let inferredChromosomes = $state<Map<string, number>>(new Map());

// Derived values
const chromosomeList = $derived(currentAssembly.chromosomes.map(c => c.name));
const hasInferredData = $derived(inferredChromosomes.size > 0);

/**
 * Update URL with assembly parameter
 */
function updateURLWithAssembly(assemblyId: string): void {
	if (!browser) return;

	const params = new URLSearchParams(window.location.search);
	params.set('assembly', assemblyId);

	const newUrl = `${window.location.pathname}?${params.toString()}`;
	window.history.replaceState({}, '', newUrl);
}

/**
 * Set the current assembly
 */
function setAssembly(assembly: GenomeAssembly): void {
	currentAssembly = assembly;
	if (assembly.source === 'builtin') {
		updateURLWithAssembly(assembly.id);
	}
}

/**
 * Set assembly by ID
 */
function setAssemblyById(id: string): void {
	const assembly = BUILTIN_ASSEMBLIES.find(a => a.id === id);
	if (assembly) {
		currentAssembly = assembly;
		updateURLWithAssembly(assembly.id);
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
 * Taxonomic categories for the assembly dropdown
 */
export type TaxonomicCategory = 'Animals' | 'Plants' | 'Fungi' | 'Protists' | 'Bacteria' | 'Viruses';

/**
 * Category display order
 */
const CATEGORY_ORDER: TaxonomicCategory[] = ['Animals', 'Plants', 'Fungi', 'Protists', 'Bacteria', 'Viruses'];

/**
 * Map species to their taxonomic category
 */
const SPECIES_TO_CATEGORY: Record<string, TaxonomicCategory> = {
	// Animals
	'Human': 'Animals',
	'Mouse': 'Animals',
	'Rat': 'Animals',
	'Chicken': 'Animals',
	'Zebrafish': 'Animals',
	'Drosophila melanogaster': 'Animals',
	'C. elegans': 'Animals',
	// Plants
	'Arabidopsis thaliana': 'Plants',
	'Barley (Hordeum vulgare)': 'Plants',
	'Maize (Zea mays)': 'Plants',
	'Rice (Oryza sativa)': 'Plants',
	'Wheat (Triticum aestivum)': 'Plants',
	// Fungi
	'Botrytis cinerea (Grey Mold)': 'Fungi',
	'Fission Yeast (S. pombe)': 'Fungi',
	'Rice Blast (Magnaporthe oryzae)': 'Fungi',
	'S. cerevisiae (Yeast)': 'Fungi',
	'Stem Rust (Puccinia graminis)': 'Fungi',
	'Wheat Septoria (Zymoseptoria tritici)': 'Fungi',
	// Protists
	'Late Blight (Phytophthora infestans)': 'Protists',
	// Bacteria
	'E. coli': 'Bacteria',
	// Viruses
	'SARS-CoV-2': 'Viruses'
};

/**
 * Species order within each category
 */
const SPECIES_ORDER: string[] = [
	// Animals - Mammals (alphabetical)
	'Human',
	'Mouse',
	'Rat',
	// Animals - Birds
	'Chicken',
	// Animals - Fish
	'Zebrafish',
	// Animals - Insects
	'Drosophila melanogaster',
	// Animals - Nematodes
	'C. elegans',
	// Plants (alphabetical)
	'Arabidopsis thaliana',
	'Barley (Hordeum vulgare)',
	'Maize (Zea mays)',
	'Rice (Oryza sativa)',
	'Wheat (Triticum aestivum)',
	// Fungi (alphabetical)
	'Botrytis cinerea (Grey Mold)',
	'Fission Yeast (S. pombe)',
	'Rice Blast (Magnaporthe oryzae)',
	'S. cerevisiae (Yeast)',
	'Stem Rust (Puccinia graminis)',
	'Wheat Septoria (Zymoseptoria tritici)',
	// Protists
	'Late Blight (Phytophthora infestans)',
	// Bacteria
	'E. coli',
	// Viruses
	'SARS-CoV-2'
];

/**
 * Structure for categorized assemblies
 */
export interface CategorizedAssemblies {
	category: TaxonomicCategory;
	species: Array<{
		name: string;
		assemblies: GenomeAssembly[];
	}>;
}

/**
 * Get assemblies grouped by species for UI, sorted taxonomically
 */
function getAssembliesBySpecies(): Map<string, GenomeAssembly[]> {
	const grouped = new Map<string, GenomeAssembly[]>();

	// First, group all assemblies by species
	for (const assembly of BUILTIN_ASSEMBLIES) {
		const species = assembly.species ?? 'Other';
		const list = grouped.get(species) ?? [];
		list.push(assembly);
		grouped.set(species, list);
	}

	// Sort assemblies within each species alphabetically by name
	for (const [species, assemblies] of grouped) {
		assemblies.sort((a, b) => a.name.localeCompare(b.name));
	}

	// Create a new Map with taxonomic ordering
	const sorted = new Map<string, GenomeAssembly[]>();

	// Add species in taxonomic order
	for (const species of SPECIES_ORDER) {
		if (grouped.has(species)) {
			sorted.set(species, grouped.get(species)!);
		}
	}

	// Add any remaining species not in the order list (shouldn't happen, but safe)
	for (const [species, assemblies] of grouped) {
		if (!sorted.has(species)) {
			sorted.set(species, assemblies);
		}
	}

	return sorted;
}

/**
 * Get assemblies grouped by taxonomic category, then by species
 * Returns a structured array for rendering nested dropdown
 */
function getAssembliesByCategory(): CategorizedAssemblies[] {
	// First get assemblies by species (already sorted)
	const bySpecies = getAssembliesBySpecies();

	// Group species by category
	const categoryMap = new Map<TaxonomicCategory, Array<{ name: string; assemblies: GenomeAssembly[] }>>();

	// Initialize categories in order
	for (const category of CATEGORY_ORDER) {
		categoryMap.set(category, []);
	}

	// Assign each species to its category
	for (const [species, assemblies] of bySpecies) {
		const category = SPECIES_TO_CATEGORY[species] ?? 'Animals';
		const speciesList = categoryMap.get(category)!;
		speciesList.push({ name: species, assemblies });
	}

	// Convert to array, filtering out empty categories
	const result: CategorizedAssemblies[] = [];
	for (const category of CATEGORY_ORDER) {
		const species = categoryMap.get(category)!;
		if (species.length > 0) {
			result.push({ category, species });
		}
	}

	return result;
}

// Export as a reactive store object
export function useAssembly() {
	return {
		get current() { return currentAssembly; },
		get chromosomes() { return chromosomeList; },
		get hasInferred() { return hasInferredData; },
		get builtinAssemblies() { return BUILTIN_ASSEMBLIES; },
		get assembliesBySpecies() { return getAssembliesBySpecies(); },
		get assembliesByCategory() { return getAssembliesByCategory(); },
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
