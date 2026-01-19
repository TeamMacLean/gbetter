# Plan: Remote Indexed Format Support

**Status**: PHASE 2 COMPLETE - Tabix done, BAM/CRAM remaining
**Created**: 2026-01-19 (Session 10)
**Updated**: 2026-01-19 (Session 11) - Tabix implemented
**Priority**: Medium - BAM/CRAM extends capabilities further

## Overview

Add support for additional indexed file formats that can be loaded via URL:

| Format | Extension | Index | Library | Status |
|--------|-----------|-------|---------|--------|
| BigBed | `.bb` | Built-in | `@gmod/bbi` | ✅ Done |
| BigWig | `.bw` | Built-in | `@gmod/bbi` | ✅ Done |
| VCF | `.vcf.gz` | `.tbi` | `@gmod/tabix` + `@gmod/vcf` | ✅ Done (Session 11) |
| GFF | `.gff.gz` | `.tbi` | `@gmod/tabix` + `@gmod/gff` | ✅ Done (Session 11) |
| BED | `.bed.gz` | `.tbi` | `@gmod/tabix` | ✅ Done (Session 11) |
| BAM | `.bam` | `.bai` | `@gmod/bam` | 🔲 TODO |
| CRAM | `.cram` | `.crai` | `@gmod/cram` | 🔲 TODO |

## Completed Work (Session 11)

### Phase 1: Dependencies ✅
```bash
npm install @gmod/bam @gmod/cram @gmod/tabix @gmod/vcf @gmod/gff
```

### Phase 2: Tabix Support ✅

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

---

## Remaining Work: Phase 3 - BAM/CRAM Support

**More complex**: Requires new rendering logic for read alignments.

### 3.1 Create `src/lib/services/bam.ts`

```typescript
/**
 * BAM/CRAM Remote Track Service
 *
 * Supports:
 * - .bam + .bai (BAM alignments)
 * - .cram + .crai (CRAM alignments)
 */

import { BamFile } from '@gmod/bam';
import { CramFile } from '@gmod/cram';
import { RemoteFile } from 'generic-filehandle2';

interface ReadFeature {
  id: string;
  chromosome: string;
  start: number;
  end: number;
  name: string;        // Read name
  strand: '+' | '-';
  cigar: string;
  mapq: number;
  sequence?: string;   // Optional, for high zoom
  // ... other BAM fields
}

// Query function:
// - queryBam(url, chrom, start, end, options?) → ReadFeature[]
// - queryCram(url, chrom, start, end, options?) → ReadFeature[]

// Should handle:
// 1. Auto-discover index URL (.bai for BAM, .crai for CRAM)
// 2. Cache file handles
// 3. Query region
// 4. Convert BAM records to ReadFeature
// 5. Optionally compute coverage summary for zoomed-out views
```

### 3.2 BAM Rendering Options

At different zoom levels:
- **Zoomed out** (>100kb): Coverage histogram (like BigWig signal)
- **Medium zoom** (1kb-100kb): Read density / packed reads
- **Zoomed in** (<1kb): Individual reads with CIGAR visualization

**Recommendation**: Start with coverage-only for simplicity, add read rendering later.

### 3.3 Update Files

1. `src/lib/stores/remoteTracks.svelte.ts` - Add `'bam' | 'cram'` track types
2. `src/lib/components/Sidebar.svelte` - Accept `.bam`, `.cram` extensions
3. `src/lib/components/TrackView.svelte` - Add `renderBamFeatures()` function

### 3.4 Tests

Update `tests/e2e/indexed-formats.test.ts` - BAM tests already exist but are failing (expected).

### Ralph Loop Command for BAM

```bash
/ralph-loop "Implement BAM/CRAM support for remote alignment files.

## Current State
- Tabix formats (VCF/GFF/BED) are working (Session 11)
- Need to add .bam and .cram support
- Dependencies already installed: @gmod/bam @gmod/cram

## Tasks
1. Create src/lib/services/bam.ts with query functions
2. Update remoteTracks.svelte.ts for bam/cram track types
3. Update Sidebar.svelte URL validation for .bam/.cram
4. Add renderBamFeatures() to TrackView.svelte (start with coverage view)

## Verification
npx playwright test indexed-formats.test.ts --grep BAM
Must show: BAM tests pass

## Success Criteria
Can paste a .bam URL in sidebar and see coverage/reads load." \
  --completion-promise "BAM-COMPLETE" \
  --max-iterations 25
```

## Test URLs for BAM

Need CORS-enabled BAM files. Options:
- Create small test BAM and upload to R2 (like we did for tabix)
- Find public CORS-enabled BAM (ENCODE, 1000 Genomes may work)

**Script to create test BAM**: Would need `samtools` to create a small test file.

## Complexity Notes

### BAM/CRAM (High)
- New rendering logic for reads
- Multiple zoom levels (coverage vs reads)
- CIGAR visualization is complex
- Consider starting with coverage-only view
- CRAM may need reference sequence for some operations

## Definition of Done

- [x] Tabix formats load via URL input (VCF, GFF, BED)
- [x] Data displays correctly in viewport
- [x] Panning loads new data
- [x] Tabix tests pass
- [x] CLAUDE.md updated
- [x] User documentation (docs/URL-TRACKS.md)
- [ ] BAM/CRAM load via URL input
- [ ] BAM rendering (at least coverage view)
- [ ] BAM tests pass
