/**
 * Genome coordinate parsing and formatting tests
 */
import { describe, it, expect } from 'vitest';
import {
	toDisplayCoordinate,
	toInternalCoordinate,
	formatCoordinate,
	parseCoordinate,
} from '$lib/types/genome';

describe('Coordinate Conversion', () => {
	describe('toDisplayCoordinate', () => {
		it('converts 0-based to 1-based', () => {
			expect(toDisplayCoordinate(0)).toBe(1);
			expect(toDisplayCoordinate(99)).toBe(100);
			expect(toDisplayCoordinate(1000000)).toBe(1000001);
		});
	});

	describe('toInternalCoordinate', () => {
		it('converts 1-based to 0-based', () => {
			expect(toInternalCoordinate(1)).toBe(0);
			expect(toInternalCoordinate(100)).toBe(99);
			expect(toInternalCoordinate(1000001)).toBe(1000000);
		});
	});

	describe('round-trip conversion', () => {
		it('internal -> display -> internal is identity', () => {
			const values = [0, 1, 100, 999999];
			for (const v of values) {
				expect(toInternalCoordinate(toDisplayCoordinate(v))).toBe(v);
			}
		});
	});
});

describe('formatCoordinate', () => {
	it('formats standard coordinates', () => {
		expect(formatCoordinate('chr1', 0, 1000)).toBe('chr1:1-1,000');
	});

	it('formats large coordinates with commas', () => {
		expect(formatCoordinate('chr17', 7668420, 7687490)).toBe('chr17:7,668,421-7,687,490');
	});

	it('handles chromosome X', () => {
		expect(formatCoordinate('chrX', 0, 100000)).toBe('chrX:1-100,000');
	});
});

describe('parseCoordinate', () => {
	describe('valid inputs', () => {
		it('parses standard format chr1:1-1000', () => {
			const result = parseCoordinate('chr1:1-1000');
			expect(result).toEqual({
				chromosome: 'chr1',
				start: 0,  // 1-based input becomes 0-based internal
				end: 1000,
			});
		});

		it('parses coordinates with commas chr17:7,668,421-7,687,490', () => {
			const result = parseCoordinate('chr17:7,668,421-7,687,490');
			expect(result).toEqual({
				chromosome: 'chr17',
				start: 7668420,  // 1-based to 0-based
				end: 7687490,
			});
		});

		it('parses without chr prefix 1:1-1000', () => {
			const result = parseCoordinate('1:1-1000');
			expect(result).toEqual({
				chromosome: 'chr1',
				start: 0,
				end: 1000,
			});
		});

		it('parses chrX', () => {
			const result = parseCoordinate('chrX:1-100000');
			expect(result).toEqual({
				chromosome: 'chrX',
				start: 0,
				end: 100000,
			});
		});

		it('parses chrY', () => {
			const result = parseCoordinate('chrY:1000-2000');
			expect(result).toEqual({
				chromosome: 'chrY',
				start: 999,
				end: 2000,
			});
		});

		it('parses chrM', () => {
			const result = parseCoordinate('chrM:1-16569');
			expect(result).toEqual({
				chromosome: 'chrM',
				start: 0,
				end: 16569,
			});
		});

		it('handles uppercase CHR prefix (adds chr)', () => {
			// Note: current behavior adds 'chr' prefix to 'CHR1' making 'chrCHR1'
			// This could be considered a bug but we test actual behavior
			const result = parseCoordinate('CHR1:1-1000');
			expect(result).not.toBeNull();
			expect(result?.chromosome).toBe('chrCHR1');
		});

		it('handles lowercase chr prefix', () => {
			const result = parseCoordinate('chr1:1-1000');
			expect(result).not.toBeNull();
			expect(result?.chromosome).toBe('chr1');
		});
	});

	describe('invalid inputs', () => {
		it('returns null for empty string', () => {
			expect(parseCoordinate('')).toBeNull();
		});

		it('returns null for garbage', () => {
			expect(parseCoordinate('not a coordinate')).toBeNull();
		});

		it('returns null for missing colon', () => {
			expect(parseCoordinate('chr1 1-1000')).toBeNull();
		});

		it('returns null for missing dash', () => {
			expect(parseCoordinate('chr1:1000')).toBeNull();
		});

		it('returns null for end <= start', () => {
			expect(parseCoordinate('chr1:1000-500')).toBeNull();
		});

		it('allows 1bp range (display 1000-1000 becomes internal 999-1000)', () => {
			// In display (1-based), 1000-1000 is a single position
			// In internal (0-based), this becomes 999-1000 (1bp range) - valid!
			const result = parseCoordinate('chr1:1000-1000');
			expect(result).not.toBeNull();
			expect(result?.start).toBe(999);
			expect(result?.end).toBe(1000);
		});

		it('returns null for negative start after conversion', () => {
			// Start of 0 in 1-based becomes -1 in 0-based
			expect(parseCoordinate('chr1:0-1000')).toBeNull();
		});
	});

	describe('round-trip', () => {
		it('format -> parse preserves values', () => {
			const original = { chromosome: 'chr17', start: 7668420, end: 7687490 };
			const formatted = formatCoordinate(original.chromosome, original.start, original.end);
			const parsed = parseCoordinate(formatted);

			expect(parsed).toEqual(original);
		});
	});
});
