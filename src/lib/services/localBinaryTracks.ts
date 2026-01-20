/**
 * Local Binary Track Service
 *
 * Enables loading binary genomics formats from local files:
 * - BigBed (.bb, .bigbed) - indexed BED intervals
 * - BigWig (.bw, .bigwig) - indexed signal data
 * - BAM (.bam) - indexed alignments (requires .bai index)
 * - Tabix (.vcf.gz, .gff.gz, .bed.gz) - indexed text formats (requires .tbi index)
 *
 * Uses BlobFile from generic-filehandle2 instead of RemoteFile for local access.
 */

import { BigBed, BigWig } from '@gmod/bbi';
import { BamFile, BamRecord } from '@gmod/bam';
import { TabixIndexedFile } from '@gmod/tabix';
import { BlobFile } from 'generic-filehandle2';
import VCF from '@gmod/vcf';
import gff from '@gmod/gff';
import type { BedFeature, GffFeature } from '$lib/types/genome';
import type { SignalFeature, VariantFeature, BAMReadFeature } from '$lib/types/tracks';

// Feature type from @gmod/bbi
interface BigBedFeature {
	chromId?: number;
	start: number;
	end: number;
	rest?: string;
	uniqueId?: string;
}

interface BigWigFeature {
	start: number;
	end: number;
	score: number;
}

/**
 * Parse BED12 "rest" field into structured feature data
 */
function parseBed12Rest(
	chromId: number,
	start: number,
	end: number,
	rest: string,
	refsByNumber: Record<number, { name: string; length: number }>,
	displayChromosome?: string
): BedFeature {
	const parts = rest.split('\t');
	const chromosome = displayChromosome || refsByNumber[chromId]?.name || `chr${chromId}`;

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
 * Resolve chromosome name using common variations
 */
function resolveChromosomeName(
	chromosome: string,
	refsByName: Record<string, unknown>
): string | null {
	if (refsByName[chromosome] !== undefined) {
		return chromosome;
	}

	// Try common variations
	const variations = [
		chromosome.replace(/^chr/i, ''),           // Remove chr prefix
		'chr' + chromosome.replace(/^chr/i, ''),   // Add chr prefix (lowercase)
		'Chr' + chromosome.replace(/^chr/i, ''),   // Add Chr prefix (capitalized)
	];

	for (const variant of variations) {
		if (refsByName[variant] !== undefined) {
			return variant;
		}
	}

	return null;
}

// ============================================================
// BIGBED - Local File Support
// ============================================================

/**
 * Query features from a local BigBed file
 */
export async function queryLocalBigBed(
	file: File,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<BedFeature[]> {
	try {
		const filehandle = new BlobFile(file);
		const bigbed = new BigBed({ filehandle });
		const header = await bigbed.getHeader(options);

		// Resolve chromosome name
		const resolvedChrom = resolveChromosomeName(chromosome, header.refsByName);
		if (!resolvedChrom) {
			return [];
		}

		const rawFeatures = await bigbed.getFeatures(resolvedChrom, start, end, options);

		// Use original chromosome name for display if we resolved to a different name
		const displayChrom = resolvedChrom !== chromosome ? chromosome : undefined;

		const features = rawFeatures.map((f: BigBedFeature) =>
			parseBed12Rest(
				f.chromId ?? 0,
				f.start,
				f.end,
				f.rest || '',
				header.refsByNumber,
				displayChrom
			)
		);

		return features;
	} catch (error) {
		console.error('Error querying local BigBed:', error);
		throw error;
	}
}

/**
 * Get chromosome list from a local BigBed file
 */
export async function getLocalBigBedChromosomes(
	file: File,
	options: { signal?: AbortSignal } = {}
): Promise<Array<{ name: string; length: number }>> {
	const filehandle = new BlobFile(file);
	const bigbed = new BigBed({ filehandle });
	const header = await bigbed.getHeader(options);

	return Object.entries(header.refsByNumber).map(([_, info]) => ({
		name: info.name,
		length: info.length,
	}));
}

// ============================================================
// BIGWIG - Local File Support
// ============================================================

/**
 * Query signal data from a local BigWig file
 */
export async function queryLocalBigWig(
	file: File,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<SignalFeature[]> {
	try {
		const filehandle = new BlobFile(file);
		const bigwig = new BigWig({ filehandle });
		const header = await bigwig.getHeader(options);

		// Resolve chromosome name
		const resolvedChrom = resolveChromosomeName(chromosome, header.refsByName);
		if (!resolvedChrom) {
			return [];
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

		return features;
	} catch (error) {
		console.error('Error querying local BigWig:', error);
		throw error;
	}
}

/**
 * Get chromosome list from a local BigWig file
 */
export async function getLocalBigWigChromosomes(
	file: File,
	options: { signal?: AbortSignal } = {}
): Promise<Array<{ name: string; length: number }>> {
	const filehandle = new BlobFile(file);
	const bigwig = new BigWig({ filehandle });
	const header = await bigwig.getHeader(options);

	return Object.entries(header.refsByNumber).map(([_, info]) => ({
		name: (info as { name: string; length: number }).name,
		length: (info as { name: string; length: number }).length,
	}));
}

// ============================================================
// BAM - Local File Support (requires index file)
// ============================================================

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
			chromosome: rec._next_refid !== undefined ? chromosome : chromosome,
			start: rec._next_pos,
			isReversed: (flags & 0x20) !== 0,
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
 * Query features from a local BAM file
 * Returns BAMReadFeature with full sequence data for high-zoom rendering
 * @param bamFile - The BAM data file
 * @param indexFile - The BAI index file
 */
export async function queryLocalBam(
	bamFile: File,
	indexFile: File,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<BAMReadFeature[]> {
	try {
		const bam = new BamFile({
			bamFilehandle: new BlobFile(bamFile),
			baiFilehandle: new BlobFile(indexFile),
		});

		// Get header to populate indexToChr
		await bam.getHeader();

		// Get reference names
		const refSeqs = bam.indexToChr || [];
		const refNames = refSeqs.map(r => r.refName);

		// Resolve chromosome name
		let resolvedChrom = chromosome;
		if (!refNames.includes(chromosome)) {
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

		if (!refNames.includes(resolvedChrom)) {
			return [];
		}

		// Query records
		const records = await bam.getRecordsForRange(resolvedChrom, start, end, {
			signal: options.signal,
		});

		// Convert to BedFeatures
		return records.map(record => bamRecordToFeature(record, chromosome));
	} catch (error) {
		console.error('Error querying local BAM:', error);
		throw error;
	}
}

/**
 * Get chromosome list from a local BAM file
 */
export async function getLocalBamChromosomes(
	bamFile: File,
	indexFile: File
): Promise<string[]> {
	try {
		const bam = new BamFile({
			bamFilehandle: new BlobFile(bamFile),
			baiFilehandle: new BlobFile(indexFile),
		});
		await bam.getHeader();
		const refSeqs = bam.indexToChr || [];
		return refSeqs.map(r => r.refName);
	} catch (error) {
		console.error('Error getting chromosomes from local BAM:', error);
		return [];
	}
}

// ============================================================
// TABIX - Local File Support (requires index file)
// ============================================================

/**
 * Get lines from a local tabix file
 */
async function getLocalTabixLines(
	dataFile: File,
	indexFile: File,
	chrom: string,
	start: number,
	end: number,
	signal?: AbortSignal
): Promise<{ lines: string[]; header: string }> {
	const tabix = new TabixIndexedFile({
		filehandle: new BlobFile(dataFile),
		tbiFilehandle: new BlobFile(indexFile),
	});

	const header = await tabix.getHeader();
	const lines: string[] = [];

	await tabix.getLines(chrom, start, end, {
		signal,
		lineCallback: (line: string) => {
			lines.push(line);
		},
	});

	return { lines, header };
}

/**
 * Query VCF variants from a local tabix-indexed file
 */
export async function queryLocalTabixVcf(
	dataFile: File,
	indexFile: File,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<VariantFeature[]> {
	try {
		// Try chromosome variations
		const chromVariations = [
			chromosome,
			chromosome.replace(/^chr/i, ''),
			'chr' + chromosome.replace(/^chr/i, ''),
		];

		let lines: string[] = [];
		let header = '';

		for (const chrom of chromVariations) {
			try {
				const result = await getLocalTabixLines(dataFile, indexFile, chrom, start, end, options.signal);
				if (result.lines.length > 0) {
					lines = result.lines;
					header = result.header;
					break;
				}
			} catch {
				// Try next variation
			}
		}

		if (lines.length === 0) {
			return [];
		}

		// Parse VCF lines
		const headerLines = header.split('\n').filter((l: string) => l.startsWith('#'));
		const vcfParser = new VCF({ header: headerLines.join('\n') });
		const features: VariantFeature[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.startsWith('#')) continue;

			try {
				const variant = vcfParser.parseLine(line);
				if (!variant || !variant.REF || !variant.ALT) continue;

				features.push({
					id: `vcf_${i}_${variant.POS}`,
					chromosome,
					start: variant.POS - 1, // VCF is 1-based
					end: variant.POS - 1 + variant.REF.length,
					name: variant.ID?.[0] || `${variant.REF}>${variant.ALT.join(',')}`,
					ref: variant.REF,
					alt: variant.ALT,
					qual: variant.QUAL,
					filter: Array.isArray(variant.FILTER) ? variant.FILTER.join(';') : variant.FILTER,
					info: variant.INFO as Record<string, string>,
				});
			} catch {
				// Skip malformed lines
			}
		}

		return features;
	} catch (error) {
		console.error('Error querying local tabix VCF:', error);
		throw error;
	}
}

/**
 * Query GFF features from a local tabix-indexed file
 */
export async function queryLocalTabixGff(
	dataFile: File,
	indexFile: File,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<GffFeature[]> {
	try {
		// Try chromosome variations
		const chromVariations = [
			chromosome,
			chromosome.replace(/^chr/i, ''),
			'chr' + chromosome.replace(/^chr/i, ''),
		];

		let lines: string[] = [];

		for (const chrom of chromVariations) {
			try {
				const result = await getLocalTabixLines(dataFile, indexFile, chrom, start, end, options.signal);
				if (result.lines.length > 0) {
					lines = result.lines;
					break;
				}
			} catch {
				// Try next variation
			}
		}

		if (lines.length === 0) {
			return [];
		}

		// Parse GFF lines
		const features: GffFeature[] = [];
		const gffContent = lines.filter((l) => !l.startsWith('#')).join('\n');

		const parsed = gff.parseStringSync(gffContent, { parseFeatures: true });

		for (const item of parsed) {
			if ('sequence' in item) continue;

			const featureArray = item as Array<{
				seq_id: string | null;
				source: string | null;
				type: string | null;
				start: number | null;
				end: number | null;
				score: number | null;
				strand: string | null;
				phase: string | null;
				attributes: Record<string, string[]> | null;
			}>;

			for (const f of featureArray) {
				if (!f.seq_id || !f.type || f.start === null || f.end === null) continue;

				features.push({
					id: f.attributes?.ID?.[0] || `gff_${features.length}_${f.start}`,
					chromosome,
					start: f.start - 1, // GFF is 1-based
					end: f.end,
					name: f.attributes?.Name?.[0] || f.attributes?.ID?.[0],
					source: f.source || '.',
					type: f.type,
					strand: (f.strand as '+' | '-' | '.') || '.',
					score: f.score ?? undefined,
					phase: f.phase ? (parseInt(f.phase) as 0 | 1 | 2) : undefined,
					parent: f.attributes?.Parent?.[0],
					attributes: f.attributes
						? Object.fromEntries(
								Object.entries(f.attributes).map(([k, v]) => [k, v.join(',')])
							)
						: undefined,
				});
			}
		}

		return features;
	} catch (error) {
		console.error('Error querying local tabix GFF:', error);
		throw error;
	}
}

/**
 * Query BED features from a local tabix-indexed file
 */
export async function queryLocalTabixBed(
	dataFile: File,
	indexFile: File,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<BedFeature[]> {
	try {
		// Try chromosome variations
		const chromVariations = [
			chromosome,
			chromosome.replace(/^chr/i, ''),
			'chr' + chromosome.replace(/^chr/i, ''),
		];

		let lines: string[] = [];

		for (const chrom of chromVariations) {
			try {
				const result = await getLocalTabixLines(dataFile, indexFile, chrom, start, end, options.signal);
				if (result.lines.length > 0) {
					lines = result.lines;
					break;
				}
			} catch {
				// Try next variation
			}
		}

		if (lines.length === 0) {
			return [];
		}

		// Parse BED lines
		const features: BedFeature[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.startsWith('#') || line.startsWith('track') || line.startsWith('browser'))
				continue;

			const fields = line.split('\t');
			if (fields.length < 3) continue;

			const feature: BedFeature = {
				id: `bed_${i}_${fields[1]}`,
				chromosome,
				start: parseInt(fields[1], 10),
				end: parseInt(fields[2], 10),
				name: fields[3] || undefined,
				score: fields[4] ? parseFloat(fields[4]) : undefined,
				strand: (fields[5] as '+' | '-' | '.') || undefined,
				thickStart: fields[6] ? parseInt(fields[6], 10) : undefined,
				thickEnd: fields[7] ? parseInt(fields[7], 10) : undefined,
				itemRgb: fields[8] || undefined,
				blockCount: fields[9] ? parseInt(fields[9], 10) : undefined,
				blockSizes: fields[10] ? fields[10].split(',').filter(Boolean).map(Number) : undefined,
				blockStarts: fields[11] ? fields[11].split(',').filter(Boolean).map(Number) : undefined,
			};

			features.push(feature);
		}

		return features;
	} catch (error) {
		console.error('Error querying local tabix BED:', error);
		throw error;
	}
}

/**
 * Get chromosome list from a local tabix-indexed file
 */
export async function getLocalTabixChromosomes(
	dataFile: File,
	indexFile: File
): Promise<string[]> {
	try {
		const tabix = new TabixIndexedFile({
			filehandle: new BlobFile(dataFile),
			tbiFilehandle: new BlobFile(indexFile),
		});

		const refNames = await tabix.getReferenceSequenceNames();
		if (refNames && refNames.length > 0) {
			return refNames;
		}

		// Fallback: extract from header
		const header = await tabix.getHeader();
		const chromosomes: string[] = [];
		const contigMatches = header.matchAll(/##contig=<ID=([^,>]+)/g);
		for (const match of contigMatches) {
			chromosomes.push(match[1]);
		}

		return chromosomes;
	} catch (error) {
		console.error('Error getting chromosomes from local tabix:', error);
		return [];
	}
}

// ============================================================
// FILE TYPE DETECTION
// ============================================================

export type LocalBinaryTrackType = 'bigbed' | 'bigwig' | 'bam' | 'vcf' | 'gff' | 'bed';

/**
 * Detect track type from file name/extension
 */
export function detectLocalBinaryType(fileName: string): LocalBinaryTrackType | null {
	const lowerName = fileName.toLowerCase();

	if (lowerName.endsWith('.bb') || lowerName.endsWith('.bigbed')) {
		return 'bigbed';
	}
	if (lowerName.endsWith('.bw') || lowerName.endsWith('.bigwig')) {
		return 'bigwig';
	}
	if (lowerName.endsWith('.bam')) {
		return 'bam';
	}
	if (lowerName.endsWith('.vcf.gz')) {
		return 'vcf';
	}
	if (lowerName.endsWith('.gff.gz') || lowerName.endsWith('.gff3.gz')) {
		return 'gff';
	}
	if (lowerName.endsWith('.bed.gz')) {
		return 'bed';
	}

	return null;
}

/**
 * Check if a file type requires an index file
 */
export function requiresIndexFile(type: LocalBinaryTrackType): boolean {
	return type === 'bam' || type === 'vcf' || type === 'gff' || type === 'bed';
}

/**
 * Get the expected index file extension for a file type
 */
export function getIndexExtension(type: LocalBinaryTrackType): string | null {
	switch (type) {
		case 'bam':
			return '.bai';
		case 'vcf':
		case 'gff':
		case 'bed':
			return '.tbi';
		default:
			return null;
	}
}

/**
 * Try to match an index file for a data file from a list of files
 */
export function matchIndexFile(dataFile: File, files: File[]): File | null {
	const dataName = dataFile.name;
	const type = detectLocalBinaryType(dataName);
	if (!type || !requiresIndexFile(type)) {
		return null;
	}

	const indexExt = getIndexExtension(type);
	if (!indexExt) {
		return null;
	}

	// Look for matching index file
	// For BAM: file.bam -> file.bam.bai or file.bai
	// For tabix: file.vcf.gz -> file.vcf.gz.tbi
	const expectedIndexName = dataName + indexExt;
	const alternateIndexName = dataName.replace(/\.[^.]+$/, indexExt); // file.bam -> file.bai

	for (const file of files) {
		if (file.name === expectedIndexName || file.name === alternateIndexName) {
			return file;
		}
	}

	return null;
}
