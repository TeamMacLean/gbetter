import { describe, it, expect, vi, afterEach } from 'vitest';
import { isCoordinate, lookupGene, _clearGeneCache } from '$lib/services/geneLookup';
import { detectGeneTerm } from '$lib/services/geneQuery';
import { selectBamStrategy } from '$lib/services/bamDataStrategy';
import { findCoverageRegions } from '$lib/services/bam';
import type { GenomeAssembly } from '$lib/types/genome';

const human: GenomeAssembly = {
	id: 'grch38',
	name: 'Human GRCh38',
	chromosomes: [
		{ name: 'chr17', length: 83257441 },
		{ name: 'chrX', length: 156040895 }
	],
	source: 'builtin'
};

afterEach(() => {
	vi.restoreAllMocks();
	_clearGeneCache();
});

describe('isCoordinate — semantic validation (#27)', () => {
	it('rejects reversed ranges', () => {
		expect(isCoordinate('chr1:5000-1000')).toBe(false);
	});
	it('accepts a valid forward range', () => {
		expect(isCoordinate('chr1:1000-5000')).toBe(true);
		expect(isCoordinate('NC_000913.3:1-1000000')).toBe(true);
	});
});

describe('detectGeneTerm — repeated "to" (#28)', () => {
	it('strips repeated leading "to" tokens', () => {
		expect(detectGeneTerm('navigate to to TP53')).toEqual({ command: 'navigate', term: 'TP53' });
	});
});

describe('lookupGene — multi-location genes (#4)', () => {
	it('returns every genomic position, not just the first', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					hits: [
						{
							symbol: 'GENEX',
							name: 'multi-locus gene',
							genomic_pos: [
								{ chr: '17', start: 1, end: 100, strand: 1 },
								{ chr: 'X', start: 5000, end: 5100, strand: -1 }
							]
						}
					]
				})
			})
		);
		const results = await lookupGene('GENEX', human);
		expect(results).toHaveLength(2);
		expect(results.map((r) => r.chromosome).sort()).toEqual(['chr17', 'chrX']);
	});
});

describe('selectBamStrategy — invalid pixelsPerBase (#37)', () => {
	it('treats NaN/Infinity as fully zoomed-out (windowed coverage), not reads', () => {
		expect(selectBamStrategy(100000, NaN).useWindowed).toBe(true);
		expect(selectBamStrategy(100000, Infinity).useWindowed).toBe(true);
	});
});

describe('findCoverageRegions — invalid minCoverage (#45)', () => {
	it('clamps a negative threshold to 1 instead of matching everything as one region', () => {
		// depths: a clear peak (>=1) in the middle
		const regions = findCoverageRegions([0, 0, 5, 5, 0, 0], 0, -10, 'chr1');
		expect(regions.length).toBe(1);
		expect(regions[0].start).toBe(2);
		expect(regions[0].end).toBe(4);
	});
});
