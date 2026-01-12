/**
 * GFF3 Parser Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { geneModelTrackType } from '$lib/services/trackTypes/geneModel';

const parse = geneModelTrackType.parse;

describe('GFF3 Parser', () => {
	describe('basic parsing', () => {
		it('parses a simple GFF3 line', () => {
			const gff = 'chr1\t.\texon\t101\t200\t.\t+\t.\tID=exon1';
			const result = parse(gff);
			expect(result.errors).toHaveLength(0);
			expect(result.features).toHaveLength(1);
			expect(result.features[0]).toMatchObject({
				chromosome: 'chr1',
				start: 100,  // 1-based to 0-based
				end: 200,
				strand: '+',
				featureType: 'exon',
			});
		});

		it('converts 1-based GFF3 to 0-based internal', () => {
			const gff = 'chr1\t.\texon\t1\t100\t.\t+\t.\tID=exon1';
			const result = parse(gff);
			expect(result.features[0].start).toBe(0);
			expect(result.features[0].end).toBe(100);
		});

		it('parses multiple features', () => {
			const gff = `chr1\t.\tgene\t1001\t2000\t.\t+\t.\tID=gene1
chr1\t.\texon\t1001\t1200\t.\t+\t.\tID=exon1;Parent=gene1`;
			const result = parse(gff);
			expect(result.features).toHaveLength(2);
		});
	});

	describe('feature types', () => {
		it('recognizes gene type', () => {
			const result = parse('chr1\t.\tgene\t101\t1000\t.\t+\t.\tID=gene1');
			expect(result.features[0].featureType).toBe('gene');
		});

		it('recognizes mRNA type', () => {
			const result = parse('chr1\t.\tmRNA\t101\t1000\t.\t+\t.\tID=mrna1');
			expect(result.features[0].featureType).toBe('mRNA');
		});

		it('recognizes transcript as mRNA', () => {
			const result = parse('chr1\t.\ttranscript\t101\t1000\t.\t+\t.\tID=tx1');
			expect(result.features[0].featureType).toBe('mRNA');
		});

		it('recognizes CDS type', () => {
			const result = parse('chr1\t.\tCDS\t101\t300\t.\t+\t0\tID=cds1');
			expect(result.features[0].featureType).toBe('CDS');
		});

		it('recognizes exon type', () => {
			const result = parse('chr1\t.\texon\t101\t200\t.\t+\t.\tID=exon1');
			expect(result.features[0].featureType).toBe('exon');
		});

		it('recognizes five_prime_UTR', () => {
			const result = parse('chr1\t.\tfive_prime_UTR\t101\t150\t.\t+\t.\tID=utr1');
			expect(result.features[0].featureType).toBe('five_prime_UTR');
		});

		it('recognizes three_prime_UTR', () => {
			const result = parse('chr1\t.\tthree_prime_UTR\t901\t1000\t.\t+\t.\tID=utr2');
			expect(result.features[0].featureType).toBe('three_prime_UTR');
		});

		it('is case insensitive for feature types', () => {
			const result = parse('chr1\t.\tGENE\t101\t1000\t.\t+\t.\tID=gene1');
			expect(result.features[0].featureType).toBe('gene');
		});
	});

	describe('attribute parsing', () => {
		it('parses ID attribute', () => {
			const result = parse('chr1\t.\tgene\t101\t1000\t.\t+\t.\tID=gene1');
			expect(result.features[0].id).toBe('gene1');
		});

		it('parses Name attribute', () => {
			const result = parse('chr1\t.\tgene\t101\t1000\t.\t+\t.\tID=gene1;Name=TP53');
			expect(result.features[0].name).toBe('TP53');
		});

		it('parses gene_name attribute as name', () => {
			const result = parse('chr1\t.\tgene\t101\t1000\t.\t+\t.\tID=gene1;gene_name=BRCA1');
			expect(result.features[0].name).toBe('BRCA1');
		});

		it('prefers Name over gene_name', () => {
			const result = parse('chr1\t.\tgene\t101\t1000\t.\t+\t.\tID=gene1;Name=TP53;gene_name=BRCA1');
			expect(result.features[0].name).toBe('TP53');
		});

		it('parses Parent attribute', () => {
			const result = parse('chr1\t.\texon\t101\t200\t.\t+\t.\tID=exon1;Parent=gene1');
			expect(result.features[0].parent).toBe('gene1');
		});

		it('decodes URL-encoded attribute values', () => {
			const result = parse('chr1\t.\tgene\t101\t1000\t.\t+\t.\tID=gene1;Name=Gene%20Name');
			expect(result.features[0].name).toBe('Gene Name');
		});

		it('stores all attributes', () => {
			const result = parse('chr1\t.\tgene\t101\t1000\t.\t+\t.\tID=gene1;custom_attr=value');
			expect(result.features[0].attributes?.custom_attr).toBe('value');
		});
	});

	describe('parent-child relationships', () => {
		it('links children to parents', () => {
			const gff = `chr1\t.\tgene\t1001\t2000\t.\t+\t.\tID=gene1
chr1\t.\texon\t1001\t1200\t.\t+\t.\tID=exon1;Parent=gene1`;
			const result = parse(gff);

			const gene = result.features.find(f => f.id === 'gene1');
			expect(gene?.children).toHaveLength(1);
			expect(gene?.children[0].id).toBe('exon1');
		});

		it('handles multiple children', () => {
			const gff = `chr1\t.\tgene\t1001\t2000\t.\t+\t.\tID=gene1
chr1\t.\texon\t1001\t1200\t.\t+\t.\tID=exon1;Parent=gene1
chr1\t.\texon\t1501\t1700\t.\t+\t.\tID=exon2;Parent=gene1`;
			const result = parse(gff);

			const gene = result.features.find(f => f.id === 'gene1');
			expect(gene?.children).toHaveLength(2);
		});

		it('handles multiple parents (comma-separated)', () => {
			const gff = `chr1\t.\tgene\t1001\t2000\t.\t+\t.\tID=gene1
chr1\t.\tgene\t1001\t2000\t.\t+\t.\tID=gene2
chr1\t.\texon\t1001\t1200\t.\t+\t.\tID=exon1;Parent=gene1,gene2`;
			const result = parse(gff);

			const gene1 = result.features.find(f => f.id === 'gene1');
			const gene2 = result.features.find(f => f.id === 'gene2');
			expect(gene1?.children).toHaveLength(1);
			expect(gene2?.children).toHaveLength(1);
		});
	});

	describe('strand handling', () => {
		it('parses + strand', () => {
			const result = parse('chr1\t.\texon\t101\t200\t.\t+\t.\tID=exon1');
			expect(result.features[0].strand).toBe('+');
		});

		it('parses - strand', () => {
			const result = parse('chr1\t.\texon\t101\t200\t.\t-\t.\tID=exon1');
			expect(result.features[0].strand).toBe('-');
		});

		it('treats . as unknown strand', () => {
			const result = parse('chr1\t.\texon\t101\t200\t.\t.\t.\tID=exon1');
			expect(result.features[0].strand).toBe('.');
		});
	});

	describe('comment and directive handling', () => {
		it('skips comment lines', () => {
			const gff = `# This is a comment
chr1\t.\texon\t101\t200\t.\t+\t.\tID=exon1`;
			const result = parse(gff);
			expect(result.features).toHaveLength(1);
		});

		it('skips ##gff-version directive', () => {
			const gff = `##gff-version 3
chr1\t.\texon\t101\t200\t.\t+\t.\tID=exon1`;
			const result = parse(gff);
			expect(result.features).toHaveLength(1);
		});

		it('stops at FASTA section', () => {
			const gff = `chr1\t.\texon\t101\t200\t.\t+\t.\tID=exon1
>chr1
ATCGATCG`;
			const result = parse(gff);
			expect(result.features).toHaveLength(1);
		});
	});

	describe('error handling', () => {
		it('reports error for wrong number of fields', () => {
			const result = parse('chr1\texon\t101\t200');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toContain('Expected 9 fields');
		});

		it('reports error for invalid coordinates', () => {
			const result = parse('chr1\t.\texon\tabc\t200\t.\t+\t.\tID=exon1');
			expect(result.features).toHaveLength(0);
			expect(result.errors[0]).toContain('Invalid coordinates');
		});

		it('reports error for end <= start', () => {
			const result = parse('chr1\t.\texon\t200\t100\t.\t+\t.\tID=exon1');
			expect(result.features).toHaveLength(0);
			expect(result.errors).toHaveLength(1);
		});

		it('continues parsing after errors', () => {
			const gff = `chr1\tinvalid
chr1\t.\texon\t101\t200\t.\t+\t.\tID=exon1`;
			const result = parse(gff);
			expect(result.features).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
		});

		it('includes line number in error', () => {
			const gff = `chr1\t.\texon\t101\t200\t.\t+\t.\tID=exon1
chr1\tinvalid`;
			const result = parse(gff);
			expect(result.errors[0]).toContain('Line 2');
		});
	});

	describe('real-world data', () => {
		it('parses sample GFF3 file correctly', async () => {
			const fs = await import('fs');
			const content = fs.readFileSync('tests/fixtures/sample-exons.gff3', 'utf-8');
			const result = parse(content);

			expect(result.features.length).toBeGreaterThan(0);

			// All features should have valid coordinates
			for (const feature of result.features) {
				expect(feature.start).toBeGreaterThanOrEqual(0);
				expect(feature.end).toBeGreaterThan(feature.start);
			}
		});

		it('parses E. coli genes file', async () => {
			const fs = await import('fs');
			const content = fs.readFileSync('tests/fixtures/ecoli-genes.gff3', 'utf-8');
			const result = parse(content);

			expect(result.features.length).toBeGreaterThan(0);
		});
	});
});
