# Visual Design Specification

## Design Principles

1. **Accessibility first** - Colorblind-safe palettes, high contrast
2. **Clarity over convention** - Don't follow genomics tradition if it harms readability
3. **Publication-ready** - Light theme primary, prints well
4. **Geometric differentiation** - Use shape/pattern for strand, not color
5. **Distinct colors for distinct meanings** - Avoid saturation-only differences

---

## Palette System

### Base: ColorBrewer Set2 (Qualitative)

```
#66c2a5  Teal
#fc8d62  Orange
#8da0cb  Blue-purple
#e78ac3  Pink
#a6d854  Yellow-green
#ffd92f  Yellow
#e5c494  Tan
#b3b3b3  Gray
```

Colorblind safe, distinct hues, works on light backgrounds.

### Palette Switching

Implemented in Settings > Display:
- Set2 (default, soft/professional)
- Dark2 (bolder version of Set2)
- Paired (12 colors, paired light/dark)

---

## Color Assignments

### Nucleotides (Accessible)

Avoiding red-green confusion. Implemented in `palette.ts`:

| Base | Color | Hex | Rationale |
|------|-------|-----|-----------|
| A | Blue | `#4393c3` | Distinct, prints well |
| C | Orange | `#f4a582` | Warm, distinct from blue |
| G | Purple | `#7b3294` | Dark, high contrast |
| T | Teal | `#008080` | Distinct from all above |

### Gene Model Features

Implemented via palette semantic colors:

| Feature | Assignment | Notes |
|---------|------------|-------|
| CDS | Primary color (teal in Set2) | Most prominent |
| UTR | Distinct color (orange in Set2) | NOT just lighter exon |
| Exon | Blue-purple in Set2 | Distinct from CDS |
| Gene | Pink in Set2 | Top-level feature |
| Intron | Thin line, neutral gray | De-emphasized |

### Strand Indication

Geometry-based (not color):
- Inner chevrons pointing in strand direction
- Peaked intron lines ("hat" style) point in strand direction

### BAM Reads

Implemented in `palette.ts` BAM_COLORS:

| Element | Color | Notes |
|---------|-------|-------|
| Forward read | `#3f3f46` | Neutral gray |
| Reverse read | `#44403c` | Slightly warm gray |
| Mismatch | `#dc2626` | Red, draws attention |
| Insertion | `#22c55e` | Green marker |
| Deletion | `#888888` | Gray gap line |

### Signal Tracks (BigWig/bedGraph)

Sequential color ramp for intensity:
- Blues ramp (default): light blue → dark blue
- Configurable per track

---

## Theme Definitions

### Light Theme (Primary, Print-Ready)

Default theme. CSS custom properties in `app.css`:

```
Background:       #ffffff
Track background: #fafafa
Track border:     #e5e5e5
Text primary:     #171717
Text secondary:   #525252
Text muted:       #737373
Accent:           #6366f1
```

### Dark Theme

```
Background:       #0f0f1a
Track background: #1a1a2e
Track border:     #333333
Text primary:     #e5e5e5
Text secondary:   #a3a3a3
```

### High Contrast Theme (Accessibility)

```
Background:       #ffffff
Track background: #ffffff
Text primary:     #000000
Borders:          #000000 (2px)
```

Maximum contrast, thick borders for visibility.

---

## Implementation Status

### Phase 1: Light Theme Foundation - COMPLETE
- [x] Define CSS custom properties for all colors
- [x] Implement light theme with Set2 palette
- [x] Update gene model renderer to use new colors
- [x] Add geometric strand indicators (chevrons)

### Phase 2: Dark Theme - COMPLETE
- [x] Derive dark theme colors (same hues, adjusted lightness)
- [x] Ensure feature colors still distinct on dark bg

### Phase 3: Palette Switching - COMPLETE
- [x] Add palette selector to Settings > Display
- [x] Implement Set2, Dark2, Paired options

### Phase 4: Polish - COMPLETE
- [x] Nucleotide colors finalized (accessible blue/orange/purple/teal)
- [x] BAM read colors refined
- [x] Signal track color ramps (Blues, Greens, Purples, Oranges, Viridis)
- [x] Canvas rendering uses theme colors

### Testing
- [x] Visual regression tests for all themes (12 tests)
- [x] Visual regression tests for all palettes
- [x] Visual regression tests for signal tracks (3 tests)
- [ ] Manual: Coblis colorblind simulator
- [ ] Manual: Print to PDF verification

---

## Key Files

- `src/lib/services/palette.ts` - Palette definitions, color getters, signal ramps
- `src/lib/stores/theme.svelte.ts` - Theme state management
- `src/app.css` - CSS custom properties for themes
- `src/lib/components/TrackView.svelte` - Canvas rendering with theme colors
- `tests/e2e/theme-visual.test.ts` - Theme/palette visual regression tests
- `tests/e2e/signal-visual.test.ts` - Signal track visual regression tests

---

## References

- [ColorBrewer 2.0](https://colorbrewer2.org/) - Palette source
- [Viridis](https://cran.r-project.org/web/packages/viridis/) - Sequential palettes
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
