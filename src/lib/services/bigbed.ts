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

	// Extended BED fields from UCSC knownGene.bb:
	// parts[14] = gene symbol (e.g., "TP53")
	// parts[15] = protein ID (e.g., UniProt)
	const geneSymbol = parts[14] && parts[14] !== '' ? parts[14] : undefined;

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
		geneSymbol,
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

		// Find the correct chromosome name in the BigBed file
		// Try exact match first, then common variations
		let resolvedChrom = chromosome;
		if (header.refsByName[chromosome] === undefined) {
			// Try common variations: chr1, Chr1, 1, CHR1
			const variations = [
				chromosome.replace(/^chr/i, ''),           // Remove chr prefix
				'chr' + chromosome.replace(/^chr/i, ''),   // Add chr prefix (lowercase)
				'Chr' + chromosome.replace(/^chr/i, ''),   // Add Chr prefix (capitalized)
			];

			// Find first matching variation
			for (const variant of variations) {
				if (header.refsByName[variant] !== undefined) {
					resolvedChrom = variant;
					break;
				}
			}

			// If still not found, return empty
			if (header.refsByName[resolvedChrom] === undefined) {
				return [];
			}
		}

		const rawFeatures = await bigbed.getFeatures(resolvedChrom, start, end, options);

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
 * URLs for known gene BigBed files (gene-level annotations, single continuous features)
 * Note: UCSC knownGene.bb only has transcript-level data with exon blocks,
 * so UCSC assemblies only appear in TRANSCRIPT_BIGBED_URLS (no Genes track for them).
 */
export const GENE_BIGBED_URLS: Record<string, string> = {
	// Self-hosted on Cloudflare R2 - these have separate gene-level files
	// Plants
	'tair10': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/tair10.genes.bb',
	'irgsp1': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/irgsp1.genes.bb',
	'iwgsc-refseq2': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/iwgsc-refseq2.genes.bb',
	'morex-v3': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/morex-v3.genes.bb',
	'zm-b73-nam5': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/zm-b73-nam5.genes.bb',
	// Fungi
	'spombe': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/spombe.genes.bb',
	'botrytis': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/botrytis.genes.bb',
	'magnaporthe': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/magnaporthe.genes.bb',
	'puccinia': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/puccinia.genes.bb',
	'zymoseptoria': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/zymoseptoria.genes.bb',
	// Protists
	'phytophthora': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/phytophthora.genes.bb',
	// Bacteria/Viruses
	'ecoli-k12': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/ecoli-k12.genes.bb',
	'sars-cov-2': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/sars-cov-2.genes.bb',
};

/**
 * URLs for transcript BigBed files (compound feature models with exon structure)
 */
export const TRANSCRIPT_BIGBED_URLS: Record<string, string> = {
	// Human - UCSC knownGene.bb contains transcript-level data with exon blocks
	// These assemblies only show Transcripts track (no separate Genes track)
	'GRCh38': 'https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.bb',
	'hg38': 'https://hgdownload.soe.ucsc.edu/gbdb/hg38/knownGene.bb',
	'GRCh37': 'https://hgdownload.soe.ucsc.edu/gbdb/hg19/knownGene.bb',
	'hg19': 'https://hgdownload.soe.ucsc.edu/gbdb/hg19/knownGene.bb',
	// Self-hosted on Cloudflare R2 - these have matching .genes.bb files
	// Plants
	'tair10': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/tair10.transcripts.bb',
	'irgsp1': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/irgsp1.transcripts.bb',
	'iwgsc-refseq2': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/iwgsc-refseq2.transcripts.bb',
	'morex-v3': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/morex-v3.transcripts.bb',
	'zm-b73-nam5': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/zm-b73-nam5.transcripts.bb',
	// Fungi
	'spombe': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/spombe.transcripts.bb',
	'botrytis': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/botrytis.transcripts.bb',
	'magnaporthe': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/magnaporthe.transcripts.bb',
	'puccinia': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/puccinia.transcripts.bb',
	'zymoseptoria': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/zymoseptoria.transcripts.bb',
	// Protists
	'phytophthora': 'https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/phytophthora.transcripts.bb',
	// Bacteria/Viruses (these typically don't have separate transcript models)
	// 'ecoli-k12' and 'sars-cov-2' only have genes.bb
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

/**
 * Check if an assembly has a transcript BigBed URL
 */
export function hasTranscriptBigBed(assemblyId: string): boolean {
	// Case-insensitive lookup
	const key = Object.keys(TRANSCRIPT_BIGBED_URLS).find(
		k => k.toLowerCase() === assemblyId.toLowerCase()
	);
	return key !== undefined;
}

/**
 * Get the transcript BigBed URL for an assembly
 */
export function getTranscriptBigBedUrl(assemblyId: string): string | null {
	// Case-insensitive lookup
	const key = Object.keys(TRANSCRIPT_BIGBED_URLS).find(
		k => k.toLowerCase() === assemblyId.toLowerCase()
	);
	return key ? TRANSCRIPT_BIGBED_URLS[key] : null;
}
