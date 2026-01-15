/**
 * BigBed Remote Track Service
 *
 * Enables efficient region-based querying of remote BigBed files
 * using HTTP Range requests. Only fetches data for the current viewport.
 */

import { BigBed } from '@gmod/bbi';
import { RemoteFile } from 'generic-filehandle2';
import type { BedFeature } from '$lib/types/genome';

// Feature type from @gmod/bbi
interface BigBedFeature {
	chromId?: number;
	start: number;
	end: number;
	rest?: string;
	uniqueId?: string;
}

// Cache for BigBed file handles
const bigBedCache = new Map<string, BigBed>();

// Cache for fetched features (keyed by url + region)
const featureCache = new Map<string, { features: BedFeature[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get or create a BigBed file handle
 */
async function getBigBed(url: string): Promise<BigBed> {
	if (bigBedCache.has(url)) {
		return bigBedCache.get(url)!;
	}

	const filehandle = new RemoteFile(url);
	const bigbed = new BigBed({ filehandle });

	// Verify the file is valid by reading header
	await bigbed.getHeader();

	bigBedCache.set(url, bigbed);
	return bigbed;
}

/**
 * Parse BED12 "rest" field into structured feature data
 * rest format: name\tscore\tstrand\tthickStart\tthickEnd\titemRgb\tblockCount\tblockSizes\tblockStarts
 */
function parseBed12Rest(
	chromId: number,
	start: number,
	end: number,
	rest: string,
	refsByNumber: Record<number, { name: string }>
): BedFeature {
	const parts = rest.split('\t');
	const chromosome = refsByNumber[chromId]?.name || `chr${chromId}`;

	const feature: BedFeature = {
		id: `${chromosome}:${start}-${end}:${parts[0] || 'unknown'}`,
		chromosome,
		start,
		end,
		name: parts[0] || undefined,
		score: parts[1] ? parseFloat(parts[1]) : undefined,
		strand: (parts[2] as '+' | '-' | '.') || undefined,
		thickStart: parts[3] ? parseInt(parts[3], 10) : undefined,
		thickEnd: parts[4] ? parseInt(parts[4], 10) : undefined,
		itemRgb: parts[5] || undefined,
		blockCount: parts[6] ? parseInt(parts[6], 10) : undefined,
		blockSizes: parts[7] ? parts[7].split(',').filter(Boolean).map(Number) : undefined,
		blockStarts: parts[8] ? parts[8].split(',').filter(Boolean).map(Number) : undefined,
	};

	return feature;
}

/**
 * Query features from a remote BigBed file
 */
export async function queryBigBed(
	url: string,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<BedFeature[]> {
	// Check cache
	const cacheKey = `${url}:${chromosome}:${start}-${end}`;
	const cached = featureCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.features;
	}

	try {
		const bigbed = await getBigBed(url);
		const header = await bigbed.getHeader(options);

		// Get chromosome ID from name
		const chromId = header.refsByName[chromosome];
		if (chromId === undefined) {
			// Try without 'chr' prefix or with it
			const altName = chromosome.startsWith('chr')
				? chromosome.slice(3)
				: `chr${chromosome}`;
			const altChromId = header.refsByName[altName];
			if (altChromId === undefined) {
				return []; // Chromosome not in file
			}
		}

		const rawFeatures = await bigbed.getFeatures(chromosome, start, end, options);

		const features = rawFeatures.map((f: BigBedFeature) =>
			parseBed12Rest(
				f.chromId ?? 0,
				f.start,
				f.end,
				f.rest || '',
				header.refsByNumber
			)
		);

		// Cache results
		featureCache.set(cacheKey, { features, timestamp: Date.now() });

		return features;
	} catch (error) {
		console.error(`Error querying BigBed ${url}:`, error);
		throw error;
	}
}

/**
 * Search for a gene by name using BigBed's extra index
 */
export async function searchBigBedByName(
	url: string,
	name: string,
	options: { signal?: AbortSignal } = {}
): Promise<BedFeature[]> {
	try {
		const bigbed = await getBigBed(url);
		const header = await bigbed.getHeader(options);
		const results = await bigbed.searchExtraIndex(name, options);

		return results.map((f) =>
			parseBed12Rest(
				f.chromId ?? 0,
				f.start,
				f.end,
				f.rest || '',
				header.refsByNumber
			)
		);
	} catch (error) {
		// Extra index may not exist - return empty
		console.warn(`BigBed name search failed for "${name}":`, error);
		return [];
	}
}

/**
 * Get chromosome list from a BigBed file
 */
export async function getBigBedChromosomes(
	url: string,
	options: { signal?: AbortSignal } = {}
): Promise<Array<{ name: string; length: number }>> {
	const bigbed = await getBigBed(url);
	const header = await bigbed.getHeader(options);

	return Object.entries(header.refsByNumber).map(([_, info]) => ({
		name: info.name,
		length: info.length,
	}));
}

/**
 * Clear all caches (useful when switching assemblies)
 */
export function clearBigBedCache(): void {
	bigBedCache.clear();
	featureCache.clear();
}

/**
 * URLs for known gene BigBed files
 */
export const GENE_BIGBED_URLS: Record<string, string> = {
	// Human - UCSC (verified working with CORS)
	'GRCh38': 'https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.bb',
	'hg38': 'https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.bb',
	'GRCh37': 'https://hgdownload.soe.ucsc.edu/gbdb/hg19/knownGene.bb',
	'hg19': 'https://hgdownload.soe.ucsc.edu/gbdb/hg19/knownGene.bb',
	// Self-hosted on Cloudflare R2 (verified working)
	// Plants
	'tair10': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/tair10.genes.bb',
	'irgsp1': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/irgsp1.genes.bb',
	'iwgsc-refseq2': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/iwgsc-refseq2.genes.bb',
	'morex-v3': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/morex-v3.genes.bb',
	'zm-b73-nam5': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/zm-b73-nam5.genes.bb',
	// Fungi
	'spombe': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/spombe.genes.bb',
	'botrytis': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/botrytis.genes.bb',
	'magnaporthe': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/magnaporthe.genes.bb',
	'puccinia': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/puccinia.genes.bb',
	'zymoseptoria': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/zymoseptoria.genes.bb',
	// Protists
	'phytophthora': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/phytophthora.genes.bb',
	// Bacteria/Viruses
	'ecoli-k12': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/ecoli-k12.genes.bb',
	'sars-cov-2': 'https://pub-a59506d7c8c94437a8cd4034c5101b56.r2.dev/sars-cov-2.genes.bb',
};

/**
 * Check if an assembly has a known gene BigBed URL
 */
export function hasGeneBigBed(assemblyId: string): boolean {
	// Case-insensitive lookup
	const key = Object.keys(GENE_BIGBED_URLS).find(
		k => k.toLowerCase() === assemblyId.toLowerCase()
	);
	return key !== undefined;
}

/**
 * Get the gene BigBed URL for an assembly
 */
export function getGeneBigBedUrl(assemblyId: string): string | null {
	// Case-insensitive lookup
	const key = Object.keys(GENE_BIGBED_URLS).find(
		k => k.toLowerCase() === assemblyId.toLowerCase()
	);
	return key ? GENE_BIGBED_URLS[key] : null;
}
