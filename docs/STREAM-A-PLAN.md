# Stream A Plan: Mouse Genomes & GenArk Testing

**Branch:** `fix/mouse-genomes`
**Status:** Planning
**Date:** 2026-01-15

## Objective

Fix the mm39/mm10 gene tracks that return HTTP 200 but don't display genes, and verify all GenArk genome tracks work correctly.

## Scope

### In Scope
1. **Fix mm39/mm10 gene tracks** - Debug why UCSC URLs return 200 but genes don't display
2. **Test all GenArk genomes** - Verify dm6, rn7, ce11, danRer11, sacCer3, galGal6 work correctly

### Out of Scope (Stream B handles these)
- Gene model theme styling
- Changes to rendering in `TrackView.svelte`
- Documentation updates to `scripts/gene-tracks/README.md`

## Files to Modify

| File | Purpose |
|------|---------|
| `src/lib/services/bigbed.ts` | Fix/update UCSC URLs, debug data fetching |
| `src/lib/stores/remoteTracks.svelte.ts` | Debug data loading issues if needed |

## Files to READ (not modify)
- `src/lib/components/TrackView.svelte` - Understand how data flows to rendering
- `src/lib/data/assemblies.json` - Genome definitions

## Current State

From CLAUDE.md:
> **Known issues**: mm39/mm10 not loading - needs investigation.

The URLs return HTTP 200, but genes don't display. This could be:
1. Wrong BigBed file format/schema
2. Coordinate system mismatch
3. Data parsing issue
4. Empty results for queried regions

## Investigation Strategy

### Phase 1: Reproduce and diagnose
1. Load mm39 or mm10 assembly in the browser
2. Check browser console for errors
3. Add logging to `bigbed.ts` to see what data is returned
4. Compare with working genomes (e.g., GRCh38)

### Phase 2: Identify root cause
Possible causes to investigate:
- URL correctness (is the BigBed file the right one?)
- BigBed schema differences (different field structure?)
- Chromosome naming (chr1 vs 1?)
- Query region validity

### Phase 3: Fix
Apply fix based on findings - likely URL update or data parsing adjustment.

### Phase 4: Verify GenArk genomes
Test each genome systematically:
- [ ] dm6 (Drosophila)
- [ ] rn7 (Rat)
- [ ] ce11 (C. elegans)
- [ ] danRer11 (Zebrafish)
- [ ] sacCer3 (Yeast)
- [ ] galGal6 (Chicken)

## Git Workflow

```bash
# Create branch
git checkout -b fix/mouse-genomes

# Work, commit frequently
git add -A && git commit -m "description"

# When done, push (human will merge)
git push -u origin fix/mouse-genomes
```

## Success Criteria

- [ ] mm39 gene tracks load and display correctly
- [ ] mm10 gene tracks load and display correctly
- [ ] All 6 GenArk genomes verified working
- [ ] No regressions in other assemblies

## Coordination with Stream B

**Do not modify:**
- `src/lib/components/TrackView.svelte` (Stream B is working on theme rendering)
- `src/lib/services/trackTypes/geneModel.ts` (Stream B's domain)

If changes to these files become necessary, coordinate with Stream B before proceeding.

## Useful Commands

```bash
# Run dev server
npm run dev

# Check TypeScript
npm run check
```

## Debug Tips

- Browser DevTools Network tab to inspect BigBed requests
- Console logging in `bigbed.ts` `queryBigBed()` function
- Compare request/response between working (GRCh38) and broken (mm39) assemblies