# Parallel Work Questions for Indexed File Support

## Context

We have a 7-phase plan for comprehensive indexed file support (BigWig, BAM, Tabix, FASTA). The plan is saved at `.claude/plans/reflective-riding-bear.md`.

Total estimated effort: 16-23 days.

## Parallelization Analysis

### Work Stream Dependencies

| Work Stream | Phases | Dependencies |
|-------------|--------|--------------|
| **A: Foundation** | 1 (BigWig) → 2 (Refactor) | None - must go first |
| **B: UI** | 6 (URL Modal) | Can start after Phase 2 types defined |
| **C: BAM** | 3 | After Phase 2 |
| **D: Tabix** | 4 | After Phase 2 |
| **E: FASTA** | 5 | After Phase 2 |
| **F: Local Files** | 7 | After C, D, E |

### Parallel Opportunities

- After Phase 2 completes, Phases 3/4/5/6 could theoretically run in parallel
- Each format (BAM, Tabix, FASTA) is relatively isolated in its service file
- But they all touch `TrackView.svelte` for rendering - potential conflict point

### Multi-Agent Challenges

1. **Shared files** - TrackView.svelte, types/genome.ts, the new indexedTracks store
2. **Interface agreements** - Need to define types/contracts before parallel work
3. **Merge conflicts** - Multiple agents editing same files simultaneously

## Questions to Answer

1. **Do you have multiple Claude Code sessions available?** Or thinking about sequential sessions picking up different pieces?

2. **Preferred coordination approach:**
   - **Sequential with handoffs** - One agent does Phase 1+2, documents interfaces, next agent picks up a format
   - **Feature branches** - Each agent works on a git branch, manual merge later
   - **Interface-first** - Define all types/interfaces in Phase 2, then parallelize implementations with clear boundaries

3. **Which phases are highest priority?** If we can only do some in parallel, which formats matter most?
   - BAM (most complex, most requested?)
   - Tabix VCF (large variant files?)
   - BigWig (signal data?)
   - FASTA (reference sequence?)

4. **Risk tolerance for merge conflicts?** Parallel work will likely cause conflicts in shared files. Are you comfortable resolving these manually?

## Suggested Approach

If parallelizing:

1. **Phase 1+2 first** (single agent) - Establish foundation, define ALL interfaces
2. **Document contracts** - Create `src/lib/services/indexed/types.ts` with all feature types, render function signatures
3. **Assign formats** - Each subsequent agent gets one format + its renderer, works in isolation
4. **Final integration** (single agent) - Merge all renderers into TrackView.svelte, resolve conflicts

This minimizes conflicts by doing the shared infrastructure first, then isolated implementations.
