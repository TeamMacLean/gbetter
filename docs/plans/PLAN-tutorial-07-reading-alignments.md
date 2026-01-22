# Plan: Create Tutorial 07 - Reading Alignments

**Target file**: `docs/tutorials/07-reading-alignments.md` (NEW)
**Style guide**: `docs/TUTORIAL-STYLE-GUIDE.md`

## Purpose

Teach users how to work with BAM and CRAM alignment files, understand the different rendering modes at different zoom levels, and interpret CIGAR operations.

## Document Structure

```markdown
# Tutorial 7: Reading Alignments (BAM/CRAM)

> **Audience**: Anyone analyzing sequencing data (RNA-seq, ChIP-seq, WGS, etc.)
> **Time**: 25-35 minutes
> **Prerequisites**: Basic GBetter navigation, understanding of sequencing concepts
> **Last updated**: Session 23 (2026-01-22)

## What You'll Learn
- Loading BAM and CRAM alignment files
- Understanding the three rendering modes (coverage, blocks, sequence)
- Interpreting CIGAR operations (matches, insertions, deletions)
- Identifying mismatches and variants
- Working with coverage histograms
```

## Content Outline

### Section 1: BAM vs CRAM

Brief explanation:
- **BAM**: Binary alignment format, widely used
- **CRAM**: Compressed BAM, smaller files, requires reference sequence
- GBetter supports both for local and remote files

### Section 2: Loading Alignment Files

#### Local files
```markdown
1. Click **File** tab in sidebar
2. Select your `.bam` file AND `.bam.bai` index together
3. For CRAM: select `.cram` AND `.cram.crai` together
4. Track appears in sidebar
```

#### Remote files
```markdown
1. Click **URL** tab in sidebar
2. Paste URL to BAM/CRAM file
3. Index is auto-discovered at same path
4. Click **+** to load
```

### Section 3: The Three Rendering Modes

This is the core educational content:

```markdown
## Understanding Zoom-Dependent Rendering

GBetter automatically switches rendering modes based on zoom level:

### Coverage Mode (zoomed out)

**When**: Viewing large regions (< 1 pixel per base)
**Shows**: Coverage histogram - read depth as an area chart
**Use for**: Overview of coverage across a region, finding peaks/gaps

[Describe what user sees: Y-axis shows depth, gradient fill, labels]

### Block Mode (medium zoom)

**When**: Viewing hundreds of bases (1-8 pixels per base)
**Shows**: Individual reads as rectangles with CIGAR decorations
**Use for**: Seeing read distribution, identifying structural variants

[Describe: reads as gray blocks, insertion triangles (green), deletion gaps]

### Sequence Mode (zoomed in)

**When**: Viewing ~50 bases or less (8+ pixels per base)
**Shows**: Actual nucleotide letters for each read
**Use for**: Verifying SNPs, checking sequence context, confirming variants

[Describe: colored letters A/C/G/T, mismatches highlighted in red]
```

### Section 4: CIGAR Operations Explained

Educational content about CIGAR:

```markdown
## Reading CIGAR Strings

CIGAR describes how a read aligns to the reference.

### Common operations

| Code | Name | What it means | How it looks |
|------|------|---------------|--------------|
| M | Match/Mismatch | Aligned to reference | Normal letter/block |
| I | Insertion | Extra bases in read | Green triangle marker |
| D | Deletion | Missing bases in read | Gap in the read |
| S | Soft clip | Bases not aligned | Shown at read ends |
| N | Skip | Large gap (e.g., intron) | Long connecting line |

### Example: 25M2I23M

This means:
- 25 bases match reference
- 2 bases inserted (not in reference)
- 23 more bases match reference

In GBetter, you'll see:
- Block mode: Read with small green triangle at position 25
- Sequence mode: Two extra letters at position 25
```

### Section 5: Identifying Variants

How to spot variants in alignment view:

```markdown
## Spotting Variants

### Mismatches (SNPs)

At sequence zoom:
- Mismatched bases show with **red background**
- If many reads show same mismatch = likely real variant
- If only one read = possible sequencing error

### Insertions

At block and sequence zoom:
- **Green triangle** marks insertion position
- Hover/click for details
- Multiple reads with same insertion = likely real

### Deletions

At block zoom:
- **Gap** in the read
- Reference sequence visible through gap
- Reads may show connecting line over deletion
```

### Section 6: Try It Yourself

Hands-on with real data:

```markdown
## Try It Yourself

### Load test BAM

1. Select assembly **E. coli K-12 MG1655**
2. Click **URL** tab, paste:
   ```
   https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.bam
   ```
3. Click **+** to add

### Explore rendering modes

```
# Start zoomed out - see coverage histogram
navigate NC_000913.3:1-500000

# Zoom to see block mode
navigate NC_000913.3:100000-100500

# Zoom to see sequence mode
navigate NC_000913.3:100000-100100
```

### Find features

At sequence zoom:
- Look for colored nucleotide letters
- Find any mismatches (red background)
- Look for insertion markers (green triangles)

### Check coverage

Zoom out and look at the coverage histogram:
- Where is coverage highest?
- Are there any gaps (no coverage)?
```

### Section 7: Working with CRAM

Additional notes for CRAM:

```markdown
## CRAM Files

CRAM files are smaller than BAM but require reference sequence.

### How GBetter handles CRAM

1. Load your CRAM file (local or URL)
2. GBetter automatically fetches reference from 2bit files
3. Reference is available for all 27+ built-in assemblies
4. Reads decode and display exactly like BAM

### When to use CRAM

- Large datasets where storage matters
- Sharing data (smaller transfers)
- Long-term archiving

### Limitations

- Slightly slower to load (needs reference fetch)
- Custom assemblies need 2bit reference file
```

### Section 8: Tips and Best Practices

```markdown
## Tips

- **Start zoomed out** to find interesting regions via coverage
- **Use coverage peaks** to identify enriched regions (ChIP-seq, etc.)
- **Verify variants** by zooming to sequence level
- **Check strand** - some analyses need strand-specific views
- **Compare to reference** - look for systematic mismatches
```

## Verification Checklist

- [ ] All three rendering modes explained clearly
- [ ] CIGAR operations table is accurate
- [ ] Example URLs work and show good test data
- [ ] Screenshots/descriptions match actual rendering
- [ ] CRAM section explains reference requirement
- [ ] Follows style guide structure

## GitHub Markdown Enhancements

Add these alerts throughout the tutorial:

### Tips
```markdown
> [!TIP]
> Start zoomed out to find interesting regions via the coverage histogram, then zoom in for details.
```

```markdown
> [!TIP]
> If many reads show the same mismatch, it's likely a real variant. Single-read mismatches may be sequencing errors.
```

### Important
```markdown
> [!IMPORTANT]
> GBetter automatically switches between coverage, block, and sequence rendering based on zoom level.
```

```markdown
> [!IMPORTANT]
> CRAM files require reference sequence. GBetter auto-fetches from 2bit files for built-in assemblies.
```

### Notes
```markdown
> [!NOTE]
> Green triangles mark insertions. Gaps in reads indicate deletions.
```

### Warnings
```markdown
> [!WARNING]
> For custom assemblies, CRAM decoding requires a 2bit reference file.
```

### Collapsible CIGAR Reference
```markdown
<details>
<summary>CIGAR Operation Reference</summary>

| Code | Name | Meaning | Visual |
|------|------|---------|--------|
| M | Match/Mismatch | Aligned to reference | Normal block/letter |
| I | Insertion | Extra bases in read | Green triangle |
| D | Deletion | Missing bases | Gap in read |
| S | Soft clip | Unaligned ends | Shown at read ends |
| N | Skip | Large gap (intron) | Connecting line |
| H | Hard clip | Trimmed from read | Not shown |

</details>
```

### Collapsible Zoom Level Details
```markdown
<details>
<summary>Rendering mode details</summary>

| Mode | Pixels/base | What you see |
|------|-------------|--------------|
| Coverage | < 1 | Histogram of read depth |
| Block | 1-8 | Read rectangles with CIGAR decorations |
| Sequence | 8+ | Nucleotide letters, mismatches highlighted |

</details>
```
