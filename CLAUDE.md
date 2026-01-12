# CLAUDE.md - GBetter Genome Browser

## Project Overview
A modern, lightweight genome browser. Fast, beautiful, AI-native.

**Status**: Active development, Session 2 complete (2026-01-09)

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
| BigWig | 🔲 Planned | Binary, needs WASM |
| BAM | 🔲 Planned | Indexed, complex |
| FASTA | 🔲 Planned | Sequence at high zoom |

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

## Key Files for Context
1. `CLAUDE.md` - This file
2. `src/lib/services/queryLanguage.ts` - GQL implementation
3. `src/lib/services/ai/` - AI provider system
4. `src/lib/stores/viewport.svelte.ts` - Core state + URL sync
5. `src/lib/services/trackTypes/geneModel.ts` - Theme system
6. `src/lib/data/assemblies.json` - Genome definitions
