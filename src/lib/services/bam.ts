/**
 * BAM/CRAM Remote Track Service
 *
 * Supports:
 * - .bam + .bai (BAM alignments)
 * - .cram + .crai (CRAM alignments)
 *
 * Uses @gmod/bam for parsing.
 */

import { BamFile, BamRecord } from '@gmod/bam';
import { RemoteFile } from 'generic-filehandle2';
import type { BedFeature } from '$lib/types/genome';
import type { BAMReadFeature } from '$lib/types/tracks';

// Cache for BAM file handles
const bamCache = new Map<string, BamFile>();

// Cache for fetched features (keyed by url + region)
const featureCache = new Map<string, { features: BAMReadFeature[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Parse CIGAR string into operation/length pairs
 */
function parseCigar(cigar: string): Array<[string, number]> {
	const ops: Array<[string, number]> = [];
	const regex = /(\d+)([MIDNSHP=X])/g;
	let match;
	while ((match = regex.exec(cigar)) !== null) {
		ops.push([match[2], parseInt(match[1], 10)]);
	}
	return ops;
}

/**
 * Get or create a BAM file handle
 */
async function getBamFile(url: string): Promise<BamFile> {
	if (bamCache.has(url)) {
		return bamCache.get(url)!;
	}

	// Auto-discover index URL (.bai)
	const indexUrl = url + '.bai';

	const bamFile = new BamFile({
		bamFilehandle: new RemoteFile(url),
		baiFilehandle: new RemoteFile(indexUrl),
	});

	// Verify the file is valid by reading header - also populates indexToChr
	await bamFile.getHeader();

	bamCache.set(url, bamFile);
	return bamFile;
}

/**
 * Convert BAM record to BAMReadFeature with sequence data
 */
function bamRecordToFeature(record: BamRecord, chromosome: string): BAMReadFeature {
	const cigarString = record.CIGAR || '';
	const parsedCigar = parseCigar(cigarString);
	const flags = record.flags || 0;

	// Get mate information if available (using internal properties)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const rec = record as any;
	let mate: BAMReadFeature['mate'] | undefined;
	if (rec._next_pos !== undefined && rec._next_pos >= 0) {
		mate = {
			chromosome: rec._next_refid !== undefined ? chromosome : chromosome, // Would need refSeqs to resolve
			start: rec._next_pos,
			isReversed: (flags & 0x20) !== 0, // mate reverse strand flag
		};
	}

	return {
		id: `${record.name}:${record.start}-${record.end}:${flags}`,
		chromosome,
		start: record.start,
		end: record.end,
		name: record.name || undefined,
		strand: record.strand === 1 ? '+' : record.strand === -1 ? '-' : undefined,
		// Sequence data
		seq: record.seq || '',
		qual: record.qual || null,
		cigar: cigarString,
		parsedCigar,
		mq: record.mq || 0,
		isReversed: record.isReverseComplemented?.() ?? ((flags & 0x10) !== 0),
		mdTag: record.tags?.MD as string | undefined,
		readName: record.name || '',
		mate,
		templateLength: rec.template_length,
		flags,
	};
}

/**
 * Convert BAM record to simple BedFeature (for backwards compatibility)
 */
function bamRecordToBedFeature(record: BamRecord, chromosome: string): BedFeature {
	return {
		id: `${record.name}:${record.start}-${record.end}`,
		chromosome,
		start: record.start,
		end: record.end,
		name: record.name || undefined,
		strand: record.strand === 1 ? '+' : record.strand === -1 ? '-' : undefined,
		score: record.mq,
	};
}

/**
 * Query features from a remote BAM file
 * Returns BAMReadFeature with full sequence data for high-zoom rendering
 */
export async function queryBam(
	url: string,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal; assemblyId?: string } = {}
): Promise<BAMReadFeature[]> {
	// Check cache
	const cacheKey = `${url}:${chromosome}:${start}-${end}`;
	const cached = featureCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.features;
	}

	try {
		const bam = await getBamFile(url);

		// Get reference names from indexToChr (populated by getHeader)
		const refSeqs = bam.indexToChr || [];
		const refNames = refSeqs.map(r => r.refName);

		// Find matching reference name
		let resolvedChrom = chromosome;
		if (!refNames.includes(chromosome)) {
			// Try common variations
			const variations = [
				chromosome.replace(/^chr/i, ''),
				'chr' + chromosome.replace(/^chr/i, ''),
			];
			for (const variant of variations) {
				if (refNames.includes(variant)) {
					resolvedChrom = variant;
					break;
				}
			}
		}

		// Check if chromosome exists
		if (!refNames.includes(resolvedChrom)) {
			return [];
		}

		// Query records
		const records = await bam.getRecordsForRange(resolvedChrom, start, end, {
			signal: options.signal,
		});

		// Convert to BedFeatures
		const features = records.map(record => bamRecordToFeature(record, chromosome));

		// Cache results
		featureCache.set(cacheKey, { features, timestamp: Date.now() });

		return features;
	} catch (error) {
		console.error(`Error querying BAM ${url}:`, error);
		throw error;
	}
}

/**
 * Query features from a remote CRAM file
 * Note: CRAM support requires additional reference sequence handling
 * For now, we return an empty array and log a warning
 */
export async function queryCram(
	url: string,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal; assemblyId?: string } = {}
): Promise<BedFeature[]> {
	// CRAM requires reference sequences which adds complexity
	// For the initial implementation, we'll just support BAM
	console.warn('CRAM support is not yet fully implemented. Please use BAM files.');
	return [];
}

/**
 * Get chromosome list from a BAM file
 * Extracts reference sequence names from the BAM header
 */
export async function getBamChromosomes(url: string): Promise<string[]> {
	try {
		const bam = await getBamFile(url);
		// indexToChr is populated after getHeader() - contains {refName, length}[]
		const refSeqs = bam.indexToChr || [];
		return refSeqs.map(r => r.refName);
	} catch (error) {
		console.error(`Error getting chromosomes from BAM ${url}:`, error);
		return [];
	}
}

/**
 * Clear all BAM caches
 */
export function clearBamCache(): void {
	bamCache.clear();
	featureCache.clear();
}
