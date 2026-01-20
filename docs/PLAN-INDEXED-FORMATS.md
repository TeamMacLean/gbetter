# Plan: Remote Indexed Format Support

**Status**: COMPLETE - All formats implemented and tested
**Created**: 2026-01-19 (Session 10)
**Updated**: 2026-01-20 (Session 13) - BAM human testing complete
**Priority**: Done (future enhancements tracked below)

## Overview

Add support for additional indexed file formats that can be loaded via URL:

| Format | Extension | Index | Library | Status |
|--------|-----------|-------|---------|--------|
| BigBed | `.bb` | Built-in | `@gmod/bbi` | ✅ Done |
| BigWig | `.bw` | Built-in | `@gmod/bbi` | ✅ Done |
| VCF | `.vcf.gz` | `.tbi` | `@gmod/tabix` + `@gmod/vcf` | ✅ Done (Session 11) |
| GFF | `.gff.gz` | `.tbi` | `@gmod/tabix` + `@gmod/gff` | ✅ Done (Session 11) |
| BED | `.bed.gz` | `.tbi` | `@gmod/tabix` | ✅ Done (Session 11) |
| BAM | `.bam` | `.bai` | `@gmod/bam` | ✅ Done (Session 12) |
| CRAM | `.cram` | `.crai` | `@gmod/cram` | ⚠️ Partial (needs ref seq) |

## Completed Work

### Phase 1: Dependencies ✅
```bash
npm install @gmod/bam @gmod/cram @gmod/tabix @gmod/vcf @gmod/gff
```

### Phase 2: Tabix Support ✅ (Session 11)

**Files created/modified:**
- `src/lib/services/tabix.ts` - Query functions for VCF, GFF, BED
- `src/lib/stores/remoteTracks.svelte.ts` - Added track types: `'vcf' | 'gff' | 'bed'`
- `src/lib/components/Sidebar.svelte` - URL validation for `.vcf.gz`, `.gff.gz`, `.bed.gz`
- `tests/e2e/indexed-formats.test.ts` - E2E tests (3 passing)
- `docs/URL-TRACKS.md` - User documentation

**Test files on R2:**
- `https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.vcf.gz`
- `https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.gff3.gz`
- `https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.bed.gz`

**Test with E. coli K-12 assembly**, region `NC_000913.3:100000-300000`

### Phase 3: BAM/CRAM Support ✅ (Session 12)

**Files created/modified:**
- `src/lib/services/bam.ts` - Query functions for BAM (CRAM partial)
- `src/lib/stores/remoteTracks.svelte.ts` - Added track types: `'bam' | 'cram'`
- `src/lib/components/Sidebar.svelte` - URL validation for `.bam`, `.cram`
- `tests/e2e/indexed-formats.test.ts` - BAM/CRAM tests (2 passing)

**Current BAM rendering:**
- Reads displayed as simple BED-style intervals
- Uses existing interval renderer (same as BigBed)
- No CIGAR visualization yet
- No coverage histogram at zoom-out yet

**CRAM limitations:**
- URL input accepted, track created
- Query returns empty array with console warning
- CRAM requires reference sequence for decoding, which we don't have yet

---

## Human Testing for BAM ✅ (Session 13)

**Status**: COMPLETE

### Test BAM on R2

Created synthetic E. coli K-12 test BAM with 20 reads:
- `https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.bam`
- `https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.bam.bai`

Script: `scripts/bam-test-files/create-bam.sh`

### Test Results

Tested with E. coli K-12 assembly, region `NC_000913.3:100000-101000`:
- ✅ Track appears in sidebar with "bam" type indicator
- ✅ Reads load and display as intervals
- ✅ Panning loads new data in different regions
- ✅ Feature count updates correctly

---

## Future Enhancements

### BAM Rendering Improvements

At different zoom levels:
- **Zoomed out** (>100kb): Coverage histogram (like BigWig signal)
- **Medium zoom** (1kb-100kb): Read density / packed reads
- **Zoomed in** (<1kb): Individual reads with CIGAR visualization

**Priority order:**
1. Coverage histogram (reuse BigWig renderer)
2. Read packing (layout algorithm)
3. CIGAR visualization (mismatches, insertions, deletions)

### CRAM Full Support

CRAM requires reference sequence for some operations:
1. Need to fetch reference FASTA for the assembly
2. Pass reference to CramFile constructor
3. May need to implement reference caching

---

## Definition of Done

- [x] Tabix formats load via URL input (VCF, GFF, BED)
- [x] Data displays correctly in viewport
- [x] Panning loads new data
- [x] Tabix tests pass
- [x] CLAUDE.md updated
- [x] User documentation (docs/URL-TRACKS.md)
- [x] BAM/CRAM load via URL input (URL acceptance)
- [x] BAM tests pass (URL acceptance)
- [x] Human visual test with real BAM data (Session 13)
- [ ] BAM rendering improvements (coverage, CIGAR) - future
- [ ] CRAM full support - future
