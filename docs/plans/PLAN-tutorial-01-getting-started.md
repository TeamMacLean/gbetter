# Plan: Update Tutorial 01 - Getting Started

**Target file**: `docs/tutorials/01-getting-started.md`
**Style guide**: `docs/TUTORIAL-STYLE-GUIDE.md`

## Current Issues

1. **Missing standard header** - Needs audience, time, prerequisites, last updated
2. **Line 25**: Says "dark-themed interface" - now light theme is default
3. **Lines 155-161**: Format table incomplete - missing BigBed, BigWig, BAM, CRAM, tabix
4. **No mention of remote URL loading** - Major feature missing
5. **No mention of themes/settings** - Users should know they can customize
6. **No "Try It Yourself" section** - Should include real URLs per style guide
7. **File loading section outdated** - Still says "Load File button" but UI has File/URL tabs

## Required Changes

### 1. Add Standard Header

Replace current intro with:

```markdown
# Tutorial 1: Getting Started

> **Audience**: First-time users and students learning genomics
> **Time**: 15-20 minutes
> **Prerequisites**: A modern web browser (Chrome, Firefox, Safari, Edge)
> **Last updated**: Session 23 (2026-01-22)

## What You'll Learn
- Understanding the GBetter interface
- Navigating the genome (search, pan, zoom)
- Loading local and remote data files
- Using basic filters and highlights
- Customizing themes and colors
```

### 2. Fix Theme Reference (Line 25)

Change:
```
You'll see a dark-themed interface with:
```

To:
```
You'll see a clean interface with:
```

(Don't mention specific theme since it's configurable)

### 3. Update Format Table (Lines 155-161)

Replace with comprehensive table:

```markdown
### Supported formats

**Text formats** (drag & drop):
| Format | Extension | Contains |
|--------|-----------|----------|
| BED | .bed | Genomic intervals |
| GFF3 | .gff3, .gff | Gene annotations |
| VCF | .vcf | Variants |
| bedGraph | .bedgraph, .bg | Signal data |

**Binary formats** (drag & drop with index, or paste URL):
| Format | Extensions | Contains |
|--------|------------|----------|
| BigBed | .bb, .bigbed | Indexed intervals |
| BigWig | .bw, .bigwig | Indexed signal |
| BAM | .bam + .bai | Alignments |
| CRAM | .cram + .crai | Alignments (compressed) |
| Tabix | .vcf.gz + .tbi | Indexed VCF/GFF/BED |
```

### 4. Update File Loading Section

Replace "Option B: File picker" content with:

```markdown
**Option B: Sidebar File tab**

1. Look at the **Add Tracks** section in the sidebar
2. The **File** tab is selected by default
3. Click **Drop or browse** to select files
4. For BAM/CRAM/tabix, select both the data file AND index file together

**Option C: Remote URLs**

1. Click the **URL** tab in the sidebar
2. Paste a URL to a BigBed, BigWig, or BAM file
3. Click **+** to add the track
4. The index file is auto-discovered (must be at same URL path)
```

### 5. Add Themes Section (New Step)

Add after Step 8 (Highlighting):

```markdown
## Step 9: Customizing Appearance

GBetter offers multiple themes and color palettes.

### Opening Settings

Click the **Settings** button (gear icon) in the header.

### Changing theme

In the **Display** tab:
- **Light** (default) - Clean, print-ready
- **Dark** - Easier on eyes in low light
- **High-Contrast** - Maximum readability

### Changing color palette

Choose from colorblind-safe palettes:
- **Set2** (default) - Soft, distinct colors
- **Dark2** - Bolder colors
- **Paired** - High contrast pairs

Changes apply immediately and persist across sessions.
```

### 6. Add "Try It Yourself" Section

Add before "What's Next?":

```markdown
## Try It Yourself

Load a remote BAM file to see alignments:

1. Select assembly **E. coli K-12 MG1655** from the assembly dropdown
2. Click the **URL** tab in the sidebar
3. Paste this URL:
   ```
   https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.bam
   ```
4. Click **+** to add the track
5. Navigate to `NC_000913.3:100000-100500`
6. Zoom in to see individual reads

You've just loaded remote alignment data without downloading anything!
```

### 7. Update Quick Reference Table

Add new entries:
```markdown
| Load remote file | Sidebar URL tab, paste URL |
| Change theme | Settings > Display |
```

## Verification

After editing:
- [ ] Header follows style guide format
- [ ] No "dark theme" references (unless in themes section)
- [ ] Format table includes all supported formats
- [ ] File loading mentions File tab, URL tab, index files
- [ ] Themes section exists
- [ ] "Try It Yourself" has working R2 URL
- [ ] All UI references match current app

## GitHub Markdown Enhancements

Add these alerts throughout the tutorial:

### Tips
```markdown
> [!TIP]
> Press `/` on your keyboard to quickly focus the search bar.
```

```markdown
> [!TIP]
> Scroll with your mouse wheel to zoom in and out quickly.
```

### Notes
```markdown
> [!NOTE]
> Gene tracks load automatically for most assemblies. You don't need to find gene annotations yourself.
```

### Warnings
```markdown
> [!WARNING]
> Chromosome names must match between your files and the assembly (e.g., `chr1` vs `1`).
```

### Collapsible FAQ
Convert the "Common Questions" section to collapsible items:

```markdown
<details>
<summary>Why can't I find my gene?</summary>

GBetter has a built-in index of common genes. If your gene isn't found:
- Check the spelling
- Try the official gene symbol (BRCA1, not "breast cancer gene")
- Load a GFF3 file containing your gene annotations

</details>
```
