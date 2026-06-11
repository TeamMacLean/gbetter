import { describe, it, expect } from 'vitest';
import { variantsTrackType } from '$lib/services/trackTypes/variants';
import { parseQuery, executeQueryWithTracks } from '$lib/services/queryLanguage';
import { buildBrowserContext } from '$lib/services/ai';
import { buildUserMessage } from '$lib/services/ai/prompt';

const VCF = [
	'##fileformat=VCFv4.2',
	'#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO',
	'chr17\t100\trs1\tC\tG\t.\tPASS\tGENE=TP53;IMPACT=missense;CLIN=pathogenic',
	'chr17\t200\trs2\tC\tT\t.\tPASS\tGENE=TP53;IMPACT=nonsense;CLIN=likely_pathogenic',
	'chr17\t300\trs3\tA\tG\t.\tPASS\tGENE=TP53;IMPACT=missense;CLIN=benign'
].join('\n');

function vcfTrack() {
	return {
		id: 'v',
		name: 'variants',
		typeId: 'vcf',
		visible: true,
		features: variantsTrackType.parse!(VCF).features
	} as any;
}

describe('VCF INFO fields are filterable via WHERE', () => {
	it('filters on a lowercased INFO field (clin)', () => {
		const r = executeQueryWithTracks(parseQuery('SELECT VARIANTS WHERE clin = pathogenic'), [vcfTrack()]);
		expect(r.results?.length).toBe(1);
	});
	it('supports contains on clin', () => {
		const r = executeQueryWithTracks(parseQuery('SELECT VARIANTS WHERE clin contains pathogenic'), [vcfTrack()]);
		expect(r.results?.length).toBe(2); // pathogenic + likely_pathogenic
	});
	it('filters on impact', () => {
		const r = executeQueryWithTracks(parseQuery('SELECT VARIANTS WHERE impact = nonsense'), [vcfTrack()]);
		expect(r.results?.length).toBe(1);
	});
});

describe('AI context advertises VCF filter fields', () => {
	it('lists INFO field names so the AI can write matching WHERE clauses', () => {
		const ctx = buildBrowserContext([vcfTrack()], { chromosome: 'chr17', start: 0, end: 1000 }, []);
		const vcfInfo = ctx.tracks[0];
		expect(vcfInfo.fields).toContain('clin');
		expect(vcfInfo.fields).toContain('impact');
		expect(vcfInfo.fields).toContain('gene');
		const msg = buildUserMessage('show pathogenic variants', ctx);
		expect(msg).toMatch(/filterable fields.*clin/i);
	});
});
