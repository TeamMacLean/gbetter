/**
 * Bundled example data for one-click "Load example" onboarding.
 *
 * The files are imported as raw text (Vite `?raw`), so loading is instant and
 * works offline — no download, no network. They flow through the exact same
 * parse path as a user's own file.
 */
import genesGff from './genes.gff3?raw';
import variantsVcf from './variants.vcf?raw';

export interface ExampleFile {
	/** Display name; the track name is this with the extension stripped. */
	name: string;
	content: string;
}

/** The example tracks: a handful of cancer genes and variants on them. */
export const EXAMPLE_FILES: ExampleFile[] = [
	{ name: 'Example genes.gff3', content: genesGff },
	{ name: 'Example variants.vcf', content: variantsVcf }
];

/** Example data is human GRCh38. */
export const EXAMPLE_ASSEMBLY_ID = 'grch38';

/** Where to land after loading — TP53, where genes and variants are visible. */
export const EXAMPLE_LOCUS = { chromosome: 'chr17', start: 7657913, end: 7691411 };

/** A query to suggest in the post-load nudge. */
export const EXAMPLE_QUERY_HINT = 'which genes here have variants?';
