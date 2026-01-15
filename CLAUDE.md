# CLAUDE.md - GBetter Genome Browser

## Project Overview
A modern, lightweight genome browser. Fast, beautiful, AI-native.

**Status**: Active development, Session 7 complete (2026-01-15)

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

- **BigWig support** - Binary format, needs WASM
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
| BigWig | 🔲 Planned | Binary, needs WASM |
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
npm run dev          # Dev server
npm run build        # Production build
npm run check        # TypeScript check
```

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

## Known Issues & Gotchas

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
8. `src/lib/stores/remoteTracks.svelte.ts` - Remote track state
