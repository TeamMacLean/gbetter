# Stream B Plan: BigBed Theme Support

**Branch:** `feature/bigbed-themes`
**Status:** Implementation Complete - Testing
**Date:** 2026-01-15

## Objective

Apply the existing gene model theme system (dark/flat styling with glows, gradients, peaked introns, inner chevrons) to remote BigBed gene/transcript tracks. Currently these themes only apply to local GFF3 files.

## Scope

### In Scope
1. **Apply gene model themes to BigBed tracks** - Main feature
2. **Update README stats** - Documentation cleanup in `scripts/gene-tracks/README.md`

### Out of Scope (Stream A handles these)
- Fix mm39/mm10 gene tracks
- Test GenArk genomes (dm6, rn7, ce11, danRer11, sacCer3, galGal6)
- Changes to `bigbed.ts` URL mappings
- Changes to `remoteTracks.svelte.ts` data fetching logic

## Files to Modify

| File | Purpose |
|------|---------|
| `src/lib/components/TrackView.svelte` | Integrate theme rendering for BigBed tracks |
| `src/lib/services/trackTypes/geneModel.ts` | May need to export/refactor theme rendering functions |
| `scripts/gene-tracks/README.md` | Update file sizes table |

## Files to READ (not modify)
- `src/lib/stores/remoteTracks.svelte.ts` - Understand BigBed data structure
- `src/lib/services/bigbed.ts` - Understand feature format from BigBed

## Current State Analysis

### How local GFF3 themes work
The theme system in `geneModel.ts` provides:
- **Dark theme**: Glows, gradients, peaked introns (GBrowse hat style)
- **Flat theme**: FlatUI colors, no gradients, peaked introns
- Inner chevrons showing strand direction
- Theme is selected via sidebar "Gene Style" buttons

### How BigBed tracks currently render
BigBed tracks are rendered in `TrackView.svelte` but likely use basic rectangle rendering without the theme system.

### Gap
The theme rendering logic needs to be applied to BigBed features, not just parsed GFF3 features.

## Implementation Strategy

### Phase 1: Understand current rendering
1. Read `TrackView.svelte` to find where BigBed tracks are rendered
2. Read `geneModel.ts` to understand theme rendering API
3. Identify the data structure differences between GFF3 features and BigBed features

### Phase 2: Refactor theme rendering (if needed)
1. Extract theme rendering into reusable functions if currently coupled to GFF3 structure
2. Create adapter to map BigBed feature format to theme renderer expectations

### Phase 3: Integrate
1. Apply theme rendering to BigBed gene tracks in `TrackView.svelte`
2. Ensure theme switching (dark/flat) works for BigBed tracks
3. Test with multiple assemblies

### Phase 4: Documentation
1. Update `scripts/gene-tracks/README.md` file sizes table
2. Update CLAUDE.md to mark task complete

## Git Workflow

```bash
# Create branch
git checkout -b feature/bigbed-themes

# Work, commit frequently
git add -A && git commit -m "description"

# When done, push (human will merge)
git push -u origin feature/bigbed-themes
```

## Success Criteria

- [ ] BigBed gene tracks render with dark theme styling (glows, gradients, peaked introns)
- [ ] BigBed gene tracks render with flat theme styling when switched
- [ ] Inner chevrons show strand direction on BigBed tracks
- [ ] Theme switching via sidebar works for BigBed tracks
- [ ] README file sizes table is accurate
- [ ] No regressions in local GFF3 track rendering

## Coordination with Stream A

**Do not modify:**
- `src/lib/services/bigbed.ts` (Stream A may fix URLs)
- `src/lib/stores/remoteTracks.svelte.ts` (Stream A may debug data loading)

If changes to these files become necessary, coordinate with Stream A before proceeding.

## Notes

- BigBed features may have different field structure than GFF3 - need to map appropriately
- The "Genes" track (simple blocks) vs "Transcripts" track (exon structure) may need different handling
- Theme state is likely in a store - need to access it from rendering code