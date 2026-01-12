/**
 * BED file parser
 * Supports BED3 through BED12 formats
 * https://genome.ucsc.edu/FAQ/FAQformat.html#format1
 */

import type { BedFeature } from '$lib/types/genome';

export interface ParseResult {
	features: BedFeature[];
	errors: string[];
}

export function parseBed(content: string): ParseResult {
	const features: BedFeature[] = [];
	const errors: string[] = [];
	const lines = content.split(/\r?\n/);

	let featureId = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// Skip empty lines and comments
		if (!line || line.startsWith('#') || line.startsWith('track') || line.startsWith('browser')) {
			continue;
		}

		const fields = line.split('\t');

		// Minimum BED3: chr, start, end
		if (fields.length < 3) {
			errors.push(`Line ${i + 1}: Expected at least 3 fields, got ${fields.length}`);
			continue;
		}

		const chr = fields[0];
		const start = parseInt(fields[1], 10);
		const end = parseInt(fields[2], 10);

		// Validate coordinates
		if (isNaN(start) || isNaN(end)) {
			errors.push(`Line ${i + 1}: Invalid coordinates`);
			continue;
		}

		if (start < 0 || end < 0 || start >= end) {
			errors.push(`Line ${i + 1}: Invalid coordinate range (${start}-${end})`);
			continue;
		}

		const feature: BedFeature = {
			id: `bed_${featureId++}`,
			chromosome: chr,
			start,
			end,
		};

		// BED4: name
		if (fields.length >= 4 && fields[3] !== '.') {
			feature.name = fields[3];
		}

		// BED5: score
		if (fields.length >= 5 && fields[4] !== '.') {
			const score = parseInt(fields[4], 10);
			if (!isNaN(score)) {
				feature.score = Math.max(0, Math.min(1000, score));
			}
		}

		// BED6: strand
		if (fields.length >= 6) {
			const strand = fields[5];
			if (strand === '+' || strand === '-') {
				feature.strand = strand;
			} else {
				feature.strand = '.';
			}
		}

		// BED8: thickStart, thickEnd
		if (fields.length >= 8) {
			const thickStart = parseInt(fields[6], 10);
			const thickEnd = parseInt(fields[7], 10);
			if (!isNaN(thickStart) && !isNaN(thickEnd)) {
				feature.thickStart = thickStart;
				feature.thickEnd = thickEnd;
			}
		}

		// BED9: itemRgb
		if (fields.length >= 9 && fields[8] !== '.' && fields[8] !== '0') {
			feature.itemRgb = fields[8];
		}

		// BED12: blockCount, blockSizes, blockStarts
		if (fields.length >= 12) {
			const blockCount = parseInt(fields[9], 10);
			if (!isNaN(blockCount) && blockCount > 0) {
				feature.blockCount = blockCount;

				const blockSizes = fields[10].split(',').filter(s => s).map(s => parseInt(s, 10));
				const blockStarts = fields[11].split(',').filter(s => s).map(s => parseInt(s, 10));

				if (blockSizes.length === blockCount && blockStarts.length === blockCount) {
					feature.blockSizes = blockSizes;
					feature.blockStarts = blockStarts;
				}
			}
		}

		features.push(feature);
	}

	return { features, errors };
}

/**
 * Parse BED from a File object
 */
export async function parseBedFile(file: File): Promise<ParseResult> {
	const content = await file.text();
	return parseBed(content);
}
