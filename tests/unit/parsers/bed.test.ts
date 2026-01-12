/**
 * BED Parser Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { intervalsTrackType } from '$lib/services/trackTypes/intervals';

const parse = intervalsTrackType.parse;

describe('BED Parser', () => {
	describe('BED3 format (minimal)', () => {
		it('parses simple BED3 line', () => {
			const result = parse('chr1\t100\t200');
			expect(result.errors).toHaveLength(0);
			expect(result.features).toHaveLength(1);
			expect(result.features[0]).toMatchObject({
				chromosome: 'chr1',
				start: 100,
				end: 200,
			});
		});

		it('parses multiple features', () => {
			const result = parse('chr1\t100\t200\nchr1\t300\t400\nchr2\t500\t600');
			expect(result.errors).toHaveLength(0);
			expect(result.features).toHaveLength(3);
		});

		it('assigns unique IDs to features', () => {
			const result = parse('chr1\t100\t200\nchr1\t300\t400');
			const ids = result.features.map(f => f.id);
			expect(new Set(ids).size).toBe(ids.length);
		});
	});

	describe('BED6 format (with name, score, strand)', () => {
		it('parses name field', () => {
			const result = parse('chr1\t100\t200\tgene1');
			expect(result.features[0].name).toBe('gene1');
		});

		it('treats dot as undefined name', () => {
			const result = parse('chr1\t100\t200\t.');
			expect(result.features[0].name).toBeUndefined();
		});

		it('parses score field', () => {
			const result = parse('chr1\t100\t200\tgene1\t500');
			expect(result.features[0].score).toBe(500);
		});

		it('treats dot as undefined score', () => {
			const result = parse('chr1\t100\t200\tgene1\t.');
			expect(result.features[0].score).toBeUndefined();
		});

		it('parses + strand', () => {
			const result = parse('chr1\t100\t200\tgene1\t0\t+');
			expect(result.features[0].strand).toBe('+');
		});

		it('parses - strand', () => {
			const result = parse('chr1\t100\t200\tgene1\t0\t-');
			expect(result.features[0].strand).toBe('-');
		});

		it('treats other strand values as unknown (.)', () => {
			const result = parse('chr1\t100\t200\tgene1\t0\t.');
			expect(result.features[0].strand).toBe('.');
		});
	});

	describe('BED12 format (with blocks)', () => {
		it('parses block information', () => {
			// A feature with 3 blocks (exons)
			const bed12 = 'chr1\t1000\t2000\tgene1\t0\t+\t1100\t1900\t0\t3\t100,200,150\t0,500,850';
			const result = parse(bed12);
			expect(result.features[0].blockCount).toBe(3);
			expect(result.features[0].blockSizes).toEqual([100, 200, 150]);
			expect(result.features[0].blockStarts).toEqual([0, 500, 850]);
		});

		it('handles trailing commas in block fields', () => {
			const bed12 = 'chr1\t1000\t2000\tgene1\t0\t+\t1100\t1900\t0\t2\t100,200,\t0,500,';
			const result = parse(bed12);
			expect(result.features[0].blockSizes).toEqual([100, 200]);
			expect(result.features[0].blockStarts).toEqual([0, 500]);
		});
	});

	describe('header and comment handling', () => {
		it('skips comment lines starting with #', () => {
			const result = parse('# This is a comment\nchr1\t100\t200');
			expect(result.features).toHaveLength(1);
		});

		it('skips track lines', () => {
			const result = parse('track name="My Track"\nchr1\t100\t200');
			expect(result.features).toHaveLength(1);
		});

		it('skips browser lines', () => {
			const result = parse('browser position chr1:1-1000\nchr1\t100\t200');
			expect(result.features).toHaveLength(1);
		});

		it('skips empty lines', () => {
			const result = parse('\n\nchr1\t100\t200\n\n');
			expect(result.features).toHaveLength(1);
		});
	});

	describe('error handling', () => {
		it('reports error for lines with fewer than 3 fields', () => {
			const result = parse('chr1\t100');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toContain('Expected at least 3 fields');
		});

		it('reports error for invalid start coordinate', () => {
			const result = parse('chr1\tabc\t200');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toContain('Invalid coordinates');
		});

		it('reports error for invalid end coordinate', () => {
			const result = parse('chr1\t100\txyz');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
		});

		it('reports error for negative start', () => {
			const result = parse('chr1\t-10\t200');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
		});

		it('reports error for end <= start', () => {
			const result = parse('chr1\t200\t100');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
		});

		it('reports error for end == start', () => {
			const result = parse('chr1\t100\t100');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
		});

		it('continues parsing after errors', () => {
			const result = parse('chr1\tinvalid\nchr1\t100\t200');
			expect(result.features).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
		});

		it('includes line number in error messages', () => {
			const result = parse('chr1\t100\t200\nchr1\tinvalid');
			expect(result.errors[0]).toContain('Line 2');
		});
	});

	describe('chromosome names', () => {
		it('handles standard chr prefixed names', () => {
			const result = parse('chr1\t100\t200');
			expect(result.features[0].chromosome).toBe('chr1');
		});

		it('handles chrX, chrY, chrM', () => {
			const result = parse('chrX\t100\t200\nchrY\t100\t200\nchrM\t100\t200');
			expect(result.features.map(f => f.chromosome)).toEqual(['chrX', 'chrY', 'chrM']);
		});

		it('handles non-chr prefixed names (e.g., scaffolds)', () => {
			const result = parse('scaffold_1\t100\t200');
			expect(result.features[0].chromosome).toBe('scaffold_1');
		});

		it('handles numeric chromosome names', () => {
			const result = parse('1\t100\t200');
			expect(result.features[0].chromosome).toBe('1');
		});
	});

	describe('line ending handling', () => {
		it('handles Unix line endings (LF)', () => {
			const result = parse('chr1\t100\t200\nchr1\t300\t400');
			expect(result.features).toHaveLength(2);
		});

		it('handles Windows line endings (CRLF)', () => {
			const result = parse('chr1\t100\t200\r\nchr1\t300\t400');
			expect(result.features).toHaveLength(2);
		});
	});

	describe('real-world data', () => {
		it('parses sample BED file correctly', async () => {
			// Use actual test fixture
			const fs = await import('fs');
			const content = fs.readFileSync('tests/fixtures/sample-genes.bed', 'utf-8');
			const result = parse(content);

			expect(result.errors).toHaveLength(0);
			expect(result.features.length).toBeGreaterThan(0);

			// All features should have valid coordinates
			for (const feature of result.features) {
				expect(feature.start).toBeGreaterThanOrEqual(0);
				expect(feature.end).toBeGreaterThan(feature.start);
			}
		});
	});
});
