/**
 * FASTA/2bit Reference Sequence Service
 *
 * Supports querying reference sequences from:
 * - Indexed FASTA files (.fa + .fai) via @gmod/indexedfasta
 * - UCSC 2bit files (.2bit) via @gmod/twobit
 *
 * Uses HTTP Range requests for efficient region-based queries.
 */

import { TwoBitFile } from '@gmod/twobit';
import { IndexedFasta } from '@gmod/indexedfasta';
import { RemoteFile, BlobFile } from 'generic-filehandle2';

// Cache for file handles
const twoBitCache = new Map<string, TwoBitFile>();
const fastaCache = new Map<string, IndexedFasta>();

// Cache for fetched sequences (keyed by source + region)
const sequenceCache = new Map<string, { sequence: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Query sequence from a remote 2bit file
 */
export async function query2bit(
	url: string,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<string> {
	// Check cache
	const cacheKey = `2bit:${url}:${chromosome}:${start}-${end}`;
	const cached = sequenceCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.sequence;
	}

	try {
		let twoBit = twoBitCache.get(url);
		if (!twoBit) {
			const filehandle = new RemoteFile(url);
			twoBit = new TwoBitFile({ filehandle });
			twoBitCache.set(url, twoBit);
		}

		// Get sequence names to find the right chromosome
		const seqNames = await twoBit.getSequenceNames();

		// Resolve chromosome name
		let resolvedChrom = chromosome;
		if (!seqNames.includes(chromosome)) {
			// Try common variations
			const variations = [
				chromosome.replace(/^chr/i, ''),
				'chr' + chromosome.replace(/^chr/i, ''),
				'Chr' + chromosome.replace(/^chr/i, ''),
			];
			for (const variant of variations) {
				if (seqNames.includes(variant)) {
					resolvedChrom = variant;
					break;
				}
			}
		}

		if (!seqNames.includes(resolvedChrom)) {
			console.warn(`Chromosome ${chromosome} not found in 2bit file`);
			return '';
		}

		const sequence = await twoBit.getSequence(resolvedChrom, start, end) || '';

		// Cache result
		sequenceCache.set(cacheKey, { sequence, timestamp: Date.now() });

		return sequence;
	} catch (error) {
		console.error(`Error querying 2bit ${url}:`, error);
		throw error;
	}
}

/**
 * Query sequence from a remote indexed FASTA file
 */
export async function queryFasta(
	fastaUrl: string,
	faiUrl: string,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<string> {
	// Check cache
	const cacheKey = `fasta:${fastaUrl}:${chromosome}:${start}-${end}`;
	const cached = sequenceCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.sequence;
	}

	try {
		let fasta = fastaCache.get(fastaUrl);
		if (!fasta) {
			fasta = new IndexedFasta({
				fasta: new RemoteFile(fastaUrl),
				fai: new RemoteFile(faiUrl),
			});
			fastaCache.set(fastaUrl, fasta);
		}

		// Get sequence list for chromosome resolution
		const seqNames = await fasta.getSequenceNames();

		// Resolve chromosome name
		let resolvedChrom = chromosome;
		if (!seqNames.includes(chromosome)) {
			const variations = [
				chromosome.replace(/^chr/i, ''),
				'chr' + chromosome.replace(/^chr/i, ''),
				'Chr' + chromosome.replace(/^chr/i, ''),
			];
			for (const variant of variations) {
				if (seqNames.includes(variant)) {
					resolvedChrom = variant;
					break;
				}
			}
		}

		if (!seqNames.includes(resolvedChrom)) {
			console.warn(`Chromosome ${chromosome} not found in FASTA file`);
			return '';
		}

		const sequence = await fasta.getSequence(resolvedChrom, start, end);

		// Cache result
		sequenceCache.set(cacheKey, { sequence: sequence || '', timestamp: Date.now() });

		return sequence || '';
	} catch (error) {
		console.error(`Error querying FASTA ${fastaUrl}:`, error);
		throw error;
	}
}

/**
 * Query sequence from a local 2bit file
 */
export async function queryLocal2bit(
	file: File,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<string> {
	try {
		const filehandle = new BlobFile(file);
		const twoBit = new TwoBitFile({ filehandle });

		const seqNames = await twoBit.getSequenceNames();

		// Resolve chromosome name
		let resolvedChrom = chromosome;
		if (!seqNames.includes(chromosome)) {
			const variations = [
				chromosome.replace(/^chr/i, ''),
				'chr' + chromosome.replace(/^chr/i, ''),
				'Chr' + chromosome.replace(/^chr/i, ''),
			];
			for (const variant of variations) {
				if (seqNames.includes(variant)) {
					resolvedChrom = variant;
					break;
				}
			}
		}

		if (!seqNames.includes(resolvedChrom)) {
			console.warn(`Chromosome ${chromosome} not found in 2bit file`);
			return '';
		}

		return await twoBit.getSequence(resolvedChrom, start, end) || '';
	} catch (error) {
		console.error('Error querying local 2bit:', error);
		throw error;
	}
}

/**
 * Query sequence from local indexed FASTA files
 */
export async function queryLocalFasta(
	fastaFile: File,
	faiFile: File,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<string> {
	try {
		const fasta = new IndexedFasta({
			fasta: new BlobFile(fastaFile),
			fai: new BlobFile(faiFile),
		});

		const seqNames = await fasta.getSequenceNames();

		// Resolve chromosome name
		let resolvedChrom = chromosome;
		if (!seqNames.includes(chromosome)) {
			const variations = [
				chromosome.replace(/^chr/i, ''),
				'chr' + chromosome.replace(/^chr/i, ''),
				'Chr' + chromosome.replace(/^chr/i, ''),
			];
			for (const variant of variations) {
				if (seqNames.includes(variant)) {
					resolvedChrom = variant;
					break;
				}
			}
		}

		if (!seqNames.includes(resolvedChrom)) {
			console.warn(`Chromosome ${chromosome} not found in FASTA file`);
			return '';
		}

		return (await fasta.getSequence(resolvedChrom, start, end)) || '';
	} catch (error) {
		console.error('Error querying local FASTA:', error);
		throw error;
	}
}

/**
 * Get sequence names from a remote 2bit file
 */
export async function get2bitSequenceNames(url: string): Promise<string[]> {
	try {
		let twoBit = twoBitCache.get(url);
		if (!twoBit) {
			const filehandle = new RemoteFile(url);
			twoBit = new TwoBitFile({ filehandle });
			twoBitCache.set(url, twoBit);
		}
		return await twoBit.getSequenceNames();
	} catch (error) {
		console.error(`Error getting sequence names from 2bit ${url}:`, error);
		return [];
	}
}

/**
 * Get sequence sizes from a remote 2bit file
 */
export async function get2bitSequenceSizes(
	url: string
): Promise<Record<string, number>> {
	try {
		let twoBit = twoBitCache.get(url);
		if (!twoBit) {
			const filehandle = new RemoteFile(url);
			twoBit = new TwoBitFile({ filehandle });
			twoBitCache.set(url, twoBit);
		}
		return await twoBit.getSequenceSizes();
	} catch (error) {
		console.error(`Error getting sequence sizes from 2bit ${url}:`, error);
		return {};
	}
}

/**
 * Detect reference type from URL or filename
 */
export function detectReferenceType(url: string): '2bit' | 'fasta' | null {
	const lowerUrl = url.toLowerCase();
	if (lowerUrl.endsWith('.2bit')) {
		return '2bit';
	}
	if (lowerUrl.endsWith('.fa') || lowerUrl.endsWith('.fasta') ||
	    lowerUrl.endsWith('.fa.gz') || lowerUrl.endsWith('.fasta.gz')) {
		return 'fasta';
	}
	return null;
}

/**
 * Clear all reference sequence caches
 */
export function clearReferenceCache(): void {
	twoBitCache.clear();
	fastaCache.clear();
	sequenceCache.clear();
}

/**
 * UCSC 2bit URLs for common assemblies
 * These are used as fallback/default reference sources
 */
export const UCSC_2BIT_URLS: Record<string, string> = {
	// Human
	'grch38': 'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit',
	'hg38': 'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit',
	'grch37': 'https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.2bit',
	'hg19': 'https://hgdownload.soe.ucsc.edu/goldenPath/hg19/bigZips/hg19.2bit',
	't2t-chm13': 'https://hgdownload.soe.ucsc.edu/goldenPath/hs1/bigZips/hs1.2bit',
	// Mouse
	'mm39': 'https://hgdownload.soe.ucsc.edu/goldenPath/mm39/bigZips/mm39.2bit',
	'mm10': 'https://hgdownload.soe.ucsc.edu/goldenPath/mm10/bigZips/mm10.2bit',
	// Other model organisms
	'danrer11': 'https://hgdownload.soe.ucsc.edu/goldenPath/danRer11/bigZips/danRer11.2bit',
	'dm6': 'https://hgdownload.soe.ucsc.edu/goldenPath/dm6/bigZips/dm6.2bit',
	'ce11': 'https://hgdownload.soe.ucsc.edu/goldenPath/ce11/bigZips/ce11.2bit',
	'saccer3': 'https://hgdownload.soe.ucsc.edu/goldenPath/sacCer3/bigZips/sacCer3.2bit',
	'rn7': 'https://hgdownload.soe.ucsc.edu/goldenPath/rn7/bigZips/rn7.2bit',
	'galgal6': 'https://hgdownload.soe.ucsc.edu/goldenPath/galGal6/bigZips/galGal6.2bit',
	// Plants (UCSC hub)
	'tair10': 'http://genome-test.cse.ucsc.edu/~hiram/hubs/Plants/araTha1/araTha1.2bit',
};

/**
 * Get the 2bit URL for an assembly if available
 */
export function get2bitUrl(assemblyId: string): string | null {
	const key = Object.keys(UCSC_2BIT_URLS).find(
		k => k.toLowerCase() === assemblyId.toLowerCase()
	);
	return key ? UCSC_2BIT_URLS[key] : null;
}

/**
 * Check if an assembly has a known 2bit URL
 */
export function has2bitUrl(assemblyId: string): boolean {
	return get2bitUrl(assemblyId) !== null;
}
