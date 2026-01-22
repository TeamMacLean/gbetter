# Plan: Create Tutorial 08 - Customizing Themes

**Target file**: `docs/tutorials/08-customizing-themes.md` (NEW)
**Style guide**: `docs/TUTORIAL-STYLE-GUIDE.md`

## Purpose

Teach users how to customize GBetter's appearance using themes and color palettes, with emphasis on accessibility features and print-ready output.

## Document Structure

```markdown
# Tutorial 8: Customizing Themes and Colors

> **Audience**: All users, especially those needing accessibility features or publication-ready output
> **Time**: 10-15 minutes
> **Prerequisites**: None
> **Last updated**: Session 23 (2026-01-22)

## What You'll Learn
- Switching between Light, Dark, and High-Contrast themes
- Choosing colorblind-safe palettes
- Understanding when to use each theme
- Preparing views for publication/print
- How settings persist across sessions
```

## Content Outline

### Section 1: Why Themes Matter

```markdown
## Why Customize Appearance?

Different situations call for different visual settings:

- **Presentations**: High contrast for projectors
- **Publications**: Light theme for print
- **Long sessions**: Dark theme to reduce eye strain
- **Accessibility**: High-contrast for visual impairments
- **Colorblindness**: Specific palettes that work for everyone
```

### Section 2: Accessing Settings

```markdown
## Opening Settings

1. Click the **Settings** button (gear icon) in the header
2. Click the **Display** tab
3. You'll see options for Theme, Color Palette, and Gene Model Style
```

### Section 3: Theme Modes

```markdown
## Theme Modes

GBetter offers three themes:

### Light (Default)

- Clean white background
- Dark text for maximum readability
- **Best for**: Print, publications, daytime use
- Screenshots are publication-ready

### Dark

- Dark background with light elements
- Reduces eye strain in low light
- **Best for**: Evening work, long sessions, personal preference
- Note: May need adjustment for print

### High-Contrast

- Maximum contrast between elements
- Bold borders and text
- **Best for**: Accessibility needs, presentations on projectors
- Meets WCAG accessibility guidelines
```

### Section 4: Color Palettes

```markdown
## Color Palettes

All palettes are **colorblind-safe** (designed using ColorBrewer principles).

### Set2 (Default)

- Soft, pastel-like colors
- Good differentiation between categories
- Easy on the eyes for long viewing
- **Best for**: General use, most situations

### Dark2

- Bolder, more saturated colors
- Higher contrast between categories
- Stands out more on slides
- **Best for**: Presentations, when colors need to "pop"

### Paired

- Colors come in light/dark pairs
- Useful for related categories
- Good for comparing groups
- **Best for**: Paired data, before/after comparisons

### Palette Preview

When you select a palette, a preview shows the first 8 colors below the selector.
```

### Section 5: Gene Model Style

```markdown
## Gene Model Style

Separate from color palette, you can change how gene models render:

### Arrow (Default)

- Clean, modern look
- Strand indicated by arrow direction
- Good for most uses

### Classic

- Traditional genome browser style
- Peaked introns (hat shape)
- Familiar to IGV/JBrowse users
```

### Section 6: Accessibility Features

```markdown
## Accessibility

GBetter is designed with accessibility in mind:

### Color Vision Deficiency

All palettes work for:
- **Protanopia** (red-blind)
- **Deuteranopia** (green-blind)
- **Tritanopia** (blue-blind)

We use **shape and position**, not just color, to convey information:
- Strand direction shown by chevrons/arrows
- Feature types distinguished by position and shape

### Visual Impairment

High-Contrast theme provides:
- Maximum contrast ratios (WCAG AAA where possible)
- Bold borders on all elements
- Large, clear text

### Testing

We test our palettes using colorblind simulation tools to ensure they work for everyone.
```

### Section 7: Print and Publication

```markdown
## Preparing for Print

For publication-ready figures:

### Recommended settings

1. Theme: **Light**
2. Palette: **Set2** or **Dark2**
3. Zoom to show desired region clearly

### Taking screenshots

1. Set up your view (navigate, zoom, filter)
2. Use browser's screenshot feature or OS screenshot tool
3. Light theme ensures good print contrast

### Export tips

- Higher zoom = more detail in export
- Consider your final figure size when choosing zoom level
- Light backgrounds work better for most journals
```

### Section 8: Settings Persistence

```markdown
## How Settings Are Saved

Your display preferences are saved automatically:

### What's saved

- Theme mode (Light/Dark/High-Contrast)
- Color palette (Set2/Dark2/Paired)
- Gene model style

### Where it's saved

Settings are stored in your browser's **localStorage**:
- Persists across browser sessions
- Specific to this browser/computer
- Clearing browser data will reset to defaults

### Sharing settings

Currently, settings are **not** encoded in URLs. When sharing views with collaborators, note your settings:

```
View URL: https://teammaclean.github.io/gbetter/?chr=chr17&start=7668421&end=7687490
Settings: Light theme, Set2 palette
```
```

### Section 9: Try It Yourself

```markdown
## Try It Yourself

### Compare themes

1. Open Settings > Display
2. Try each theme - watch the interface change
3. Notice how the canvas, sidebar, and header all adapt

### Test colorblind safety

1. Switch to each palette
2. Load a GFF track with multiple feature types
3. Verify you can distinguish all feature types

### Prepare a publication figure

1. Set theme to **Light**
2. Navigate to your gene of interest: `navigate chr17:7668421-7687490`
3. Zoom to show gene structure clearly
4. Filter to exons: `filter type=exon`
5. Take a screenshot - it's publication-ready!

### Accessibility check

1. Switch to **High-Contrast** theme
2. Navigate around the genome
3. Notice the bold borders and maximum contrast
4. This is how GBetter looks for users who need accessibility features
```

## Verification Checklist

- [ ] All three themes described accurately
- [ ] All three palettes described with use cases
- [ ] Accessibility features highlighted
- [ ] Print/publication guidance included
- [ ] Settings persistence explained
- [ ] "Try It Yourself" covers key features
- [ ] Follows style guide structure
