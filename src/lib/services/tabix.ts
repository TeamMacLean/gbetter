/**
 * Tabix Remote Track Service
 *
 * Supports remote indexed files:
 * - .vcf.gz + .tbi (variants)
 * - .gff.gz + .tbi (gene models)
 * - .bed.gz + .tbi (intervals)
 */

import { TabixIndexedFile } from '@gmod/tabix';
import { RemoteFile } from 'generic-filehandle2';
import VCF from '@gmod/vcf';
import gff from '@gmod/gff';
import type { BedFeature, GffFeature } from '$lib/types/genome';
import type { VariantFeature } from '$lib/types/tracks';

// Cache for TabixIndexedFile handles
const tabixCache = new Map<string, TabixIndexedFile>();

// Cache for fetched features (keyed by url + region)
const featureCache = new Map<string, { features: unknown[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get or create a TabixIndexedFile handle
 */
async function getTabixFile(url: string): Promise<TabixIndexedFile> {
	if (tabixCache.has(url)) {
		return tabixCache.get(url)!;
	}

	const filehandle = new RemoteFile(url);
	const tbiPath = url + '.tbi';
	const tbiFilehandle = new RemoteFile(tbiPath);

	const tabix = new TabixIndexedFile({
		filehandle,
		tbiFilehandle,
	});

	tabixCache.set(url, tabix);
	return tabix;
}

/**
 * Get lines from a tabix file using the callback API
 */
async function getTabixLines(
	tabix: TabixIndexedFile,
	chrom: string,
	start: number,
	end: number,
	signal?: AbortSignal
): Promise<string[]> {
	const lines: string[] = [];
	await tabix.getLines(chrom, start, end, {
		signal,
		lineCallback: (line: string) => {
			lines.push(line);
		},
	});
	return lines;
}

/**
 * Query VCF variants from a remote tabix-indexed file
 */
export async function queryTabixVcf(
	url: string,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<VariantFeature[]> {
	const cacheKey = `vcf:${url}:${chromosome}:${start}-${end}`;
	const cached = featureCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.features as VariantFeature[];
	}

	try {
		const tabix = await getTabixFile(url);

		// Try chromosome variations
		const chromVariations = [
			chromosome,
			chromosome.replace(/^chr/i, ''),
			'chr' + chromosome.replace(/^chr/i, ''),
		];

		let lines: string[] = [];

		// Get header for VCF parser
		const header = await tabix.getHeader();
		const headerLines = header.split('\n').filter((l: string) => l.startsWith('#'));

		for (const chrom of chromVariations) {
			try {
				lines = await getTabixLines(tabix, chrom, start, end, options.signal);
				if (lines.length > 0) break;
			} catch {
				// Try next variation
			}
		}

		if (lines.length === 0) {
			featureCache.set(cacheKey, { features: [], timestamp: Date.now() });
			return [];
		}

		// Parse VCF lines
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
					start: variant.POS - 1, // VCF is 1-based, convert to 0-based
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

		featureCache.set(cacheKey, { features, timestamp: Date.now() });
		return features;
	} catch (error) {
		console.error(`Error querying tabix VCF ${url}:`, error);
		throw error;
	}
}

/**
 * Query GFF features from a remote tabix-indexed file
 */
export async function queryTabixGff(
	url: string,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<GffFeature[]> {
	const cacheKey = `gff:${url}:${chromosome}:${start}-${end}`;
	const cached = featureCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.features as GffFeature[];
	}

	try {
		const tabix = await getTabixFile(url);

		// Try chromosome variations
		const chromVariations = [
			chromosome,
			chromosome.replace(/^chr/i, ''),
			'chr' + chromosome.replace(/^chr/i, ''),
		];

		let lines: string[] = [];

		for (const chrom of chromVariations) {
			try {
				lines = await getTabixLines(tabix, chrom, start, end, options.signal);
				if (lines.length > 0) break;
			} catch {
				// Try next variation
			}
		}

		if (lines.length === 0) {
			featureCache.set(cacheKey, { features: [], timestamp: Date.now() });
			return [];
		}

		// Parse GFF lines using @gmod/gff
		const features: GffFeature[] = [];
		const gffContent = lines.filter((l) => !l.startsWith('#')).join('\n');

		// Parse GFF3 format
		// parseStringSync returns an array of GFF3Feature (which is GFF3FeatureLineWithRefs[])
		// or GFF3Sequence items
		const parsed = gff.parseStringSync(gffContent, { parseFeatures: true });

		for (const item of parsed) {
			// Skip sequence items (they have 'id' and 'sequence' properties)
			if ('sequence' in item) continue;

			// GFF3Feature is an array of GFF3FeatureLineWithRefs
			// Each element represents a line of the feature (multi-line features share ID)
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
					start: f.start - 1, // GFF is 1-based, convert to 0-based
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

		featureCache.set(cacheKey, { features, timestamp: Date.now() });
		return features;
	} catch (error) {
		console.error(`Error querying tabix GFF ${url}:`, error);
		throw error;
	}
}

/**
 * Query BED features from a remote tabix-indexed file
 */
export async function queryTabixBed(
	url: string,
	chromosome: string,
	start: number,
	end: number,
	options: { signal?: AbortSignal } = {}
): Promise<BedFeature[]> {
	const cacheKey = `bed:${url}:${chromosome}:${start}-${end}`;
	const cached = featureCache.get(cacheKey);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.features as BedFeature[];
	}

	try {
		const tabix = await getTabixFile(url);

		// Try chromosome variations
		const chromVariations = [
			chromosome,
			chromosome.replace(/^chr/i, ''),
			'chr' + chromosome.replace(/^chr/i, ''),
		];

		let lines: string[] = [];

		for (const chrom of chromVariations) {
			try {
				lines = await getTabixLines(tabix, chrom, start, end, options.signal);
				if (lines.length > 0) break;
			} catch {
				// Try next variation
			}
		}

		if (lines.length === 0) {
			featureCache.set(cacheKey, { features: [], timestamp: Date.now() });
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
				start: parseInt(fields[1], 10), // BED is 0-based
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

		featureCache.set(cacheKey, { features, timestamp: Date.now() });
		return features;
	} catch (error) {
		console.error(`Error querying tabix BED ${url}:`, error);
		throw error;
	}
}

/**
 * Clear all tabix caches
 */
export function clearTabixCache(): void {
	tabixCache.clear();
	featureCache.clear();
}
