# CLAUDE.md - GBetter Genome Browser

## Project Overview
A modern, lightweight genome browser. Fast, beautiful, AI-native.

**Status**: Active development, Session 10 (2026-01-19) - Remote track panning bug FIXED

## Key Design Principles
1. **Fast by default** - Sub-second load, 60fps interactions
2. **AI-native** - Natural language as first-class input, but REPRODUCIBLE
3. **Web-first** - No install, shareable URLs
4. **Beautiful** - Dark mode, modern aesthetics, themeable gene models
5. **Species-agnostic** - Works for any genome (27+ assemblies built-in)

## Tech Stack
- **Language**: TypeScript (strict)
- **Framework**: Svelte 5 + SvelteKit
- **Rendering**: Canvas (tracks) + SVG (overlays)
- **Styling**: Tailwind CSS
- **Build**: Vite
- **AI**: Pluggable (Claude/OpenAI with provider abstraction)

## Feature Status

### ✅ Complete

**Core Browser**
- Dark theme UI with header, sidebar, canvas viewport
- Pan (drag) and zoom (scroll wheel) on canvas
- Coordinate input with navigation
- Track type registry (extensible architecture)
- Drag-and-drop file loading
- Keyboard shortcuts (Cmd+` for query console)

**Track Types**
- BED (intervals) - BED3-BED12 support
- GFF3 (gene models) - Parent-child linking, themeable rendering
- bedGraph (signal) - Peak/coverage visualization
- VCF (variants) - Zoom-dependent rendering

**Gene Model Themes**
- Theme system with switchable styles (sidebar "Gene Style" buttons)
- **Dark theme** (default): Glows, gradients, peaked introns (GBrowse hat style)
- **Flat theme**: FlatUI colors, no gradients, peaked introns
- Inner chevrons showing strand direction

**AI Integration**
- Multi-provider support: Claude (Sonnet 4, Haiku, Opus 4) and OpenAI (GPT-4o, etc.)
- Settings panel with API key storage, model selection, connection test
- Natural language → GQL translation with context awareness
- Scope clarification (AI asks when view/chromosome/global is ambiguous)
- Fallback to regex-based translation when AI unavailable

**Query System (GQL)**
- Commands: NAVIGATE, SEARCH, ZOOM, PAN, LIST, SELECT, FILTER, HIGHLIGHT, CLEAR
- SELECT with WHERE, ORDER BY, LIMIT, FROM track, INTERSECT, WITHIN
- FILTER dims/hides features by attributes (type, strand, etc.)
- HIGHLIGHT draws semi-transparent overlay on genomic regions
- Query history with localStorage persistence (max 50)
- Save/load named queries
- Export/import .gql files
- Shareable URLs with encoded queries (?gql=...)
- Query console (Cmd+`) with results table, history panel

**State Persistence**
- URL state: `?chr=chr17&start=7668421&end=7687490` or `?loc=chr17:7668421-7687490`
- localStorage session restore with banner prompt
- Track metadata persistence (re-upload files on restore)

**Assembly System**
- 27+ built-in assemblies grouped by species:
  - Human: GRCh38, GRCh37, T2T-CHM13
  - Mouse: mm39, mm10
  - Plants: Arabidopsis, Rice, Maize, Wheat, Barley
  - Pathogens: Botrytis, Magnaporthe, Puccinia, Zymoseptoria, Phytophthora
  - Microbes: E. coli K-12, SARS-CoV-2, S. pombe
  - Model organisms: Zebrafish, C. elegans, Drosophila, Yeast
- Chromosome inference from loaded data
- Custom .chrom.sizes file loading
- Chromosome name normalization and aliases

**Data Validation**
- Chromosome mismatch warnings when loading tracks
- Suggests switching assemblies or using "inferred from data"

### 🔲 Not Yet Implemented

- **BAM support** - Indexed reads, complex
- **FASTA support** - Sequence display at high zoom
- **Comparison views** - Side-by-side query results
- **AI conversation follow-ups** - Reply to clarification questions

## Architecture Patterns

### Track Type Registry
```typescript
// Add new track types without touching core code
registerTrackType({
  id: 'my-type',
  extensions: ['ext'],
  parse: (content) => ({ features, errors }),
  render: (features, context) => { /* canvas */ },
});
```

### Gene Model Themes
```typescript
// Switch themes programmatically
import { setGeneModelTheme, getGeneModelThemes } from '$lib/services/trackTypes/geneModel';
setGeneModelTheme('flat'); // or 'dark'
```

### State Management (Svelte 5 Runes)
```typescript
// viewport.svelte.ts
let viewport = $state<Viewport>({ chr: 'chr1', start: 0, end: 100000 });
const width = $derived(viewport.end - viewport.start);
```

### Coordinate System
- **Internal**: 0-based, half-open (like BED, BAM)
- **Display**: 1-based (genomics convention)
- **GFF3 → Internal**: Subtract 1 from start

## Project Structure
```
src/
├── lib/
│   ├── components/
│   │   ├── Header.svelte           # Assembly selector, coordinate input
│   │   ├── SearchBar.svelte        # Natural language + GQL input
│   │   ├── Sidebar.svelte          # Track list, theme selector
│   │   ├── TrackView.svelte        # Canvas viewport
│   │   ├── QueryConsole.svelte     # GQL console (Cmd+`)
│   │   ├── AISettings.svelte       # Provider/key configuration
│   │   └── SessionRestoreBanner.svelte
│   ├── stores/
│   │   ├── viewport.svelte.ts      # Pan, zoom, URL sync
│   │   ├── tracks.svelte.ts        # Track loading, validation
│   │   ├── assembly.svelte.ts      # Genome assemblies
│   │   └── queryHistory.svelte.ts  # Query history
│   ├── services/
│   │   ├── ai/
│   │   │   ├── index.ts            # Provider abstraction
│   │   │   ├── anthropic.ts        # Claude integration
│   │   │   ├── openai.ts           # OpenAI integration
│   │   │   └── prompt.ts           # System prompts
│   │   ├── queryLanguage.ts        # GQL parser/executor
│   │   ├── savedQueries.ts         # Query persistence
│   │   ├── persistence.ts          # Session storage
│   │   ├── trackRegistry.ts        # Track type system
│   │   └── trackTypes/
│   │       ├── geneModel.ts        # GFF3 + themes
│   │       ├── intervals.ts        # BED
│   │       ├── signal.ts           # bedGraph
│   │       └── variants.ts         # VCF
│   ├── data/
│   │   └── assemblies.json         # Built-in genome definitions
│   └── types/
│       ├── genome.ts
│       └── tracks.ts
```

## File Format Support

| Format | Status | Notes |
|--------|--------|-------|
| BED | ✅ Complete | BED3-BED12 |
| GFF3 | ✅ Complete | Parent-child linking, themes |
| bedGraph | ✅ Complete | Signal/peak data |
| VCF | ✅ Complete | Zoom-dependent rendering |
| BigBed | ✅ Complete | Remote indexed BED, HTTP range requests |
| BigWig | ✅ Complete | Remote indexed signal, HTTP range requests |
| BAM | 🔲 Planned | Indexed, complex |
| FASTA | 🔲 Planned | Sequence at high zoom |

## Remote Gene/Transcript Tracks

Remote tracks are loaded automatically based on the selected assembly. They use BigBed format
with HTTP range requests for efficient region-based queries.

### Track Types

| Track | Data Level | Visual | Source |
|-------|------------|--------|--------|
| **Genes** | Gene-level | Single continuous box per gene | R2-hosted `.genes.bb` files |
| **Transcripts** | Transcript-level | Compound model with exon blocks | UCSC `knownGene.bb` or R2 `.transcripts.bb` |

### What Each Track Shows

**Genes Track** (when available):
- One feature per gene (e.g., "TP53", "BRCA1")
- Single continuous rectangle spanning gene extent
- No internal exon/intron structure shown
- Useful for: gene density, gene-level annotations, simple overviews

**Transcripts Track**:
- One feature per transcript isoform (e.g., "ENST00000413465.6")
- Compound structure with exon blocks connected by intron lines
- Shows splicing patterns, UTRs, coding regions
- Multiple transcripts per gene (alternative splicing)
- Useful for: detailed gene structure, isoform analysis

### Assembly Track Availability

| Assembly Type | Genes Track | Transcripts Track | Notes |
|---------------|-------------|-------------------|-------|
| UCSC (GRCh38, hg19, etc.) | ❌ | ✅ | UCSC only provides transcript-level data |
| R2 Plants (TAIR10, etc.) | ✅ | ✅ | Separate gene-level and transcript files |
| R2 Fungi (S. pombe, etc.) | ✅ | ✅ | Separate gene-level and transcript files |
| R2 Bacteria (E. coli, etc.) | ✅ | ❌ | No alternative splicing in prokaryotes |

### Data Structure (BigBed BED12+)

```
chrom  start   end     name              score strand thickStart thickEnd rgb blockCount blockSizes    blockStarts   ... geneSymbol
chr17  7661778 7676594 ENST00000413465.6 1     -      7661778    7676594  0   7          236,110,113,  0,1234,5678,  ... TP53
```

- `name` (field 4): Transcript ID for transcripts, Gene ID for genes
- `blockCount/blockSizes/blockStarts` (fields 10-12): Exon structure
- `geneSymbol` (extended field 15): Human-readable gene name (UCSC only)

## GQL Quick Reference
```
# Navigation
NAVIGATE chr17:7668421-7687490
ZOOM IN | ZOOM OUT | ZOOM 2x
PAN LEFT 10kb | PAN RIGHT 1000bp

# Search
SEARCH GENE TP53
LIST GENES | LIST VARIANTS

# Filter & Highlight
FILTER type=exon strand=+     # Dim non-matching features
HIGHLIGHT chr17:7670000-7675000  # Highlight a region
CLEAR filters | CLEAR highlights | CLEAR all

# Queries
SELECT GENES FROM my-track WHERE strand = '+' ORDER BY length DESC LIMIT 10
SELECT GENES INTERSECT variants IN VIEW
SELECT VARIANTS WITHIN TP53
LIST GENES WITH VARIANTS
```

## Commands
```bash
npm run dev          # Dev server (port 5173)
npm run build        # Production build
npm run check        # TypeScript check
npm test             # Run all tests (unit + e2e)
npm run test:unit    # Vitest unit tests only
npm run test:e2e     # Playwright e2e tests only
npm run test:e2e:ui  # Playwright with interactive UI
```

## Testing

### Philosophy
Tests are a **development tool**, not just CI validation. Use them to:
1. Verify changes work before committing
2. Understand expected behavior by reading test descriptions
3. Debug issues by running specific tests with `--headed` or `--ui`

### Test Structure
```
tests/
├── e2e/
│   ├── smoke.test.ts          # Basic app loads, no crashes
│   ├── navigation.test.ts     # Pan, zoom, coordinate input
│   ├── gene-tracks.test.ts    # BigBed loading, assembly switching
│   ├── visual.test.ts         # Screenshot regression
│   └── personas/              # User journey tests
│       ├── biologist.test.ts
│       ├── bioinformatician.test.ts
│       └── ...
```

### Running Tests
```bash
# Full suite (CI-style)
npm test

# Just e2e tests
npm run test:e2e

# Interactive debugging - see browser, step through
npm run test:e2e:ui

# Run specific test file
npx playwright test gene-tracks.test.ts

# Run with visible browser
npx playwright test --headed

# Update visual snapshots after intentional UI changes
npm run test:visual:update
```

### Development Workflow
1. **Before starting work**: Run `npm run test:e2e` to ensure baseline passes
2. **After making changes**: Run relevant tests to verify
3. **Before committing**: Run `npm test` (full suite)
4. **If tests fail**: Use `--ui` mode to debug visually

### Writing New Tests
- Add e2e tests for user-visible features
- Test file naming: `{feature}.test.ts`
- Use descriptive test names that document behavior
- Example pattern from gene-tracks.test.ts:
```typescript
test('TAIR10 shows both genes and transcript tracks', async ({ page }) => {
  await page.goto('/');
  // Switch assembly
  const assemblyButton = page.locator('button').filter({ hasText: /GRCh|Human/i }).first();
  await assemblyButton.click();
  await page.getByText('TAIR10').click();
  // Verify both tracks loaded
  await expect(page.getByText('Genes').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Transcripts').first()).toBeVisible({ timeout: 10000 });
});
```

### Port Configuration
Default dev server runs on port 5173. For multiple terminals:
```bash
npm run dev -- --port 5174  # Second terminal
npm run dev -- --port 5175  # Third terminal
```

## Ralph Loop (Iterative Development)

Ralph Loop is a Claude Code plugin for autonomous iterative development. It feeds the same prompt
back to Claude after each response, allowing multi-iteration refinement until completion.

### Basic Usage
```bash
/ralph-loop "Your task description" --completion-promise "DONE" --max-iterations 25
```

### Key Flags
- `--completion-promise "TEXT"` - Claude outputs `<promise>TEXT</promise>` when truly complete
- `--max-iterations N` - Safety limit (required unless you want infinite loop)

### Correct Prompt Structure
```bash
# ✅ CORRECT - Promise as separate flag
/ralph-loop "Implement feature X. Tasks: 1. Create service 2. Add tests. Verify: npm test" \
  --completion-promise "FEATURE-COMPLETE" \
  --max-iterations 20

# ❌ WRONG - Promise embedded in prompt (won't be detected!)
/ralph-loop "Implement feature X. Output: <promise>DONE</promise>" --max-iterations 20
```

### Example: Multi-Phase Implementation
```bash
/ralph-loop "Implement BigWig support for genome browser.

## Tasks
1. Create src/lib/services/bigwig.ts using @gmod/bbi
2. Update remoteTracks.svelte.ts for bigwig type
3. Update TrackView.svelte for signal rendering
4. Add e2e test

## Verification
- npm run check (must pass)
- npm run test:e2e (must pass)

## Success Criteria
All tasks complete and verified." \
  --completion-promise "PHASE-COMPLETE" \
  --max-iterations 25
```

### How It Works
1. Claude receives prompt, works on task
2. On exit attempt, stop hook checks for `<promise>YOUR_TEXT</promise>` in output
3. If promise matches `--completion-promise` value → loop stops
4. If no match → same prompt fed back, Claude sees previous work in files
5. Continues until promise detected or max iterations reached

### Monitoring
```bash
# Check current iteration
grep '^iteration:' .claude/ralph-loop.local.md

# View full state
head -10 .claude/ralph-loop.local.md
```

### Common Mistakes
1. **Promise in prompt text** - Use `--completion-promise` flag, not `<promise>` in the prompt
2. **No max iterations** - Always set `--max-iterations` unless you want infinite loop
3. **Vague completion criteria** - Be specific about what "done" means

### TDD + Ralph Loop Pattern

The most effective way to use Ralph Loop is with Test-Driven Development:

**Pattern**:
1. Write a failing test that captures the bug/feature
2. Run test to confirm it fails (red)
3. Use Ralph Loop with that test as verification criteria
4. Loop iterates until tests pass (green)
5. Human does final smoke test (minimal involvement)

**Why this works**:
- Tests provide objective, automated verification
- No human needed in the loop until completion
- Each iteration builds on previous work
- Clear completion criteria (tests pass)

**Example: Bug Fix**
```bash
# 1. First, write a test that captures the bug (should FAIL)
#    tests/e2e/pan-data-loading.test.ts

# 2. Verify it fails
npx playwright test pan-data-loading.test.ts
# Expected: 1 failed

# 3. Run Ralph Loop to fix
/ralph-loop "Fix the remote track panning bug.

## Bug Description
Mouse panning doesn't load new data for remote tracks (BigWig/BigBed).
After panning to a new region, the feature count stays the same.

## Failing Test
tests/e2e/pan-data-loading.test.ts - 'panning loads new data in different genomic region'

## Relevant Files
- src/lib/stores/remoteTracks.svelte.ts (main logic)
- src/lib/components/TrackView.svelte (viewport effect)

## Verification
npx playwright test pan-data-loading.test.ts
Must show: 3 passed

## Success Criteria
All pan-data-loading tests pass." \
  --completion-promise "BUG-FIXED" \
  --max-iterations 15
```

**Key Principles**:
1. **Failing test first** - Don't start Ralph Loop until you have a test that FAILS
2. **Specific test file** - Run only the relevant test, not the full suite (faster iterations)
3. **Clear file scope** - List the files Claude should modify
4. **Objective verification** - Test pass/fail is unambiguous

**Benefits over manual iteration**:
- Human can walk away while Claude iterates
- No back-and-forth asking "is this fixed?"
- Tests prove the fix works, not just that code was changed
- History of attempts preserved in files for debugging

## Session Log
- **2026-01-08 Session 1**: Project kickoff
  - Created spec and architecture
  - Built track type registry
  - Implemented 4 track types (BED, GFF3, bedGraph, VCF)

- **2026-01-09 Session 2**: Major feature completion
  - AI integration with provider abstraction (Claude/OpenAI)
  - GQL query language with full parser/executor
  - Query console with history, save/load, export
  - URL state persistence + localStorage session restore
  - Assembly system with 27+ genomes, inference, custom loading
  - Gene model theme system (dark/flat) with peaked introns
  - Chromosome validation warnings
  - ORDER BY, LIMIT in GQL
  - Track-aware SELECT queries (FROM clause)

- **2026-01-15 Session 5**: Gene tracks setup (had bugs)
  - Added 13 R2-hosted gene track URLs to bigbed.ts
  - Fixed case-insensitive assembly ID lookup
  - Added viewport update after assembly switch

- **2026-01-15 Session 6**: Fixed gene tracks - all working now
  - Fixed Svelte 5 reactivity bug: read dependencies before early return in render effect
  - Fixed R2 bucket URL (was pointing to wrong bucket ID)
  - Fixed chromosome name resolution: actually use resolved name in BigBed query
  - Fixed Puccinia chromosome names (supercont1.X -> supercont2.X)
  - Gene tracks now work for 15 assemblies

- **2026-01-15 Session 7**: Complete model organism coverage
  - Clarified Genes vs Transcripts tracks (see docs/GENE-TRACKS.md)
  - UCSC knownGene.bb only has transcript-level data (exon blocks), not gene-level
  - Removed UCSC from GENE_BIGBED_URLS - they only go in TRANSCRIPT_BIGBED_URLS
  - Restored track height resize (sidebar slider + drag border on canvas)
  - Added UCSC/GenArk transcript tracks for 9 model organisms:
    - mm10, mm39 (mouse), T2T-CHM13 (human), danRer11 (zebrafish),
    - dm6 (fly), ce11 (worm), sacCer3 (yeast), rn7 (rat), galGal6 (chicken)
  - Added GENARK_CHROMOSOME_MAPS for NC_ accession number mapping
  - All 24 assemblies now have working gene/transcript tracks

- **2026-01-16 Session 8**: BigWig support
  - Created `src/lib/services/bigwig.ts` with `queryBigWig()` function
  - Uses `@gmod/bbi` library (already installed for BigBed)
  - Updated `remoteTracks.svelte.ts` to support `type: 'bigwig'`
  - Added `renderSignalFeatures()` to TrackView for area chart visualization
  - Added `tests/e2e/bigwig.test.ts` with 4 passing tests
  - First use of Ralph Loop for iterative development (documented above)

- **2026-01-16 Session 9**: Remote track loading fixes - FAILED
  - **Problem**: Panning doesn't load new data for BigWig/BigBed tracks
  - **Attempted fixes** (all tests pass, manual testing fails):
    1. Clear rawFeaturesStore when tracks removed
    2. Refetch when features empty (regardless of lastViewport)
    3. Use getRawFeatures() for hasRemoteContent check
    4. Add remoteRenderVersion counter for reactivity
    5. Use untrack() in viewport $effect to prevent infinite loop
  - **Result**: 7 automated e2e tests pass, manual browser testing FAILS
  - **Key insight**: Automated tests don't replicate actual user interaction
  - **Next steps**: See `docs/DEBUG-REMOTE-TRACKS.md` for diagnostic plan
  - Created `tests/e2e/remote-track-loading.test.ts`

- **2026-01-19 Session 10**: Remote track panning bug FIXED
  - **Root cause**: Svelte 5 fine-grained reactivity issue
    - `$effect` in TrackView.svelte only read `viewport.current` (object reference)
    - Didn't read `.chromosome`, `.start`, `.end` properties
    - Svelte didn't detect property mutations during panning
  - **Fix**: Explicitly read viewport properties to create fine-grained dependencies
  - **Also fixed**: Stale closure in debounce by capturing viewport values immediately
  - Created `tests/e2e/pan-data-loading.test.ts` with failing test first (TDD)
  - Used Ralph Loop for automated iteration until tests passed
  - Documented TDD + Ralph Loop pattern in CLAUDE.md

## Known Issues & Gotchas

### RESOLVED: Remote Track Panning Bug (Session 10)
**Status**: FIXED in commit c2ddc8d

**Root cause**: Svelte 5 fine-grained reactivity. The `$effect` in TrackView.svelte
only read `viewport.current` (object reference), not the individual properties.
Svelte didn't detect `.start`/`.end` mutations during panning.

**Fix**: Explicitly read properties to create fine-grained dependencies:
```typescript
$effect(() => {
  const vp = viewport.current;
  const _chr = vp.chromosome;  // Create dependency
  const _start = vp.start;     // Create dependency
  const _end = vp.end;         // Create dependency
  untrack(() => remoteTracks.updateForViewport(vp));
});
```

**Lesson**: In Svelte 5, reading an object doesn't track nested property changes.
You must read the specific properties you depend on.

### Testing Strategy Lesson (Session 9)
**Two-layer testing is essential for UI features:**

1. **Data tests** - Verify fetch/parse logic works (these passed)
2. **Visual tests** - Verify rendering shows the data (would have failed)

A visual regression test comparing "loaded state" vs "after pan state" would have caught
this bug immediately - the panned view would show blank while baseline shows data.

For interaction-dependent features, always combine:
- Automated data/state tests
- Screenshot comparison tests
- Manual smoke test before declaring "done"

### Cloudflare R2 URL Format
The R2 public bucket URL format is: `https://pub-{bucket_id}.r2.dev/{file}`

**Important**: The bucket ID shown in Cloudflare dashboard may differ from the actual public URL.
When troubleshooting R2 404 errors, verify the actual bucket URL by checking an existing working
file, not by looking at the dashboard. The current correct bucket is:
`pub-cdedc141a021461d9db8432b0ec926d7.r2.dev`

### GenArk Chromosome Names
UCSC GenArk hubs use NCBI RefSeq accession numbers (NC_000067.7) instead of chr-prefixed names.
The `GENARK_CHROMOSOME_MAPS` in `bigbed.ts` maps from standard chr names to NC_ accessions.
When adding new GenArk assemblies, you must add chromosome mappings.

### UCSC vs R2 Track Data
- **UCSC knownGene.bb**: Contains transcript-level data only (blockCount > 1 for most features)
- **R2 .genes.bb**: Contains gene-level data (blockCount = 1, single continuous feature)
- **R2 .transcripts.bb**: Contains transcript-level data with exon structure

If a user reports "both tracks look the same" or "genes track shows exons", check whether
the data source actually has gene-level annotations or just transcript data with gene symbols.

## Key Files for Context
1. `CLAUDE.md` - This file
2. `src/lib/services/queryLanguage.ts` - GQL implementation
3. `src/lib/services/ai/` - AI provider system
4. `src/lib/stores/viewport.svelte.ts` - Core state + URL sync
5. `src/lib/services/trackTypes/geneModel.ts` - Theme system
6. `src/lib/data/assemblies.json` - Genome definitions
7. `src/lib/services/bigbed.ts` - BigBed URL mapping (R2 + UCSC)
8. `src/lib/services/bigwig.ts` - BigWig remote signal data
9. `src/lib/stores/remoteTracks.svelte.ts` - Remote track state
