/**
 * VCF Parser Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { variantsTrackType } from '$lib/services/trackTypes/variants';

const parse = variantsTrackType.parse;

describe('VCF Parser', () => {
	describe('basic parsing', () => {
		it('parses a simple VCF line', () => {
			const vcf = 'chr1\t100\trs123\tA\tG\t30\tPASS\t.';
			const result = parse(vcf);
			expect(result.errors).toHaveLength(0);
			expect(result.features).toHaveLength(1);
			expect(result.features[0]).toMatchObject({
				chromosome: 'chr1',
				start: 99,  // 1-based to 0-based
				end: 100,
				ref: 'A',
				alt: ['G'],
			});
		});

		it('converts 1-based VCF to 0-based internal', () => {
			const vcf = 'chr1\t1\t.\tA\tG\t.\t.\t.';
			const result = parse(vcf);
			expect(result.features[0].start).toBe(0);
		});

		it('calculates end from ref length', () => {
			const vcf = 'chr1\t100\t.\tACGT\tA\t.\t.\t.';  // 4bp deletion
			const result = parse(vcf);
			expect(result.features[0].start).toBe(99);
			expect(result.features[0].end).toBe(103);  // 99 + 4
		});

		it('parses multiple variants', () => {
			const vcf = `chr1\t100\t.\tA\tG\t.\t.\t.
chr1\t200\t.\tC\tT\t.\t.\t.`;
			const result = parse(vcf);
			expect(result.features).toHaveLength(2);
		});
	});

	describe('chromosome handling', () => {
		it('keeps chr prefix if present', () => {
			const result = parse('chr1\t100\t.\tA\tG\t.\t.\t.');
			expect(result.features[0].chromosome).toBe('chr1');
		});

		it('adds chr prefix if missing', () => {
			const result = parse('1\t100\t.\tA\tG\t.\t.\t.');
			expect(result.features[0].chromosome).toBe('chr1');
		});

		it('handles chrX, chrY, chrM', () => {
			const vcf = `chrX\t100\t.\tA\tG\t.\t.\t.
Y\t100\t.\tC\tT\t.\t.\t.
MT\t100\t.\tG\tA\t.\t.\t.`;
			const result = parse(vcf);
			expect(result.features.map(f => f.chromosome)).toEqual(['chrX', 'chrY', 'chrMT']);
		});
	});

	describe('ID field', () => {
		it('uses ID as feature id when present', () => {
			const result = parse('chr1\t100\trs12345\tA\tG\t.\t.\t.');
			expect(result.features[0].id).toBe('rs12345');
			expect(result.features[0].name).toBe('rs12345');
		});

		it('generates ID when missing (.)', () => {
			const result = parse('chr1\t100\t.\tA\tG\t.\t.\t.');
			expect(result.features[0].id).toMatch(/^var_\d+$/);
		});

		it('uses ref>alt as name when ID is missing', () => {
			const result = parse('chr1\t100\t.\tA\tG\t.\t.\t.');
			expect(result.features[0].name).toBe('A>G');
		});
	});

	describe('REF and ALT fields', () => {
		it('parses single alt allele', () => {
			const result = parse('chr1\t100\t.\tA\tG\t.\t.\t.');
			expect(result.features[0].ref).toBe('A');
			expect(result.features[0].alt).toEqual(['G']);
		});

		it('parses multiple alt alleles', () => {
			const result = parse('chr1\t100\t.\tA\tG,C,T\t.\t.\t.');
			expect(result.features[0].alt).toEqual(['G', 'C', 'T']);
		});

		it('handles insertions', () => {
			const result = parse('chr1\t100\t.\tA\tACGT\t.\t.\t.');
			expect(result.features[0].ref).toBe('A');
			expect(result.features[0].alt).toEqual(['ACGT']);
		});

		it('handles deletions', () => {
			const result = parse('chr1\t100\t.\tACGT\tA\t.\t.\t.');
			expect(result.features[0].ref).toBe('ACGT');
			expect(result.features[0].alt).toEqual(['A']);
		});
	});

	describe('QUAL field', () => {
		it('parses quality score', () => {
			const result = parse('chr1\t100\t.\tA\tG\t30.5\t.\t.');
			expect(result.features[0].qual).toBe(30.5);
		});

		it('handles missing quality (.)', () => {
			const result = parse('chr1\t100\t.\tA\tG\t.\t.\t.');
			expect(result.features[0].qual).toBeUndefined();
		});
	});

	describe('FILTER field', () => {
		it('parses PASS filter', () => {
			const result = parse('chr1\t100\t.\tA\tG\t30\tPASS\t.');
			expect(result.features[0].filter).toBe('PASS');
		});

		it('parses filter values', () => {
			const result = parse('chr1\t100\t.\tA\tG\t30\tLowQual\t.');
			expect(result.features[0].filter).toBe('LowQual');
		});

		it('handles missing filter (.)', () => {
			const result = parse('chr1\t100\t.\tA\tG\t30\t.\t.');
			expect(result.features[0].filter).toBeUndefined();
		});
	});

	describe('INFO field', () => {
		it('parses key=value pairs', () => {
			const result = parse('chr1\t100\t.\tA\tG\t30\tPASS\tDP=100;AF=0.5');
			expect(result.features[0].info).toEqual({
				DP: '100',
				AF: '0.5',
			});
		});

		it('parses flag fields (no value)', () => {
			const result = parse('chr1\t100\t.\tA\tG\t30\tPASS\tDB;DP=100');
			expect(result.features[0].info?.DB).toBe('true');
			expect(result.features[0].info?.DP).toBe('100');
		});

		it('handles missing INFO (.)', () => {
			const result = parse('chr1\t100\t.\tA\tG\t30\tPASS\t.');
			expect(result.features[0].info).toEqual({});
		});
	});

	describe('header handling', () => {
		it('skips header lines starting with #', () => {
			const vcf = `##fileformat=VCFv4.2
##INFO=<ID=DP,Number=1,Type=Integer>
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t100\t.\tA\tG\t30\tPASS\t.`;
			const result = parse(vcf);
			expect(result.features).toHaveLength(1);
		});

		it('skips empty lines', () => {
			const vcf = `
chr1\t100\t.\tA\tG\t.\t.\t.

chr1\t200\t.\tC\tT\t.\t.\t.
`;
			const result = parse(vcf);
			expect(result.features).toHaveLength(2);
		});
	});

	describe('error handling', () => {
		it('reports error for fewer than 5 fields', () => {
			const result = parse('chr1\t100\t.\tA');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toContain('Expected at least 5 fields');
		});

		it('reports error for invalid position', () => {
			const result = parse('chr1\tabc\t.\tA\tG\t.\t.\t.');
			expect(result.features).toHaveLength(0);
			expect(result.errors[0]).toContain('Invalid position');
		});

		it('reports error for negative position', () => {
			const result = parse('chr1\t0\t.\tA\tG\t.\t.\t.');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
		});

		it('continues parsing after errors', () => {
			const vcf = `chr1\tinvalid
chr1\t100\t.\tA\tG\t.\t.\t.`;
			const result = parse(vcf);
			expect(result.features).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
		});

		it('includes line number in error', () => {
			const vcf = `chr1\t100\t.\tA\tG\t.\t.\t.
chr1\tinvalid`;
			const result = parse(vcf);
			expect(result.errors[0]).toContain('Line 2');
		});
	});

	describe('real-world data', () => {
		it('parses sample VCF file', async () => {
			const fs = await import('fs');
			const content = fs.readFileSync('tests/fixtures/sample-variants.vcf', 'utf-8');
			const result = parse(content);

			expect(result.features.length).toBeGreaterThan(0);

			for (const feature of result.features) {
				expect(feature.start).toBeGreaterThanOrEqual(0);
				expect(feature.ref).toBeTruthy();
				expect(feature.alt.length).toBeGreaterThan(0);
			}
		});

		it('parses cancer variants file', async () => {
			const fs = await import('fs');
			const content = fs.readFileSync('tests/fixtures/cancer-variants.vcf', 'utf-8');
			const result = parse(content);

			expect(result.features.length).toBeGreaterThan(0);
		});
	});
});
