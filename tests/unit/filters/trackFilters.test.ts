/**
 * Track Filter Unit Tests
 * Tests the filter matching logic with real feature structures
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Import the actual types and functions we need to test
import type { GeneModelFeature } from '$lib/types/tracks';
import type { GenomicFeature } from '$lib/types/genome';

// We need to test the featureMatchesCriteria function
// Since it's not exported, let's create test features and check via the store

// Create mock GFF features (like what the GFF parser produces)
function createGffFeature(overrides: Partial<GeneModelFeature> = {}): GeneModelFeature {
	return {
		id: 'test_1',
		chromosome: 'chr1',
		start: 1000,
		end: 2000,
		name: 'TestGene',
		strand: '+',
		featureType: 'exon',
		children: [],
		...overrides,
	};
}

// Create mock BED features
function createBedFeature(overrides: Partial<GenomicFeature> = {}): GenomicFeature {
	return {
		id: 'bed_1',
		chromosome: 'chr1',
		start: 1000,
		end: 2000,
		name: 'TestFeature',
		strand: '+',
		...overrides,
	};
}

describe('Track Filter Logic', () => {
	describe('GFF Feature Structure', () => {
		it('GFF features have featureType, not type', () => {
			const feature = createGffFeature({ featureType: 'exon' });

			// GFF features use featureType
			expect(feature.featureType).toBe('exon');

			// They should NOT have a 'type' property with the feature type
			expect((feature as any).type).toBeUndefined();
		});

		it('can identify exon vs gene vs CDS', () => {
			const exon = createGffFeature({ featureType: 'exon' });
			const gene = createGffFeature({ featureType: 'gene' });
			const cds = createGffFeature({ featureType: 'CDS' });

			expect(exon.featureType).toBe('exon');
			expect(gene.featureType).toBe('gene');
			expect(cds.featureType).toBe('CDS');
		});
	});

	describe('Filter Criteria Matching', () => {
		// Import the store to test filtering
		// Note: We need to test the actual matching logic

		it('should match featureType when filtering by type=exon', async () => {
			// Dynamically import to avoid module initialization issues
			const { useTracks } = await import('$lib/stores/tracks.svelte');
			const tracks = useTracks();

			// Create a mock track with GFF features
			const features: GeneModelFeature[] = [
				createGffFeature({ id: '1', featureType: 'gene', name: 'Gene1' }),
				createGffFeature({ id: '2', featureType: 'mRNA', name: 'mRNA1' }),
				createGffFeature({ id: '3', featureType: 'exon', name: 'Exon1' }),
				createGffFeature({ id: '4', featureType: 'exon', name: 'Exon2' }),
				createGffFeature({ id: '5', featureType: 'CDS', name: 'CDS1' }),
			];

			const mockTrack = {
				id: 'test-track',
				name: 'Test Track',
				typeId: 'gene-model',
				features,
				visible: true,
				color: '#6366f1',
				height: 100,
			};

			// Set a filter for type=exon
			tracks.setGlobalFilter([{ field: 'type', operator: '=', value: 'exon' }], 'dim');

			// Get filtered features
			const { visible, dimmed } = tracks.getFilteredFeatures(mockTrack);

			// Exons should be visible (matching)
			expect(visible.length).toBe(2);
			expect(visible.every(f => (f as GeneModelFeature).featureType === 'exon')).toBe(true);

			// Everything else should be dimmed
			expect(dimmed.length).toBe(3);

			// Clean up
			tracks.clearAllFilters();
		});

		it('should match strand when filtering by strand=+', async () => {
			const { useTracks } = await import('$lib/stores/tracks.svelte');
			const tracks = useTracks();

			const features: GeneModelFeature[] = [
				createGffFeature({ id: '1', strand: '+', name: 'Plus1' }),
				createGffFeature({ id: '2', strand: '-', name: 'Minus1' }),
				createGffFeature({ id: '3', strand: '+', name: 'Plus2' }),
				createGffFeature({ id: '4', strand: '.', name: 'NoStrand' }),
			];

			const mockTrack = {
				id: 'test-track',
				name: 'Test Track',
				typeId: 'gene-model',
				features,
				visible: true,
				color: '#6366f1',
				height: 100,
			};

			tracks.setGlobalFilter([{ field: 'strand', operator: '=', value: '+' }], 'dim');

			const { visible, dimmed } = tracks.getFilteredFeatures(mockTrack);

			expect(visible.length).toBe(2);
			expect(visible.every(f => f.strand === '+')).toBe(true);
			expect(dimmed.length).toBe(2);

			tracks.clearAllFilters();
		});

		it('should match CDS type (case insensitive)', async () => {
			const { useTracks } = await import('$lib/stores/tracks.svelte');
			const tracks = useTracks();

			const features: GeneModelFeature[] = [
				createGffFeature({ id: '1', featureType: 'CDS' }),
				createGffFeature({ id: '2', featureType: 'exon' }),
				createGffFeature({ id: '3', featureType: 'CDS' }),
			];

			const mockTrack = {
				id: 'test-track',
				name: 'Test Track',
				typeId: 'gene-model',
				features,
				visible: true,
				color: '#6366f1',
				height: 100,
			};

			// Filter with lowercase
			tracks.setGlobalFilter([{ field: 'type', operator: '=', value: 'cds' }], 'dim');

			const { visible, dimmed } = tracks.getFilteredFeatures(mockTrack);

			expect(visible.length).toBe(2);
			expect(dimmed.length).toBe(1);

			tracks.clearAllFilters();
		});
	});

	describe('Real GFF Parsing and Filtering', () => {
		it('parses GFF features with correct featureType', async () => {
			const { geneModelTrackType } = await import('$lib/services/trackTypes/geneModel');

			const gffContent = `##gff-version 3
chr1	test	gene	1000	2000	.	+	.	ID=gene1;Name=TestGene
chr1	test	mRNA	1000	2000	.	+	.	ID=mrna1;Parent=gene1
chr1	test	exon	1000	1500	.	+	.	ID=exon1;Parent=mrna1
chr1	test	exon	1600	2000	.	+	.	ID=exon2;Parent=mrna1
chr1	test	CDS	1100	1400	.	+	0	ID=cds1;Parent=mrna1`;

			const result = geneModelTrackType.parse(gffContent);

			expect(result.features.length).toBe(5);

			// Check featureTypes are set correctly
			const gene = result.features.find(f => f.id === 'gene1');
			const mrna = result.features.find(f => f.id === 'mrna1');
			const exon1 = result.features.find(f => f.id === 'exon1');
			const cds = result.features.find(f => f.id === 'cds1');

			expect(gene?.featureType).toBe('gene');
			expect(mrna?.featureType).toBe('mRNA');
			expect(exon1?.featureType).toBe('exon');
			expect(cds?.featureType).toBe('CDS');

			// Verify 'type' is NOT a property (we use featureType)
			expect('type' in gene!).toBe(false);
		});

		it('filters exons correctly with gene+mRNA+exon+CDS structure', async () => {
			const { geneModelTrackType } = await import('$lib/services/trackTypes/geneModel');
			const { useTracks } = await import('$lib/stores/tracks.svelte');

			const gffContent = `##gff-version 3
chr1	test	gene	1000	2000	.	+	.	ID=gene1;Name=TestGene
chr1	test	exon	1000	1500	.	+	.	ID=exon1;Parent=gene1
chr1	test	exon	1600	2000	.	+	.	ID=exon2;Parent=gene1
chr1	test	CDS	1100	1400	.	+	0	ID=cds1;Parent=gene1`;

			const result = geneModelTrackType.parse(gffContent);
			const tracks = useTracks();

			const mockTrack = {
				id: 'test-track',
				name: 'Test Track',
				typeId: 'gene-model',
				features: result.features,
				visible: true,
				color: '#6366f1',
				height: 100,
			};

			// Filter for exons
			tracks.setGlobalFilter([{ field: 'type', operator: '=', value: 'exon' }], 'dim');
			const { visible, dimmed } = tracks.getFilteredFeatures(mockTrack);

			expect(visible.length).toBe(2); // 2 exons
			expect(dimmed.length).toBe(2); // gene + CDS
			expect(visible.every(f => (f as any).featureType === 'exon')).toBe(true);

			tracks.clearAllFilters();
		});

		it('filters CDS correctly', async () => {
			const { geneModelTrackType } = await import('$lib/services/trackTypes/geneModel');
			const { useTracks } = await import('$lib/stores/tracks.svelte');

			const gffContent = `##gff-version 3
chr1	test	gene	1000	10000	.	+	.	ID=gene1;Name=TestGene
chr1	test	exon	1000	2000	.	+	.	ID=exon1;Parent=gene1
chr1	test	exon	5000	6000	.	+	.	ID=exon2;Parent=gene1
chr1	test	CDS	1200	2000	.	+	0	ID=cds1;Parent=gene1
chr1	test	CDS	5000	5800	.	+	0	ID=cds2;Parent=gene1`;

			const result = geneModelTrackType.parse(gffContent);
			const tracks = useTracks();

			const mockTrack = {
				id: 'test-track',
				name: 'Test Track',
				typeId: 'gene-model',
				features: result.features,
				visible: true,
				color: '#6366f1',
				height: 100,
			};

			// Filter for CDS
			tracks.setGlobalFilter([{ field: 'type', operator: '=', value: 'CDS' }], 'dim');
			const { visible, dimmed } = tracks.getFilteredFeatures(mockTrack);

			expect(visible.length).toBe(2); // 2 CDS
			expect(dimmed.length).toBe(3); // gene + 2 exons
			expect(visible.every(f => (f as any).featureType === 'CDS')).toBe(true);

			tracks.clearAllFilters();
		});

		it('handles mRNA-only data (no gene parent)', async () => {
			const { geneModelTrackType } = await import('$lib/services/trackTypes/geneModel');
			const { useTracks } = await import('$lib/stores/tracks.svelte');

			const gffContent = `##gff-version 3
chr1	test	mRNA	1000	8000	.	+	.	ID=MRNA1;Name=DirectTranscript
chr1	test	exon	1000	2000	.	+	.	ID=exon1;Parent=MRNA1
chr1	test	exon	4000	5000	.	+	.	ID=exon2;Parent=MRNA1
chr1	test	CDS	1200	2000	.	+	0	ID=cds1;Parent=MRNA1
chr1	test	CDS	4000	4800	.	+	0	ID=cds2;Parent=MRNA1`;

			const result = geneModelTrackType.parse(gffContent);
			const tracks = useTracks();

			// mRNA should be top-level (no parent)
			const mrna = result.features.find(f => f.id === 'MRNA1');
			expect(mrna?.parent).toBeUndefined();
			expect(mrna?.featureType).toBe('mRNA');

			const mockTrack = {
				id: 'test-track',
				name: 'Test Track',
				typeId: 'gene-model',
				features: result.features,
				visible: true,
				color: '#6366f1',
				height: 100,
			};

			// Filter for exons in mRNA-only data
			tracks.setGlobalFilter([{ field: 'type', operator: '=', value: 'exon' }], 'dim');
			const { visible, dimmed } = tracks.getFilteredFeatures(mockTrack);

			expect(visible.length).toBe(2); // 2 exons
			expect(dimmed.length).toBe(3); // mRNA + 2 CDS

			tracks.clearAllFilters();
		});

		it('handles exon-only data (orphan exons)', async () => {
			const { geneModelTrackType } = await import('$lib/services/trackTypes/geneModel');
			const { useTracks } = await import('$lib/stores/tracks.svelte');

			const gffContent = `##gff-version 3
chr1	test	exon	1000	2000	.	+	.	ID=exon1;Name=OrphanExon1
chr1	test	exon	5000	6000	.	+	.	ID=exon2;Name=OrphanExon2
chr1	test	exon	10000	11000	.	-	.	ID=exon3;Name=OrphanExon3`;

			const result = geneModelTrackType.parse(gffContent);
			const tracks = useTracks();

			// All exons should be top-level
			expect(result.features.every(f => !f.parent)).toBe(true);
			expect(result.features.every(f => f.featureType === 'exon')).toBe(true);

			const mockTrack = {
				id: 'test-track',
				name: 'Test Track',
				typeId: 'gene-model',
				features: result.features,
				visible: true,
				color: '#6366f1',
				height: 100,
			};

			// Filter for plus strand
			tracks.setGlobalFilter([{ field: 'strand', operator: '=', value: '+' }], 'dim');
			const { visible, dimmed } = tracks.getFilteredFeatures(mockTrack);

			expect(visible.length).toBe(2); // 2 plus strand exons
			expect(dimmed.length).toBe(1); // 1 minus strand exon

			tracks.clearAllFilters();
		});

		it('filters by strand correctly', async () => {
			const { geneModelTrackType } = await import('$lib/services/trackTypes/geneModel');
			const { useTracks } = await import('$lib/stores/tracks.svelte');

			const gffContent = `##gff-version 3
chr1	test	gene	1000	5000	.	+	.	ID=gene1;Name=PlusGene
chr1	test	exon	1000	2000	.	+	.	ID=exon1;Parent=gene1
chr1	test	gene	10000	15000	.	-	.	ID=gene2;Name=MinusGene
chr1	test	exon	10000	11000	.	-	.	ID=exon2;Parent=gene2`;

			const result = geneModelTrackType.parse(gffContent);
			const tracks = useTracks();

			const mockTrack = {
				id: 'test-track',
				name: 'Test Track',
				typeId: 'gene-model',
				features: result.features,
				visible: true,
				color: '#6366f1',
				height: 100,
			};

			// Filter for minus strand
			tracks.setGlobalFilter([{ field: 'strand', operator: '=', value: '-' }], 'dim');
			const { visible, dimmed } = tracks.getFilteredFeatures(mockTrack);

			expect(visible.length).toBe(2); // gene2 + exon2
			expect(dimmed.length).toBe(2); // gene1 + exon1
			expect(visible.every(f => f.strand === '-')).toBe(true);

			tracks.clearAllFilters();
		});

		it('clears filters correctly', async () => {
			const { useTracks } = await import('$lib/stores/tracks.svelte');
			const tracks = useTracks();

			// Set a filter
			tracks.setGlobalFilter([{ field: 'type', operator: '=', value: 'exon' }], 'dim');
			expect(tracks.hasActiveFilters()).toBe(true);

			// Clear it
			tracks.clearAllFilters();
			expect(tracks.hasActiveFilters()).toBe(false);
			expect(tracks.globalFilter).toBeNull();
		});
	});
});
