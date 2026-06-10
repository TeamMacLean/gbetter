import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	isCoordinate,
	supportsGeneLookup,
	normalizeChromosome,
	lookupGene,
	_clearGeneCache,
	GENE_LOOKUP_CONFIG
} from '$lib/services/geneLookup';
import type { GenomeAssembly } from '$lib/types/genome';

function assembly(id: string, chromosomes: GenomeAssembly['chromosomes']): GenomeAssembly {
	return { id, name: id, chromosomes, source: 'builtin' };
}

const human = assembly('grch38', [
	{ name: 'chr17', length: 83257441 },
	{ name: 'chr13', length: 114364328 }
]);
const ecoli = assembly('ecoli-k12', [
	{ name: 'NC_000913.3', length: 4641652, aliases: ['chr', 'chromosome'] }
]);
const botrytis = assembly('botrytis', [{ name: '1', length: 4000000 }]);
const yeast = assembly('saccer3', [{ name: 'chrIV', length: 1531933 }]);

function mockFetchOnce(payload: unknown, ok = true, status = 200) {
	return vi.fn().mockResolvedValue({
		ok,
		status,
		json: async () => payload
	});
}

afterEach(() => {
	vi.restoreAllMocks();
	_clearGeneCache();
});

describe('isCoordinate', () => {
	it('recognizes chr and accession coordinates', () => {
		expect(isCoordinate('chr17:43044292-43170245')).toBe(true);
		expect(isCoordinate('NC_000913.3:1-1000000')).toBe(true);
		expect(isCoordinate('1:5,000-6,000')).toBe(true);
	});
	it('rejects gene terms', () => {
		expect(isCoordinate('BRCA1')).toBe(false);
		expect(isCoordinate('breast cancer')).toBe(false);
		expect(isCoordinate('TP53')).toBe(false);
	});
});

describe('supportsGeneLookup / config', () => {
	it('covers both backends', () => {
		expect(supportsGeneLookup('grch38')).toBe(true);
		expect(supportsGeneLookup('botrytis')).toBe(true);
		expect(supportsGeneLookup('nonexistent')).toBe(false);
		expect(GENE_LOOKUP_CONFIG['grch38']).toEqual({ backend: 'mygene', taxid: 9606 });
		expect(GENE_LOOKUP_CONFIG['saccer3']).toEqual({
			backend: 'ensembl',
			species: 'saccharomyces_cerevisiae'
		});
	});
});

describe('normalizeChromosome', () => {
	it('adds chr prefix for bare MyGene human names', () => {
		expect(normalizeChromosome('17', human)).toBe('chr17');
	});
	it('matches accession names directly (E. coli)', () => {
		expect(normalizeChromosome('NC_000913.3', ecoli)).toBe('NC_000913.3');
	});
	it('matches bare Ensembl names directly (botrytis)', () => {
		expect(normalizeChromosome('1', botrytis)).toBe('1');
	});
	it('adds chr prefix for roman-numeral yeast names', () => {
		expect(normalizeChromosome('IV', yeast)).toBe('chrIV');
	});
	it('strips a chr prefix when the assembly uses bare names', () => {
		expect(normalizeChromosome('chr1', botrytis)).toBe('1');
	});
	it('falls back to the raw value when nothing matches', () => {
		expect(normalizeChromosome('scaffold_99', human)).toBe('scaffold_99');
	});
});

describe('lookupGene (MyGene)', () => {
	it('maps hits, normalizes chromosome, and converts strand', async () => {
		vi.stubGlobal(
			'fetch',
			mockFetchOnce({
				hits: [
					{
						symbol: 'BRCA1',
						name: 'BRCA1 DNA repair associated',
						genomic_pos: { chr: '17', start: 43044292, end: 43170245, strand: -1 }
					},
					{ symbol: 'LOC1', name: 'promoter', genomic_pos: undefined }, // skipped
					{
						symbol: 'BRAP',
						name: 'BRCA1 associated protein',
						genomic_pos: { chr: '12', start: 111642146, end: 111685991, strand: 1 }
					}
				]
			})
		);
		const results = await lookupGene('BRCA1', human);
		expect(results).toHaveLength(2); // the no-position hit is dropped
		expect(results[0]).toEqual({
			symbol: 'BRCA1',
			name: 'BRCA1 DNA repair associated',
			chromosome: 'chr17',
			start: 43044292,
			end: 43170245,
			strand: '-',
			source: 'mygene'
		});
		expect(results[1].symbol).toBe('BRAP');
		expect(results[1].strand).toBe('+');
	});

	it('handles genomic_pos arrays (multi-location genes)', async () => {
		vi.stubGlobal(
			'fetch',
			mockFetchOnce({
				hits: [
					{
						symbol: 'X',
						name: 'x',
						genomic_pos: [{ chr: '17', start: 1, end: 9, strand: 1 }]
					}
				]
			})
		);
		const results = await lookupGene('X', human);
		expect(results[0].chromosome).toBe('chr17');
		expect(results[0].start).toBe(1);
	});

	it('caches results (no second fetch for the same term)', async () => {
		const fetchMock = mockFetchOnce({
			hits: [{ symbol: 'TP53', name: 'p53', genomic_pos: { chr: '17', start: 1, end: 2, strand: -1 } }]
		});
		vi.stubGlobal('fetch', fetchMock);
		await lookupGene('TP53', human);
		await lookupGene('TP53', human);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('returns [] when there are no hits', async () => {
		vi.stubGlobal('fetch', mockFetchOnce({ hits: [] }));
		expect(await lookupGene('zzz', human)).toEqual([]);
	});

	it('throws on an HTTP error', async () => {
		vi.stubGlobal('fetch', mockFetchOnce({}, false, 500));
		await expect(lookupGene('BRCA1', human)).rejects.toThrow(/MyGene/);
	});
});

describe('lookupGene (Ensembl two-step)', () => {
	it('resolves symbol -> id -> coordinates', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ type: 'gene', id: 'Bcin01g00060' }] })
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					display_name: 'Bcboa6',
					id: 'Bcin01g00060',
					seq_region_name: '1',
					start: 15855,
					end: 23759,
					strand: 1
				})
			});
		vi.stubGlobal('fetch', fetchMock);
		const results = await lookupGene('bcboa6', botrytis);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(results[0]).toEqual({
			symbol: 'Bcboa6',
			name: 'Bcboa6',
			chromosome: '1',
			start: 15855,
			end: 23759,
			strand: '+',
			source: 'ensembl'
		});
	});

	it('returns [] when the symbol has no gene xref', async () => {
		vi.stubGlobal('fetch', mockFetchOnce([]));
		expect(await lookupGene('nope', botrytis)).toEqual([]);
	});
});

describe('lookupGene (errors)', () => {
	it('throws for an unsupported assembly', async () => {
		const custom = assembly('my-genome', [{ name: 'scaffold1', length: 1000 }]);
		await expect(lookupGene('BRCA1', custom)).rejects.toThrow(/not available/);
	});
	it('returns [] for an empty term without calling fetch', async () => {
		const fetchMock = mockFetchOnce({ hits: [] });
		vi.stubGlobal('fetch', fetchMock);
		expect(await lookupGene('   ', human)).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
