# GBetter

A modern, lightweight genome browser. Fast, beautiful, AI-native.

[![CI](https://github.com/TeamMacLean/gbetter/actions/workflows/ci.yml/badge.svg)](https://github.com/TeamMacLean/gbetter/actions/workflows/ci.yml)
[![Deploy](https://github.com/TeamMacLean/gbetter/actions/workflows/deploy.yml/badge.svg)](https://github.com/TeamMacLean/gbetter/actions/workflows/deploy.yml)

---

## Try It Now

**https://teammaclean.github.io/gbetter/**

No installation required. Just open in your browser and start exploring genomes.

---

## Features

- **Fast by default** - Sub-second load, 60fps pan and zoom
- **AI-native** - Natural language queries with reproducible GQL output
- **Web-first** - No installation, works in any modern browser
- **Beautiful** - Dark mode interface, modern aesthetics
- **Species-agnostic** - Works with any genome, not just human
- **Private** - All data stays in your browser

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

1. Open [GBetter](https://teammaclean.github.io/gbetter/) in your browser
2. Drag and drop a genomic file (BED, GFF3, VCF, or bedGraph)
3. Use the search bar to navigate:
   - Type a gene name: `TP53`
   - Type coordinates: `chr17:7668421-7687490`
   - Use simple commands: `zoom in`, `pan left 10kb`

---

## Search Bar vs GQL Console

GBetter has two query interfaces:

### Search Bar (Header)

The search bar in the header is for quick navigation:

| Input | Example |
|-------|---------|
| Gene name | `TP53`, `BRCA1` |
| Coordinates | `chr17:7668421-7687490` |
| Commands | `zoom in`, `pan left 10kb`, `filter type=exon` |

Works instantly, no AI required. Great for everyday navigation.

### GQL Console (Bottom Panel)

For advanced queries, open the GQL Console (`Cmd+\`` or click the tab at the bottom):

- **Natural language input** - "show me genes with high-impact variants" (with [AI configured](docs/AI-SETUP.md))
- **Editable GQL** - Review and modify translated queries before execution
- **Clickable results** - Navigate to any result with one click
- **Query history** - Replay previous queries
- **Save & share** - Export queries as `.gql` files or share via URL

The Console translates natural language to GQL, giving you reproducible commands you can save, share, and re-run.

---

## Installation Options

### Option 1: Use the Live Version (Recommended)

Just visit **https://teammaclean.github.io/gbetter/** - nothing to install.

Your data never leaves your browser. Files are parsed locally using JavaScript.

### Option 2: Deploy Your Own Instance

Fork GBetter to your GitHub account and deploy via GitHub Pages:

1. **Fork the repository**

   Click the "Fork" button at https://github.com/TeamMacLean/gbetter

2. **Enable GitHub Pages**

   In your forked repo, go to **Settings > Pages**:
   - Source: **GitHub Actions**
   - Click Save

3. **Wait for deployment**

   The deploy workflow runs automatically. Your instance will be live at:
   ```
   https://YOUR-USERNAME.github.io/gbetter/
   ```

4. **Keep it updated**

   Sync your fork periodically to get new features:
   ```bash
   git fetch upstream
   git merge upstream/main
   git push
   ```

### Option 3: Run Locally

For development or offline use:

```bash
# Clone the repository
git clone https://github.com/TeamMacLean/gbetter.git
cd gbetter

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Option 4: Self-Host on Your Server

Build and deploy to any static hosting:

```bash
# Build for production
npm run build

# Output is in the 'build' directory
# Deploy to nginx, Apache, S3, Netlify, etc.
```

Note: Update `svelte.config.js` to change the base path if not hosting at root.

---

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

---

## AI Setup

GBetter's AI features translate natural language into reproducible GQL commands. Choose your preferred AI backend:

| Provider | Privacy | Cost |
|----------|---------|------|
| **Ollama** (Local) | Complete - runs on your machine | Free |
| **Anthropic** (Claude) | Query text sent to API | Pay-per-use |
| **OpenAI** (GPT) | Query text sent to API | Pay-per-use |

**Your genomic data files are never sent to external services** - only your query text and track metadata.

See the [AI Setup Guide](docs/AI-SETUP.md) for detailed installation and configuration instructions.

---

## Tutorials

Step-by-step guides for different use cases:

1. [Getting Started](docs/tutorials/01-getting-started.md) - First-time users
2. [Exploring Genes](docs/tutorials/02-exploring-genes.md) - Bench biologists
3. [Advanced Queries](docs/tutorials/03-advanced-queries.md) - Bioinformaticians
4. [Non-Model Genomes](docs/tutorials/04-non-model-genomes.md) - Domain experts
5. [Reproducible Analysis](docs/tutorials/05-reproducible-analysis.md) - Power users

---

## Development

### Prerequisites

- Node.js 20+
- npm

### Commands

```bash
npm run dev          # Development server (localhost:5173)
npm run build        # Production build
npm run check        # TypeScript type checking
npm run test:unit    # Run unit tests (280 tests)
npm run test:e2e     # Run end-to-end tests (76 tests)
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

---

## Privacy & Security

**Your genomic data never leaves your browser** unless you explicitly choose to use cloud AI features.

- All file parsing happens client-side in JavaScript
- No server, no database, no tracking
- AI queries send only your search text (not your data)
- Optional local LLM support (Ollama) for complete privacy
- Clear indicators when data would be sent externally

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

---

Built with Svelte, TypeScript, and Canvas. Powered by curiosity.
