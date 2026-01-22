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

Palettes should be switchable in the UI. Options to implement:
- Set2 (default, soft/professional)
- Dark2 (bolder version of Set2)
- Paired (12 colors, paired light/dark)
- Custom user palettes

---

## Color Assignments

### Nucleotides (Accessible)

Avoiding red-green confusion. Proposed:

| Base | Color | Hex | Rationale |
|------|-------|-----|-----------|
| A | Blue | `#4393c3` | Distinct, prints well |
| C | Orange | `#f4a582` | Warm, distinct from blue |
| G | Purple | `#7b3294` | Dark, high contrast |
| T | Teal | `#008080` | Distinct from all above |

Alternative (if above doesn't work in practice):
- Use ColorBrewer `Dark2` first 4 colors
- Test with colorblind simulators before finalizing

### Gene Model Features

| Feature | Assignment | Notes |
|---------|------------|-------|
| CDS/Exon | Primary color (e.g., Set2 teal) | Most prominent |
| UTR (5'/3') | Distinct color (e.g., Set2 orange) | NOT just lighter exon |
| Intron | Thin line, neutral gray | De-emphasized |
| Non-coding exon | Another distinct color | If needed |

### Strand Indication

**Do NOT use color.** Use geometry:
- **+ strand**: Right-pointing chevrons/arrows inside exons
- **- strand**: Left-pointing chevrons/arrows inside exons
- Alternative: Peaked intron lines point in strand direction

### BAM Reads

| Element | Color | Notes |
|---------|-------|-------|
| Match | Neutral (gray or light) | Background, not distracting |
| Mismatch | Strong contrast (red ok here, it's alarm) | Draws attention |
| Insertion | Distinct marker color | Triangle/line |
| Deletion | Gap or different fill | Shows absence |
| Soft clip | Muted/transparent | Less important |

### Variants (VCF)

| Type | Color |
|------|-------|
| SNV | One color |
| Insertion | Another color |
| Deletion | Another color |
| Complex | Another color |

Use 4 colors from chosen palette.

### Signal Tracks (BigWig/bedGraph)

Sequential palette for intensity:
- Viridis (default, accessible)
- Blues (print-friendly)
- User selectable

---

## Theme Definitions

### Light Theme (Primary, Print-Ready)

```
Background:       #ffffff (white) or #f8f9fa (off-white)
Track background: #ffffff
Track border:     #e0e0e0
Text primary:     #212529
Text secondary:   #6c757d
Grid lines:       #e9ecef
Selection:        rgba(66, 133, 244, 0.2)
```

Gene/feature colors: Full saturation from palette

### Dark Theme (Screen)

```
Background:       #1a1a2e (dark blue-gray, not pure black)
Track background: #16213e
Track border:     #2d3748
Text primary:     #e2e8f0
Text secondary:   #a0aec0
Grid lines:       #2d3748
Selection:        rgba(66, 133, 244, 0.3)
```

Gene/feature colors: Same hues, adjusted lightness for dark bg

### High Contrast Theme (Accessibility)

```
Background:       #ffffff
Track background: #ffffff
Text:             #000000
```

Features: Maximum saturation, thick borders

---

## Implementation Plan

### Phase 1: Light Theme Foundation
- [ ] Define CSS custom properties for all colors
- [ ] Implement light theme with Set2 palette
- [ ] Update gene model renderer to use new colors
- [ ] Add geometric strand indicators (remove color-based)
- [ ] Test with colorblind simulator

### Phase 2: Dark Theme Derivation
- [ ] Derive dark theme colors (same hues, adjusted lightness)
- [ ] Test contrast ratios meet WCAG AA
- [ ] Ensure feature colors still distinct on dark bg

### Phase 3: Palette Switching
- [ ] Add palette selector to Settings > Display
- [ ] Implement Set2, Dark2, Paired options
- [ ] Allow custom palette import (JSON?)

### Phase 4: Polish
- [ ] Nucleotide colors finalized after testing
- [ ] BAM read colors refined
- [ ] Signal track color ramps
- [ ] Print preview/export verification

---

## Testing Checklist

- [ ] Coblis colorblind simulator (all types)
- [ ] WCAG contrast checker (4.5:1 minimum for text)
- [ ] Print to PDF, check readability
- [ ] Side-by-side with IGV/JBrowse (should look better)
- [ ] User feedback on real data

---

## References

- [ColorBrewer 2.0](https://colorbrewer2.org/) - Palette source
- [Viridis](https://cran.r-project.org/web/packages/viridis/) - Sequential palettes
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Coblis Colorblind Simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/)
