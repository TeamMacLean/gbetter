/**
 * BigWig Remote Track Service
 *
 * Enables efficient region-based querying of remote BigWig files
 * using HTTP Range requests. Returns signal data (coverage, ChIP-seq peaks, etc.)
 */

import { BigWig } from '@gmod/bbi';
import { RemoteFile } from 'generic-filehandle2';
import type { SignalFeature } from '$lib/types/tracks';

// Feature type from @gmod/bbi BigWig
interface BigWigFeature {
	start: number;
	end: number;
	score: number;
}

// Cache for BigWig file handles
const bigWigCache = new Map<string, BigWig>();

// Cache for fetched features (keyed by url + region)
const featureCache = new Map<string, { features: SignalFeature[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Chromosome alias maps for GenArk assemblies that use NCBI accession numbers
 * Maps from standard chr names to NCBI RefSeq accessions
 * (Shared with bigbed.ts - could be refactored to a common module)
 */
const GENARK_CHROMOSOME_MAPS: Record<string, Record<string, string>> = {
	// Mouse mm39 (GCF_000001635.27)
	'mm39': {
		'chr1': 'NC_000067.7', 'chr2': 'NC_000068.8', 'chr3': 'NC_000069.7',
		'chr4': 'NC_000070.7', 'chr5': 'NC_000071.7', 'chr6': 'NC_000072.7',
		'chr7': 'NC_000073.7', 'chr8': 'NC_000074.7', 'chr9': 'NC_000075.7',
		'chr10': 'NC_000076.7', 'chr11': 'NC_000077.7', 'chr12': 'NC_000078.7',
		'chr13': 'NC_000079.7', 'chr14': 'NC_000080.7', 'chr15': 'NC_000081.7',
		'chr16': 'NC_000082.7', 'chr17': 'NC_000083.7', 'chr18': 'NC_000084.7',
		'chr19': 'NC_000085.7', 'chrX': 'NC_000086.8', 'chrY': 'NC_000087.8',
		'chrM': 'NC_005089.1',
	},
	// Zebrafish danRer11 (GCF_000002035.6)
	'danrer11': {
		'chr1': 'NC_007112.7', 'chr2': 'NC_007113.7', 'chr3': 'NC_007114.7',
		'chr4': 'NC_007115.7', 'chr5': 'NC_007116.7', 'chr6': 'NC_007117.7',
		'chr7': 'NC_007118.7', 'chr8': 'NC_007119.7', 'chr9': 'NC_007120.7',
		'chr10': 'NC_007121.7', 'chr11': 'NC_007122.7', 'chr12': 'NC_007123.7',
		'chr13': 'NC_007124.7', 'chr14': 'NC_007125.7', 'chr15': 'NC_007126.7',
		'chr16': 'NC_007127.7', 'chr17': 'NC_007128.7', 'chr18': 'NC_007129.7',
		'chr19': 'NC_007130.7', 'chr20': 'NC_007131.7', 'chr21': 'NC_007132.7',
		'chr22': 'NC_007133.7', 'chr23': 'NC_007134.7', 'chr24': 'NC_007135.7',
		'chr25': 'NC_007136.7', 'chrM': 'NC_002333.2',
	},
	// Fly dm6 (GCF_000001215.4)
	'dm6': {
		'chr2L': 'NT_033779.5', 'chr2R': 'NT_033778.4', 'chr3L': 'NT_037436.4',
		'chr3R': 'NT_033777.3', 'chr4': 'NC_004353.4', 'chrX': 'NC_004354.4',
		'chrY': 'NC_024512.1', 'chrM': 'NC_024511.2',
	},
	// Worm ce11 (GCF_000002985.6)
	'ce11': {
		'chrI': 'NC_003279.8', 'chrII': 'NC_003280.10', 'chrIII': 'NC_003281.10',
		'chrIV': 'NC_003282.8', 'chrV': 'NC_003283.11', 'chrX': 'NC_003284.9',
		'chrM': 'NC_001328.1',
	},
	// Yeast sacCer3 (GCF_000146045.2)
	'saccer3': {
		'chrI': 'NC_001133.9', 'chrII': 'NC_001134.8', 'chrIII': 'NC_001135.5',
		'chrIV': 'NC_001136.10', 'chrV': 'NC_001137.3', 'chrVI': 'NC_001138.5',
		'chrVII': 'NC_001139.9', 'chrVIII': 'NC_001140.6', 'chrIX': 'NC_001141.2',
		'chrX': 'NC_001142.9', 'chrXI': 'NC_001143.9', 'chrXII': 'NC_001144.5',
		'chrXIII': 'NC_001145.3', 'chrXIV': 'NC_001146.8', 'chrXV': 'NC_001147.6',
		'chrXVI': 'NC_001148.4', 'chrM': 'NC_001224.1',
	},
	// Rat rn7 (GCF_015227675.2)
	'rn7': {
		'chr1': 'NC_051336.1', 'chr2': 'NC_051337.1', 'chr3': 'NC_051338.1',
		'chr4': 'NC_051339.1', 'chr5': 'NC_051340.1', 'chr6': 'NC_051341.1',
		'chr7': 'NC_051342.1', 'chr8': 'NC_051343.1', 'chr9': 'NC_051344.1',
		'chr10': 'NC_051345.1', 'chr11': 'NC_051346.1', 'chr12': 'NC_051347.1',
		'chr13': 'NC_051348.1', 'chr14': 'NC_051349.1', 'chr15': 'NC_051350.1',
		'chr16': 'NC_051351.1', 'chr17': 'NC_051352.1', 'chr18': 'NC_051353.1',
		'chr19': 'NC_051354.1', 'chr20': 'NC_051355.1', 'chrX': 'NC_051356.1',
		'chrY': 'NC_051357.1', 'chrM': 'NC_001665.3',
	},
	// Chicken galGal6 (GCF_000002315.6)
	'galgal6': {
		'chr1': 'NC_006088.5', 'chr2': 'NC_006089.5', 'chr3': 'NC_006090.5',
		'chr4': 'NC_006091.5', 'chr5': 'NC_006092.5', 'chr6': 'NC_006093.5',
		'chr7': 'NC_006094.5', 'chr8': 'NC_006095.5', 'chr9': 'NC_006096.5',
		'chr10': 'NC_006097.5', 'chr11': 'NC_006098.5', 'chr12': 'NC_006099.5',
		'chr13': 'NC_006100.5', 'chr14': 'NC_006101.5', 'chr15': 'NC_006102.5',
		'chr16': 'NC_006103.5', 'chr17': 'NC_006104.5', 'chr18': 'NC_006105.5',
		'chr19': 'NC_006106.5', 'chr20': 'NC_006107.5', 'chr21': 'NC_006108.5',
		'chr22': 'NC_006109.5', 'chr23': 'NC_006110.5', 'chr24': 'NC_006111.5',
		'chr25': 'NC_006112.4', 'chr26': 'NC_006113.5', 'chr27': 'NC_006114.5',
		'chr28': 'NC_006115.5', 'chr30': 'NC_006117.4', 'chr31': 'NC_028739.1',
		'chr32': 'NC_028740.1', 'chr33': 'NC_008465.4', 'chrW': 'NC_006126.5',
		'chrZ': 'NC_006127.5', 'chrM': 'NC_001323.1',
	},
};

/**
 * Get chromosome alias map for an assembly
 */
function getChromosomeMap(assemblyId: string): Record<string, string> | null {
	const key = Object.keys(GENARK_CHROMOSOME_MAPS).find(
		k => k.toLowerCase() === assemblyId.toLowerCase()
	);
	return key ? GENARK_CHROMOSOME_MAPS[key] : null;
}

/**
 * Get or create a BigWig file handle
 */
async function getBigWig(url: string): Promise<BigWig> {
	if (bigWigCache.has(url)) {
		return bigWigCache.get(url)!;
	}

	const filehandle = new RemoteFile(url);
	const bigwig = new BigWig({ filehandle });

	// Verify the file is valid by reading header
	await bigwig.getHeader();

	bigWigCache.set(url, bigwig);
	return bigwig;
}

/**
 * Query signal data from a remote BigWig file
 */
export async function queryBigWig(
	url: string,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal; assemblyId?: string } = {}
): Promise<SignalFeature[]> {
	// Check cache
	const cacheKey = `${url}:${chromosome}:${start}-${end}`;
	const cached = featureCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.features;
	}

	try {
		const bigwig = await getBigWig(url);
		const header = await bigwig.getHeader(options);

		// Find the correct chromosome name in the BigWig file
		let resolvedChrom = chromosome;
		if (header.refsByName[chromosome] === undefined) {
			// Try assembly-specific chromosome mapping first (for NCBI accession numbers)
			if (options.assemblyId) {
				const chromMap = getChromosomeMap(options.assemblyId);
				if (chromMap && chromMap[chromosome]) {
					const mapped = chromMap[chromosome];
					if (header.refsByName[mapped] !== undefined) {
						resolvedChrom = mapped;
					}
				}
			}

			// If still not found, try common variations: chr1, Chr1, 1, CHR1
			if (header.refsByName[resolvedChrom] === undefined) {
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
			}

			// If still not found, return empty
			if (header.refsByName[resolvedChrom] === undefined) {
				return [];
			}
		}

		const rawFeatures = await bigwig.getFeatures(resolvedChrom, start, end, options);

		// Convert to SignalFeature format
		const features: SignalFeature[] = rawFeatures.map((f: BigWigFeature, i: number) => ({
			id: `bw_${i}_${f.start}`,
			chromosome,
			start: f.start,
			end: f.end,
			value: f.score,
		}));

		// Cache results
		featureCache.set(cacheKey, { features, timestamp: Date.now() });

		return features;
	} catch (error) {
		console.error(`Error querying BigWig ${url}:`, error);
		throw error;
	}
}

/**
 * Get chromosome list from a BigWig file
 */
export async function getBigWigChromosomes(
	url: string,
	options: { signal?: AbortSignal } = {}
): Promise<Array<{ name: string; length: number }>> {
	const bigwig = await getBigWig(url);
	const header = await bigwig.getHeader(options);

	return Object.entries(header.refsByNumber).map(([_, info]) => ({
		name: (info as { name: string; length: number }).name,
		length: (info as { name: string; length: number }).length,
	}));
}

/**
 * Clear all BigWig caches (useful when switching assemblies)
 */
export function clearBigWigCache(): void {
	bigWigCache.clear();
	featureCache.clear();
}
