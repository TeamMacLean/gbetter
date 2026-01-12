# Tutorial 2: Exploring Genes and Variants

*For bench biologists working with gene lists and variants*

You've got results from an experiment - maybe a gene list from RNA-seq or a VCF from variant calling. This tutorial shows you how to explore these results in GBetter, find overlaps between datasets, and visually inspect regions of interest.

## What You'll Learn

- Loading multiple data tracks
- Finding genes with variants
- Querying overlaps between datasets
- Visual inspection of results
- Exporting findings

## Scenario

You're a wet lab scientist who just received:
- A BED file with 20 differentially expressed genes
- A VCF file with variants from a patient sample

You want to know: **Which of my genes have variants?**

---

## Step 1: Load Your Gene List

First, load your BED file containing gene regions.

### Drag and drop

1. Locate your BED file (e.g., `my-genes.bed`)
2. Drag it onto the GBetter window
3. Drop it on the canvas

### Verify it loaded

- A new track appears in the sidebar
- The track name shows your filename
- Features appear on the canvas

### BED file format reminder

Your BED file should look like this:

```
chr17   7668421   7687490   TP53
chr17   43044295  43170245  BRCA1
chr13   32315086  32400266  BRCA2
```

Columns: chromosome, start, end, name (optional)

---

## Step 2: Load Your Variants

Now add your VCF file.

### Drag and drop the VCF

1. Drag your VCF file onto GBetter
2. Drop it anywhere

### Verify variants loaded

- A second track appears
- Variants display as colored markers
- The track is named after your VCF file

### VCF compatibility

GBetter supports standard VCF format. Key fields used:
- CHROM, POS, ID, REF, ALT (required)
- QUAL, FILTER, INFO (optional but useful)
- Clinical significance (CLNSIG in INFO) for filtering

---

## Step 3: Find Genes with Variants

Now the exciting part - finding which genes contain variants.

### Natural language query

Type in the search bar:

```
show me genes with variants
```

GBetter translates this to GQL and shows results.

### GQL equivalent

```
list genes with variants
```

### Understanding the results

A results panel appears showing:
- Gene names
- Chromosomal locations
- Number of overlapping variants

Click any result to navigate directly to that gene.

---

## Step 4: Inspect a Specific Gene

Let's look at one gene in detail.

### Navigate to it

Click a gene in the results list, or type:

```
search gene BRCA1
```

### Zoom in

```
zoom in
zoom in
```

Or scroll up with your mouse.

### View the overlap

You should see:
- Your gene annotation (from BED)
- Variant markers (from VCF)
- The overlap is now visually obvious

---

## Step 5: Query Variants in a Gene

Get details about variants in a specific gene.

### List variants

```
list variants in BRCA1
```

### Results show

- Variant position
- Reference allele
- Alternate allele(s)
- Clinical significance (if in VCF)

### For any gene

Replace `BRCA1` with any gene name:

```
list variants in TP53
list variants in EGFR
list variants in MYC
```

---

## Step 6: Filter by Clinical Significance

If your VCF has clinical annotations, find the important ones.

### Find pathogenic variants

```
list pathogenic variants
```

### Or use SELECT syntax

```
SELECT VARIANTS WHERE significance = 'pathogenic'
SELECT VARIANTS WHERE significance CONTAINS 'pathogenic'
```

---

## Step 7: Highlight Regions of Interest

Mark regions you want to return to.

### Highlight a gene

```
highlight chr17:43044295-43170245
```

### Highlight around a variant

After finding an interesting variant at position chr17:43091570:

```
highlight chr17:43091000-43092000
```

### Clear when done

```
clear highlights
```

---

## Step 8: Advanced Queries

### Count variants per gene

```
SELECT GENES INTERSECT variants ORDER BY name ASC
```

Results include variant count in details column.

### Find most affected genes

```
SELECT GENES INTERSECT variants ORDER BY length DESC LIMIT 10
```

### Query specific tracks

```
SELECT GENES FROM my-genes INTERSECT variants IN VIEW
```

---

## Workflow Summary

Here's the complete workflow for analyzing genes with variants:

```
# 1. Load your files (drag and drop)

# 2. Get overview
list genes with variants

# 3. Check specific genes
list variants in TP53
list variants in BRCA1

# 4. Find pathogenic variants
list pathogenic variants

# 5. Visual inspection
search gene BRCA1
zoom in
filter type=exon

# 6. Mark interesting regions
highlight chr17:43091000-43092000
```

---

## Tips for Bench Biologists

### Start with questions

Ask GBetter in natural language:
- "What genes have variants?"
- "Show me variants in BRCA1"
- "Are there pathogenic variants?"

### Visual verification matters

After finding overlaps computationally, always zoom in to visually confirm. You might notice:
- Variants at splice sites
- Clusters of variants
- UTR vs coding variants

### Filter to focus

When viewing complex regions:
- `filter type=CDS` - focus on coding changes
- `filter type=exon` - see exon boundaries
- `filter strand=+` or `strand=-` - separate strands

### Document your findings

Use highlights to mark regions, then take screenshots or note coordinates for your lab notebook.

---

## Common Issues

### "No variants found in gene X"

- The gene might not have variants (good news!)
- Check chromosome naming (chr17 vs 17)
- Verify the gene coordinates overlap with your VCF

### "Gene X not found"

- Check spelling (BRCA1, not Brca1)
- The gene might not be in the built-in index
- Load a GFF3 file with your gene annotations

### Variant track looks empty

- You might be viewing a chromosome with no variants
- Try zooming out
- Navigate to a chromosome mentioned in your VCF

### Tracks misaligned

- Ensure both files use the same genome assembly (e.g., GRCh38)
- Chromosome names must match (chr1 vs 1)

---

## What's Next?

- [Tutorial 3: Advanced Queries](03-advanced-queries.md) - Complex GQL queries
- [GQL Examples](../GQL-EXAMPLES.md) - More query patterns
- [GQL Manual](../GQL-MANUAL.md) - Complete reference

---

## Practice Exercise

Using sample data:

1. Load `sample-genes.bed` from the test-data folder
2. Load `sample-variants.vcf` from the test-data folder
3. Find which genes have variants: `list genes with variants`
4. Navigate to one of the affected genes
5. List the specific variants: `list variants in GENENAME`
6. Zoom in to see the variant position relative to gene structure
7. Highlight the variant region

You've now mastered the core workflow for variant analysis!
