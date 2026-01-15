# Session 5 Handoff - Gene Tracks Still Broken

**Date**: 2026-01-15
**Status**: STUCK - Gene tracks not rendering despite multiple fix attempts

## Current Problem

Gene tracks are NOT displaying in the browser at localhost:5173, even though:
1. The BigBed URLs are correct (verified via rclone)
2. Case-insensitive lookup was added
3. Assembly switching triggers viewport updates
4. Theme system imports are in place

## What Was Tried This Session

1. **Found missing R2 URLs** - Added 6 missing genomes (iwgsc-refseq2, morex-v3, zm-b73-nam5, puccinia, zymoseptoria, phytophthora) to `GENE_BIGBED_URLS`

2. **Case-insensitive lookup** - Fixed `hasGeneBigBed()` and `getGeneBigBedUrl()` to use case-insensitive matching

3. **Assembly switching** - Added `remoteTracks.updateForViewport()` call after `setupGeneTrackForAssembly()`

4. **Theme system** - Exported theme helpers from geneModel.ts, imported into TrackView.svelte

## Key Files

- `src/lib/services/bigbed.ts` - URL mapping and BigBed queries
- `src/lib/stores/remoteTracks.svelte.ts` - Remote track state management
- `src/lib/components/TrackView.svelte` - Canvas rendering

## Debugging Needed

The previous session found that `visibleRemoteTracks` was returning empty array `Array(0)`. Need to trace:

1. Is `setupGeneTrackForAssembly()` being called?
2. Is `hasGeneBigBed()` returning true for the assembly?
3. Is `addRemoteTrack()` actually adding the track?
4. Is the track marked as `visible: true`?
5. Are features being fetched from the BigBed file?
6. Is `renderBedFeatures()` being called with features?

## Add Console Logging

In `remoteTracks.svelte.ts`:
```typescript
function setupGeneTrackForAssembly(assemblyId: string): void {
    console.log('setupGeneTrackForAssembly:', assemblyId);
    console.log('hasGeneBigBed:', hasGeneBigBed(assemblyId));
    console.log('getGeneBigBedUrl:', getGeneBigBedUrl(assemblyId));
    // ... rest of function
}
```

In `TrackView.svelte`:
```typescript
// In the render effect
console.log('visibleRemoteTracks:', remoteTracks.visible.length, remoteTracks.visible);
console.log('all remoteTracks:', remoteTracks.all);
```

## Known Working State

According to CLAUDE.md Session 4 notes, gene tracks WERE working:
- "UCSC Known Genes auto-load for GRCh38/GRCh37 assemblies"
- "Sidebar shows remote tracks with visibility toggle, gene count"

Something broke between Session 4 and now.

## Git Status

```
main branch, 4 commits ahead of origin/main
Last commit: 080dd5f "Add R2-hosted gene tracks and fix assembly switching"
```

## Suggestion for Next Agent

1. Start fresh - read the actual current code, don't trust the summary
2. Add extensive console.log debugging to trace the data flow
3. Check browser console for errors (CORS, 404, etc.)
4. The issue is likely in the reactive chain between assembly change → track creation → feature fetch → render

## Files to Read First

1. `src/lib/stores/remoteTracks.svelte.ts` - The store that manages remote tracks
2. `src/lib/components/TrackView.svelte` - Where rendering happens
3. `src/lib/services/bigbed.ts` - BigBed URL mapping and queries
