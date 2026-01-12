# GBetter

A modern, lightweight genome browser. Fast, beautiful, AI-native.

[![CI](https://github.com/TeamMacLean/gbetter/actions/workflows/ci.yml/badge.svg)](https://github.com/TeamMacLean/gbetter/actions/workflows/ci.yml)

## Features

- **Fast by default** - Sub-second load, 60fps pan and zoom
- **AI-native** - Natural language queries with reproducible GQL output
- **Web-first** - No installation, works in any modern browser
- **Beautiful** - Dark mode interface, modern aesthetics
- **Species-agnostic** - Works with any genome, not just human

## Supported File Formats

| Format | Description | Status |
|--------|-------------|--------|
| BED | Interval features (BED3-BED12) | Supported |
| GFF3 | Gene annotations with hierarchies | Supported |
| bedGraph | Signal/coverage data | Supported |
| VCF | Variant calls | Supported |
| BigWig | Binary signal data | Planned |
| BAM/CRAM | Alignments | Planned |

## Quick Start

1. Open GBetter in your browser
2. Drag and drop a genomic file (BED, GFF3, VCF, or bedGraph)
3. Use the search bar to navigate:
   - Type a gene name: `TP53`
   - Type coordinates: `chr17:7668421-7687490`
   - Use natural language: `show me genes with variants`

## GQL - GBetter Query Language

GBetter includes a simple, reproducible query language for genome browser operations. Natural language queries are automatically translated to GQL for reproducibility.

### Basic Commands

```
navigate chr17:7668421-7687490   # Go to coordinates
search gene TP53                  # Find and navigate to a gene
zoom in                          # Zoom in 2x
zoom out                         # Zoom out 2x
pan left 10kb                    # Move left 10,000 bp
filter type=exon                 # Highlight exons, dim other features
highlight chr17:7670000-7675000  # Highlight a region
clear filters                    # Remove all filters
```

### Advanced Queries (SELECT)

```
SELECT GENES IN VIEW
SELECT VARIANTS FROM my-vcf WHERE significance = 'pathogenic'
SELECT GENES INTERSECT variants ORDER BY length DESC LIMIT 10
COUNT VARIANTS WITHIN TP53
```

See the [GQL Manual](docs/GQL-MANUAL.md) for complete documentation, or [GQL Examples](docs/GQL-EXAMPLES.md) for practical use cases.

## Tutorials

Step-by-step guides for different use cases:

1. [Getting Started](docs/tutorials/01-getting-started.md) - First-time users
2. [Exploring Genes](docs/tutorials/02-exploring-genes.md) - Bench biologists
3. [Advanced Queries](docs/tutorials/03-advanced-queries.md) - Bioinformaticians
4. [Non-Model Genomes](docs/tutorials/04-non-model-genomes.md) - Domain experts
5. [Reproducible Analysis](docs/tutorials/05-reproducible-analysis.md) - Power users

## Installation

*Section to be populated*

<!-- Future: npm install, Docker, deployment options -->

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/TeamMacLean/gbetter.git
cd gbetter

# Install dependencies
npm install

# Start development server
npm run dev
```

### Commands

```bash
npm run dev          # Development server (localhost:5173)
npm run build        # Production build
npm run check        # TypeScript type checking
npm run test:unit    # Run unit tests
npm run test:e2e     # Run end-to-end tests
```

### Project Structure

```
src/
  lib/
    components/     # Svelte UI components
    stores/         # State management (Svelte 5 runes)
    services/       # Business logic, parsers
    types/          # TypeScript definitions
  routes/           # SvelteKit pages

tests/
  unit/             # Vitest unit tests
  e2e/              # Playwright E2E tests

test-data/          # Sample genomic files for testing
docs/               # Documentation
```

## Privacy & Security

**Your genomic data never leaves your browser** unless you explicitly choose to use cloud AI features.

- All file parsing happens client-side
- AI queries send only your search text by default
- Optional local LLM support (Ollama) for complete privacy
- Clear indicators when data would be sent externally

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

---

Built with Svelte, TypeScript, and Canvas. Powered by curiosity.
