# Plan: Remote Indexed Format Support

**Status**: READY TO IMPLEMENT
**Created**: 2026-01-19 (Session 10)
**Priority**: High - extends remote track capabilities

## Overview

Add support for additional indexed file formats that can be loaded via URL:

| Format | Extension | Index | Library | Status |
|--------|-----------|-------|---------|--------|
| BigBed | `.bb` | Built-in | `@gmod/bbi` | ✅ Done |
| BigWig | `.bw` | Built-in | `@gmod/bbi` | ✅ Done |
| BAM | `.bam` | `.bai` | `@gmod/bam` | 🔲 TODO |
| CRAM | `.cram` | `.crai` | `@gmod/cram` | 🔲 TODO |
| VCF | `.vcf.gz` | `.tbi` | `@gmod/tabix` + `@gmod/vcf` | 🔲 TODO |
| GFF | `.gff.gz` | `.tbi` | `@gmod/tabix` + `@gmod/gff` | 🔲 TODO |
| BED | `.bed.gz` | `.tbi` | `@gmod/tabix` | 🔲 TODO |

## Architecture

### Index Discovery Convention

For formats with separate index files:
- **BAM**: `https://example.com/file.bam` → index at `https://example.com/file.bam.bai`
- **CRAM**: `https://example.com/file.cram` → index at `https://example.com/file.cram.crai`
- **Tabix**: `https://example.com/file.vcf.gz` → index at `https://example.com/file.vcf.gz.tbi`

The services should auto-discover index URLs by appending the appropriate suffix.

### Service Structure

```
src/lib/services/
├── bigbed.ts      # ✅ Exists - BigBed support
├── bigwig.ts      # ✅ Exists - BigWig support
├── bam.ts         # 🔲 NEW - BAM/CRAM support
└── tabix.ts       # 🔲 NEW - VCF/GFF/BED tabix support
```

### Track Type Integration

The `remoteTracks.svelte.ts` store needs to support new track types:
- Current: `'bigbed' | 'bigwig'`
- New: `'bigbed' | 'bigwig' | 'bam' | 'cram' | 'vcf' | 'gff' | 'bed'`

## Implementation Phases

### Phase 1: Install Dependencies

```bash
npm install @gmod/bam @gmod/cram @gmod/tabix @gmod/vcf @gmod/gff
```

### Phase 2: Tabix Support (VCF/GFF/BED)

**Why first**: We already have renderers for VCF, GFF, and BED from local file support. Tabix just provides remote indexed access to the same data.

#### 2.1 Create `src/lib/services/tabix.ts`

```typescript
/**
 * Tabix Remote Track Service
 *
 * Supports remote indexed files:
 * - .vcf.gz + .tbi (variants)
 * - .gff.gz + .tbi (gene models)
 * - .bed.gz + .tbi (intervals)
 */

import { TabixIndexedFile } from '@gmod/tabix';
import { RemoteFile } from 'generic-filehandle2';
import VCF from '@gmod/vcf';
import gff from '@gmod/gff';

// Query functions:
// - queryTabixVcf(url, chrom, start, end, options?) → VcfFeature[]
// - queryTabixGff(url, chrom, start, end, options?) → GffFeature[]
// - queryTabixBed(url, chrom, start, end, options?) → BedFeature[]

// Each function should:
// 1. Auto-discover index URL (url + '.tbi')
// 2. Cache TabixIndexedFile handles
// 3. Query the region
// 4. Parse results with appropriate parser
// 5. Convert to our internal feature types
```

#### 2.2 Update `remoteTracks.svelte.ts`

Add cases for `'vcf' | 'gff' | 'bed'` track types in:
- `fetchTrackFeatures()` - call appropriate tabix query function
- Type definitions

#### 2.3 Update `Sidebar.svelte`

Extend URL validation to accept:
```typescript
if (lowerUrl.endsWith('.vcf.gz')) trackType = 'vcf';
if (lowerUrl.endsWith('.gff.gz') || lowerUrl.endsWith('.gff3.gz')) trackType = 'gff';
if (lowerUrl.endsWith('.bed.gz')) trackType = 'bed';
```

#### 2.4 Rendering

Reuse existing renderers:
- VCF → `renderVariantFeatures()` (already exists for local VCF)
- GFF → `renderBedFeatures()` with gene model theme (already exists)
- BED → `renderBedFeatures()` (already exists)

### Phase 3: BAM/CRAM Support

**More complex**: Requires new rendering logic for read alignments.

#### 3.1 Create `src/lib/services/bam.ts`

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
// 1. Auto-discover index URL
// 2. Cache file handles
// 3. Query region
// 4. Convert BAM records to ReadFeature
// 5. Optionally compute coverage summary for zoomed-out views
```

#### 3.2 BAM Rendering Options

At different zoom levels:
- **Zoomed out** (>100kb): Coverage histogram (like BigWig signal)
- **Medium zoom** (1kb-100kb): Read density / packed reads
- **Zoomed in** (<1kb): Individual reads with CIGAR visualization

Start with coverage-only for simplicity, add read rendering later.

#### 3.3 Update `TrackView.svelte`

Add `renderBamFeatures()` function for read visualization.

## Testing Strategy (TDD + Ralph Loop)

### Pattern: Write Failing Test First

For each format:
1. Write e2e test that loads a public URL
2. Verify test FAILS (format not yet supported)
3. Use Ralph Loop to implement until test passes

### Test File: `tests/e2e/indexed-formats.test.ts`

```typescript
import { test, expect } from '@playwright/test';

// Public test URLs (stable, CORS-enabled)
const TEST_URLS = {
  vcf: 'https://ftp.ensembl.org/pub/release-110/variation/vcf/homo_sapiens/homo_sapiens-chr22.vcf.gz',
  // Find stable public URLs for each format
};

test.describe('Tabix Format Support', () => {
  test('VCF.gz loads via URL input', async ({ page }) => {
    await page.goto('/');

    // Click URL tab
    await page.click('button:has-text("URL")');

    // Enter VCF URL
    await page.fill('input[type="url"]', TEST_URLS.vcf);
    await page.click('button:has-text("+")');

    // Wait for track to appear and load data
    await expect(page.getByText(/vcf/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/\d+ features/)).toBeVisible({ timeout: 30000 });
  });
});

test.describe('BAM Format Support', () => {
  test('BAM loads via URL input', async ({ page }) => {
    // Similar pattern
  });
});
```

### Ralph Loop Commands

#### For Tabix Support:
```bash
/ralph-loop "Implement tabix support for remote VCF/GFF/BED files.

## Current State
- BigBed/BigWig work via URL input in sidebar
- Need to add .vcf.gz, .gff.gz, .bed.gz support

## Tasks
1. npm install @gmod/tabix @gmod/vcf @gmod/gff (if not already)
2. Create src/lib/services/tabix.ts with query functions
3. Update src/lib/stores/remoteTracks.svelte.ts for new track types
4. Update src/lib/components/Sidebar.svelte URL validation
5. Ensure rendering reuses existing VCF/GFF/BED renderers

## Verification
npx playwright test indexed-formats.test.ts
Must show: all tabix tests pass

## Success Criteria
Can paste a .vcf.gz URL in sidebar and see variant features load." \
  --completion-promise "TABIX-COMPLETE" \
  --max-iterations 20
```

#### For BAM Support:
```bash
/ralph-loop "Implement BAM/CRAM support for remote alignment files.

## Current State
- Tabix formats (VCF/GFF/BED) should be working
- Need to add .bam and .cram support

## Tasks
1. npm install @gmod/bam @gmod/cram (if not already)
2. Create src/lib/services/bam.ts with query functions
3. Update remoteTracks.svelte.ts for bam/cram track types
4. Update Sidebar.svelte URL validation for .bam/.cram
5. Add renderBamFeatures() to TrackView.svelte (start with coverage view)

## Verification
npx playwright test indexed-formats.test.ts
Must show: all BAM tests pass

## Success Criteria
Can paste a .bam URL in sidebar and see coverage/reads load." \
  --completion-promise "BAM-COMPLETE" \
  --max-iterations 25
```

## Public Test URLs

Need to find stable, CORS-enabled URLs for testing. Options:

### VCF
- Ensembl FTP: `https://ftp.ensembl.org/pub/release-110/variation/vcf/...`
- 1000 Genomes: Check if CORS-enabled

### BAM
- ENCODE: Has public BAM files
- 1000 Genomes: Has BAM files but may need CORS proxy

### GFF
- Ensembl: Has GFF3 files
- UCSC: Some resources

**Note**: If CORS is an issue, may need to use our own R2 bucket for test files.

## Files to Create/Modify

### New Files
- `src/lib/services/tabix.ts`
- `src/lib/services/bam.ts`
- `tests/e2e/indexed-formats.test.ts`

### Modified Files
- `src/lib/stores/remoteTracks.svelte.ts` - add track types
- `src/lib/components/Sidebar.svelte` - URL validation
- `src/lib/components/TrackView.svelte` - BAM rendering
- `package.json` - new dependencies

## Complexity Notes

### Tabix (Medium)
- Straightforward: query + parse + render with existing renderers
- Main challenge: finding stable test URLs

### BAM/CRAM (High)
- New rendering logic for reads
- Multiple zoom levels (coverage vs reads)
- CIGAR visualization is complex
- Consider starting with coverage-only view

## Rollback Plan

If issues arise, each format is independent:
- Tabix formats can ship without BAM
- Individual tabix formats (VCF/GFF/BED) can ship independently

## Definition of Done

- [ ] All new formats load via URL input
- [ ] Data displays correctly in viewport
- [ ] Panning loads new data (already fixed in Session 10)
- [ ] Tests pass
- [ ] CLAUDE.md updated with new format support
