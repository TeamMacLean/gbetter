/**
 * GFF3 file parser
 * https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md
 *
 * Note: GFF3 uses 1-based, fully-closed coordinates
 * We convert to 0-based, half-open internally
 */

import type { GffFeature } from '$lib/types/genome';

export interface GffParseResult {
	features: GffFeature[];
	errors: string[];
}

function parseAttributes(attrString: string): Record<string, string> {
	const attrs: Record<string, string> = {};

	if (!attrString || attrString === '.') {
		return attrs;
	}

	const pairs = attrString.split(';');
	for (const pair of pairs) {
		const [key, value] = pair.split('=');
		if (key && value) {
			// URL decode the value
			attrs[key.trim()] = decodeURIComponent(value.trim());
		}
	}

	return attrs;
}

export function parseGff(content: string): GffParseResult {
	const features: GffFeature[] = [];
	const errors: string[] = [];
	const lines = content.split(/\r?\n/);
	const featureById = new Map<string, GffFeature>();

	let featureId = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// Skip empty lines and comments
		if (!line || line.startsWith('#')) {
			continue;
		}

		// Handle FASTA section (end of features)
		if (line.startsWith('>')) {
			break;
		}

		const fields = line.split('\t');

		if (fields.length !== 9) {
			errors.push(`Line ${i + 1}: Expected 9 fields, got ${fields.length}`);
			continue;
		}

		const [seqid, source, type, startStr, endStr, scoreStr, strandStr, phaseStr, attributesStr] = fields;

		// Parse coordinates (convert from 1-based to 0-based)
		const start = parseInt(startStr, 10) - 1; // Convert to 0-based
		const end = parseInt(endStr, 10); // End stays same (1-based closed → 0-based half-open)

		if (isNaN(start) || isNaN(end)) {
			errors.push(`Line ${i + 1}: Invalid coordinates`);
			continue;
		}

		if (start < 0 || end <= start) {
			errors.push(`Line ${i + 1}: Invalid coordinate range`);
			continue;
		}

		// Parse strand
		let strand: '+' | '-' | '.' = '.';
		if (strandStr === '+' || strandStr === '-') {
			strand = strandStr;
		}

		// Parse score
		let score: number | undefined;
		if (scoreStr !== '.') {
			const parsed = parseFloat(scoreStr);
			if (!isNaN(parsed)) {
				score = parsed;
			}
		}

		// Parse phase
		let phase: 0 | 1 | 2 | '.' = '.';
		if (phaseStr === '0' || phaseStr === '1' || phaseStr === '2') {
			phase = parseInt(phaseStr, 10) as 0 | 1 | 2;
		}

		// Parse attributes
		const attributes = parseAttributes(attributesStr);

		const feature: GffFeature = {
			id: attributes['ID'] || `gff_${featureId++}`,
			chromosome: seqid,
			start,
			end,
			source,
			type,
			strand,
			score,
			phase,
			name: attributes['Name'] || attributes['gene_name'] || attributes['ID'],
			attributes,
			parent: attributes['Parent'],
			children: [],
		};

		// Index by ID for parent-child linking
		if (attributes['ID']) {
			featureById.set(attributes['ID'], feature);
		}

		features.push(feature);
	}

	// Build parent-child relationships
	for (const feature of features) {
		if (feature.parent) {
			// Parent can be comma-separated list
			const parentIds = feature.parent.split(',');
			for (const parentId of parentIds) {
				const parent = featureById.get(parentId.trim());
				if (parent && parent.children) {
					parent.children.push(feature);
				}
			}
		}
	}

	return { features, errors };
}

/**
 * Parse GFF3 from a File object
 */
export async function parseGffFile(file: File): Promise<GffParseResult> {
	const content = await file.text();
	return parseGff(content);
}

/**
 * Get top-level features (those without parents)
 */
export function getTopLevelFeatures(features: GffFeature[]): GffFeature[] {
	return features.filter(f => !f.parent);
}

/**
 * Get features of a specific type
 */
export function getFeaturesByType(features: GffFeature[], type: string): GffFeature[] {
	return features.filter(f => f.type === type);
}
