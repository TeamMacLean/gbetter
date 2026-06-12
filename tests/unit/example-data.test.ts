import { describe, it, expect } from 'vitest';
import { EXAMPLE_FILES, EXAMPLE_LOCUS, EXAMPLE_ASSEMBLY_ID } from '$lib/examples';
import { geneModelTrackType } from '$lib/services/trackTypes/geneModel';
import { variantsTrackType } from '$lib/services/trackTypes/variants';

describe('bundled example data (onboarding "Load example")', () => {
	it('ships both example files', () => {
		expect(EXAMPLE_FILES).toHaveLength(2);
		expect(EXAMPLE_FILES.every((f) => f.content.length > 0)).toBe(true);
	});

	it('parses into features through the real track parsers', () => {
		const genes = EXAMPLE_FILES.find((f) => f.name.endsWith('.gff3'))!;
		const variants = EXAMPLE_FILES.find((f) => f.name.endsWith('.vcf'))!;
		expect(geneModelTrackType.parse(genes.content).features.length).toBeGreaterThan(0);
		expect(variantsTrackType.parse!(variants.content).features.length).toBeGreaterThan(0);
	});

	it('lands on a locus that actually exists in the gene data', () => {
		const genes = geneModelTrackType.parse(EXAMPLE_FILES[0].content).features;
		const onChrom = genes.filter((f) => f.chromosome === EXAMPLE_LOCUS.chromosome);
		expect(onChrom.length).toBeGreaterThan(0);
		// a gene overlaps the landing window
		expect(
			onChrom.some((f) => f.start < EXAMPLE_LOCUS.end && f.end > EXAMPLE_LOCUS.start)
		).toBe(true);
		expect(EXAMPLE_ASSEMBLY_ID).toBe('grch38');
	});
});
