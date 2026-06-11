import { describe, it, expect, beforeEach } from 'vitest';
import { useTracks } from '$lib/stores/tracks.svelte';
import { useAssembly } from '$lib/stores/assembly.svelte';

beforeEach(() => {
	// in-memory localStorage (persistSession may touch it)
	const store = new Map<string, string>();
	const mock = {
		getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
		setItem: (k: string, v: string) => void store.set(k, String(v)),
		removeItem: (k: string) => void store.delete(k),
		clear: () => store.clear(),
		key: () => null,
		get length() {
			return store.size;
		}
	};
	Object.defineProperty(globalThis, 'localStorage', { value: mock, configurable: true });
	Object.defineProperty(window, 'localStorage', { value: mock, configurable: true });
});

describe('track load — chromosome normalization against the assembly', () => {
	it('normalizes a bare "1" BED feature to chr1 on human', async () => {
		const assembly = useAssembly();
		assembly.setAssemblyById('grch38');
		const tracks = useTracks();

		const file = { name: 'test.bed', text: async () => '1\t100\t200\tfeat\t0\t+' } as unknown as File;
		const track = await tracks.addTrackFromFile(file);
		expect(track).toBeTruthy();
		try {
			expect(track!.features[0].chromosome).toBe('chr1');
		} finally {
			tracks.removeTrack(track!.id);
		}
	});

	it('leaves an accession name (E. coli) untouched', async () => {
		const assembly = useAssembly();
		assembly.setAssemblyById('ecoli-k12');
		const tracks = useTracks();

		const file = { name: 'ecoli.bed', text: async () => 'NC_000913.3\t100\t200\tfeat' } as unknown as File;
		const track = await tracks.addTrackFromFile(file);
		expect(track).toBeTruthy();
		try {
			expect(track!.features[0].chromosome).toBe('NC_000913.3');
		} finally {
			tracks.removeTrack(track!.id);
		}
	});
});
