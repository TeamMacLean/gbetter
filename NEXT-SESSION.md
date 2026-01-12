# Next Session Plan

## Session 2 Summary (2026-01-09) - COMPLETED

All major planned features have been implemented:

### ✅ Gene Model Visualization - DONE
- Theme system with switchable styles
- **Dark theme**: Glows, gradients, peaked introns (GBrowse hat style)
- **Flat theme**: FlatUI colors, clean look
- Inner chevrons showing strand direction
- Theme selector in sidebar ("Gene Style" buttons)

### ✅ Genome Assembly System - DONE
- 27+ built-in assemblies (human, mouse, plants, pathogens, microbes)
- Grouped by species in dropdown
- Chromosome inference from loaded data
- Custom .chrom.sizes file loading
- Chromosome name normalization and aliases
- **New**: Chromosome mismatch warnings when loading tracks

### ✅ State Persistence - DONE
- URL state: `?chr=chr17&start=7668421&end=7687490` or `?loc=chr17:7668421-7687490`
- localStorage session restore with banner prompt
- Track metadata persistence (re-upload files on restore)
- Query history in localStorage

### ✅ AI Integration - DONE
- Multi-provider support (Claude/OpenAI)
- Settings panel with API key storage
- Natural language → GQL translation
- Scope clarification (AI asks when ambiguous)
- Fallback to regex-based translation

### ✅ Query System (GQL) - DONE
- Full parser/executor with NAVIGATE, SEARCH, ZOOM, PAN, LIST, SELECT
- SELECT with WHERE, ORDER BY, LIMIT, FROM track, INTERSECT, WITHIN
- Query console (Cmd+`)
- History, save/load, export/import .gql files

---

## Outstanding for Future Sessions

### High Value / Low Effort

1. **Filter/Highlight Commands**
   - GQL parses FILTER and HIGHLIGHT but returns TODO
   - Wire to actual track filtering UI
   - Visual highlight of matching features

2. **AI Conversation Follow-ups**
   - When AI asks "Do you mean in view or all data?"
   - User should be able to reply with just "in view"
   - Requires conversation history in AI context

3. **More Gene Model Themes**
   - Classic IGV style
   - UCSC style
   - Minimalist line-art style

### Medium Effort

4. **Comparison Views**
   - Side-by-side query results
   - Diff two regions
   - Before/after feature changes

5. **Export**
   - PNG screenshot
   - SVG vector
   - Selected features as BED/GFF3

6. **Annotation Tooltips**
   - Hover over features for details
   - Click for full attribute panel

### High Effort (Binary Formats)

7. **BigWig Support**
   - Binary format, needs WASM or server-side
   - Common for signal tracks (ChIP-seq, ATAC-seq)

8. **BAM Support**
   - Indexed reads
   - Complex rendering (pileup, coverage)
   - Large files need streaming

9. **FASTA Support**
   - Sequence display at high zoom
   - Color-coded bases
   - Translation view

---

## v0.1.0 Release Checklist

The current state is essentially v0.1.0-ready:

- [x] Core browser functionality
- [x] 4 file formats (BED, GFF3, bedGraph, VCF)
- [x] AI-powered queries
- [x] URL sharing
- [x] Session persistence
- [x] Multi-genome support
- [x] Themeable gene models
- [ ] README with screenshots
- [ ] Demo data files
- [ ] Landing page / docs site?

---

## Architecture Notes for Future Work

### Adding a New Theme
```typescript
// In geneModel.ts
const MY_THEME: GeneModelTheme = {
  name: 'my-theme',
  cdsHeight: 14,
  // ... other dimensions and colors
  intronStyle: 'peaked', // or 'flat', 'dashed'
};

// Add to THEMES registry
const THEMES = { dark: DARK_THEME, flat: FLAT_THEME, 'my-theme': MY_THEME };
```

### Adding a New Track Type
```typescript
// In trackTypes/myformat.ts
export const myFormatTrackType: TrackTypeConfig<MyFeature> = {
  id: 'my-format',
  name: 'My Format',
  extensions: ['myf', 'myformat'],
  parse: parseMyFormat,
  render: renderMyFormat,
};

// Register in trackTypes/index.ts
import { myFormatTrackType } from './myformat';
registerTrackType(myFormatTrackType);
```

### Adding a New AI Provider
```typescript
// In services/ai/myprovider.ts
export async function translateWithMyProvider(
  naturalLanguage: string,
  context: BrowserContext,
  config: AIConfig
): Promise<AIResponse> {
  // Implementation
}

// Add to services/ai/index.ts provider registry
```
