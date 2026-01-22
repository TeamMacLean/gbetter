# Plan: Update Tutorial 02 - Exploring Genes and Variants

**Target file**: `docs/tutorials/02-exploring-genes.md`
**Style guide**: `docs/TUTORIAL-STYLE-GUIDE.md`

## Current Issues

1. **Missing standard header** - Needs audience, time, prerequisites, last updated
2. **No real test data URLs** - Practice section mentions files that don't exist
3. **Missing "Try It Yourself" with actual data** - Should use R2-hosted test files
4. **Could mention remote VCF loading** - Major workflow improvement
5. **Gene tracks load automatically now** - Tutorial assumes manual loading

## Required Changes

### 1. Add Standard Header

Replace current intro with:

```markdown
# Tutorial 2: Exploring Genes and Variants

> **Audience**: Bench biologists working with gene lists and variants
> **Time**: 20-30 minutes
> **Prerequisites**: Basic familiarity with genome browsers ([Tutorial 1](01-getting-started.md) recommended)
> **Last updated**: Session 23 (2026-01-22)

## What You'll Learn
- Loading variant data (VCF files)
- Finding genes that contain variants
- Querying overlaps between genes and variants
- Visual inspection of variant positions
- Filtering by clinical significance
```

### 2. Update Scenario Section

Add note about automatic gene tracks:

```markdown
## Scenario

You're a wet lab scientist who just received:
- A VCF file with variants from a patient sample

You want to know: **Which genes have variants, and are any clinically significant?**

**Good news**: GBetter automatically loads gene/transcript tracks for the selected assembly, so you only need to load your variant data.
```

### 3. Simplify Step 1

Change from "Load Your Gene List" to focus on what's automatic:

```markdown
## Step 1: Verify Gene Tracks Are Loaded

GBetter automatically loads gene tracks for the selected assembly.

### Check the sidebar

You should see:
- **Transcripts** - Shows transcript structures with exons
- **Genes** (if available) - Shows gene-level features

If you don't see these tracks:
1. Check you're on a supported assembly (GRCh38, mm39, etc.)
2. Wait a moment for remote data to load
3. Try refreshing the page

### Optional: Load custom gene annotations

If you have your own gene list (BED or GFF3):
1. Drag and drop the file onto the canvas
2. Or use **File** tab in sidebar
```

### 4. Add Remote VCF Option in Step 2

```markdown
## Step 2: Load Your Variants

### Option A: Local VCF file

Drag and drop your VCF file onto the GBetter window.

### Option B: Remote VCF (tabix-indexed)

For large VCF files, use tabix-indexed remote loading:

1. Click the **URL** tab in the sidebar
2. Paste your `.vcf.gz` URL (index must be at same path as `.vcf.gz.tbi`)
3. Click **+** to add

Remote loading only fetches data for the current viewport - much faster for large files!
```

### 5. Replace Practice Exercise with Real Data

Replace the practice section at the end:

```markdown
## Try It Yourself

Let's analyze real E. coli variant data:

### Load the test VCF

1. Select assembly **E. coli K-12 MG1655** from the dropdown
2. Click the **URL** tab in sidebar
3. Paste this URL:
   ```
   https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.vcf.gz
   ```
4. Click **+** to add the track

### Explore the variants

```
# Navigate to a region with variants
navigate NC_000913.3:100000-200000

# Count variants in view
COUNT VARIANTS IN VIEW

# List all variants
list variants

# Zoom in to see variant details
zoom in
zoom in
```

### What you should see

- Variant markers on the canvas
- Click a variant to see its details (position, ref/alt alleles)
- At high zoom, you can see the exact nucleotide changes
```

### 6. Update Summary Section

Ensure it reflects current workflow:

```markdown
## Summary

Key points for variant analysis in GBetter:

1. **Gene tracks load automatically** - No need to find gene annotations
2. **Load your VCF** - Drag & drop or paste URL for tabix-indexed files
3. **Query overlaps** - Use `list genes with variants` or GQL SELECT
4. **Visual inspection** - Click results to navigate, zoom in to see details
5. **Filter by significance** - Use WHERE clauses for clinical filtering
```

## Verification

After editing:
- [ ] Header follows style guide format
- [ ] Notes that gene tracks load automatically
- [ ] Mentions both local and remote VCF loading
- [ ] "Try It Yourself" uses working R2 URLs
- [ ] All GQL examples are correct
- [ ] UI references match current app
