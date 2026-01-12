# Tutorial 3: Advanced Queries

*For bioinformaticians doing QC and complex analysis*

You're doing QC on sequencing data or complex multi-track analysis. This tutorial covers advanced GQL queries, working with multiple track types, filtering by numeric values, and efficient analysis workflows.

## What You'll Learn

- SELECT query syntax in depth
- Working with multiple track types
- Numeric filtering (scores, lengths)
- INTERSECT and WITHIN clauses
- ORDER BY and LIMIT
- Counting and summarizing data

## Scenario

You're a bioinformatician doing QC on ChIP-seq data. You have:
- Peak calls (BED with scores)
- Signal track (bedGraph)
- Gene annotations (GFF3)

You need to check peak quality and promoter overlap.

---

## Step 1: Load Multiple Track Types

Load all three files by dragging and dropping:

1. `peaks.bed` - Your ChIP-seq peaks with scores
2. `signal.bedgraph` - Coverage/signal track
3. `genes.gff3` - Gene annotations

### Verify tracks loaded

You should see three tracks in the sidebar:
- Interval track (peaks)
- Signal track (bedGraph)
- Gene model track (GFF3)

---

## Step 2: SELECT Query Anatomy

The SELECT query is GBetter's most powerful command.

### Basic syntax

```
SELECT <what> [FROM <track>] [clauses...]
```

### What to select

| Keyword | Selects |
|---------|---------|
| GENES | Gene features |
| VARIANTS | Variant features |
| FEATURES | All feature types |
| * | Everything |
| ALL | Everything |

### Available clauses

| Clause | Purpose |
|--------|---------|
| FROM track | Source track |
| INTERSECT track | Require overlap |
| WITHIN region | Inside region |
| WHERE conditions | Filter by fields |
| IN scope | Limit to view/chromosome |
| ORDER BY field | Sort results |
| LIMIT n | Max results |

---

## Step 3: Filtering by Score

BED files often include scores. Query high-confidence peaks.

### Find high-scoring peaks

```
SELECT FEATURES FROM peaks WHERE score > 100
```

### Score thresholds

```
SELECT FEATURES FROM peaks WHERE score >= 500
SELECT FEATURES FROM peaks WHERE score > 50 AND score < 200
```

### Count by score range

```
COUNT FEATURES FROM peaks WHERE score > 100
COUNT FEATURES FROM peaks WHERE score <= 50
```

---

## Step 4: INTERSECT Queries

Find features that overlap between tracks.

### Peaks overlapping genes

```
SELECT FEATURES FROM peaks INTERSECT genes
```

### Genes with peaks

```
SELECT GENES INTERSECT peaks
```

### Count overlaps

```
COUNT GENES INTERSECT peaks
COUNT FEATURES FROM peaks INTERSECT genes
```

### With score filter

```
SELECT FEATURES FROM peaks WHERE score > 100 INTERSECT genes
```

---

## Step 5: WITHIN Queries

Find features inside a gene or region.

### Features within a gene

```
SELECT FEATURES WITHIN TP53
SELECT FEATURES FROM peaks WITHIN BRCA1
```

### Features within a region

```
SELECT FEATURES WITHIN chr17:7668421-7687490
SELECT * FROM peaks WITHIN chr1:1000000-2000000
```

### Combined with filters

```
SELECT FEATURES FROM peaks WHERE score > 100 WITHIN TP53
```

---

## Step 6: IN Scope Queries

Limit queries to current view or chromosome.

### Current viewport

```
SELECT GENES IN VIEW
SELECT FEATURES FROM peaks IN VIEW
```

### Current chromosome

```
SELECT GENES IN CHROMOSOME
SELECT VARIANTS IN CHROMOSOME
```

### Specific chromosome

```
SELECT GENES IN chr17
SELECT FEATURES FROM peaks IN chrX
```

### Specific region

```
SELECT GENES IN chr17:7000000-8000000
```

---

## Step 7: ORDER BY and LIMIT

Sort and limit results.

### Sort by name

```
SELECT GENES ORDER BY name ASC
SELECT GENES ORDER BY name DESC
```

### Sort by length

```
SELECT GENES ORDER BY length DESC
SELECT GENES ORDER BY (end - start) DESC
```

### Sort by position

```
SELECT FEATURES ORDER BY start ASC
```

### Top N results

```
SELECT GENES ORDER BY length DESC LIMIT 10
SELECT FEATURES FROM peaks WHERE score > 100 ORDER BY score DESC LIMIT 20
```

---

## Step 8: Complex Combined Queries

### Top 10 longest genes with peaks

```
SELECT GENES INTERSECT peaks ORDER BY length DESC LIMIT 10
```

### High-scoring peaks in genes, current view

```
SELECT FEATURES FROM peaks WHERE score > 100 INTERSECT genes IN VIEW
```

### Count genes with high-scoring peaks

```
COUNT GENES INTERSECT (SELECT FROM peaks WHERE score > 100)
```

Or simpler:

```
SELECT GENES INTERSECT peaks WHERE score > 100
```

### Promoter regions with peaks

If you have a promoter track:

```
SELECT FEATURES FROM promoters INTERSECT peaks ORDER BY score DESC
```

---

## Step 9: Working with Gene Structures

### Filter to specific feature types

```
filter type=exon
filter type=CDS
filter type=UTR
```

### Query specific feature types

In SELECT queries, use WHERE:

```
SELECT FEATURES WHERE type = 'exon' IN VIEW
SELECT FEATURES WHERE type = 'CDS' AND strand = '+'
```

### Count feature types

```
COUNT FEATURES WHERE type = 'exon'
COUNT FEATURES WHERE type = 'CDS'
```

---

## Step 10: Strand-Specific Analysis

### Filter by strand

```
filter strand=+
filter strand=-
```

### Query by strand

```
SELECT GENES WHERE strand = '+' IN VIEW
SELECT FEATURES WHERE strand = '-' ORDER BY start ASC
```

### Separate strand counts

```
COUNT GENES WHERE strand = '+'
COUNT GENES WHERE strand = '-'
```

---

## QC Workflow Example

Complete workflow for ChIP-seq peak QC:

```
# 1. Load tracks (drag and drop peaks.bed, signal.bedgraph, genes.gff3)

# 2. Check total peak count
COUNT FEATURES FROM peaks

# 3. Check score distribution
COUNT FEATURES FROM peaks WHERE score > 100
COUNT FEATURES FROM peaks WHERE score > 500
COUNT FEATURES FROM peaks WHERE score > 1000

# 4. Find peaks in promoters (if you have promoter track)
SELECT FEATURES FROM peaks INTERSECT promoters

# 5. Check gene overlap
COUNT GENES INTERSECT peaks
SELECT GENES INTERSECT peaks ORDER BY name ASC

# 6. Find top peaks
SELECT FEATURES FROM peaks ORDER BY score DESC LIMIT 20

# 7. Visual inspection of top hits
# Click results to navigate, or:
navigate chr17:7668421-7687490
zoom in

# 8. Check specific regions of interest
SELECT FEATURES FROM peaks WITHIN TP53
SELECT FEATURES FROM peaks WITHIN BRCA1
```

---

## Performance Tips

### Use IN VIEW for large datasets

```
SELECT GENES IN VIEW              # Fast - limited scope
SELECT GENES                      # Slower - all genes
```

### LIMIT large result sets

```
SELECT FEATURES ORDER BY score DESC LIMIT 100
```

### Filter early in query

```
SELECT FEATURES FROM peaks WHERE score > 100 INTERSECT genes
# Better than:
SELECT FEATURES FROM peaks INTERSECT genes WHERE score > 100
```

---

## Troubleshooting

### "Track not found"

Check track names in the sidebar. Use exact name:

```
SELECT * FROM sample-genes.bed    # Use exact filename
```

### Empty results

- Check chromosome naming (chr1 vs 1)
- Verify tracks are loaded
- Try broader query first, then add filters

### Slow queries

- Add IN VIEW to limit scope
- Add LIMIT to cap results
- Use indexed tracks when available

---

## What's Next?

- [Tutorial 4: Non-Model Genomes](04-non-model-genomes.md) - Custom assemblies
- [Tutorial 5: Reproducible Analysis](05-reproducible-analysis.md) - Save and share
- [GQL Manual](../GQL-MANUAL.md) - Complete reference

---

## Practice Exercises

### Exercise 1: Peak Analysis

```
# Load peaks.bed with scores
# Find high-confidence peaks
SELECT FEATURES FROM peaks WHERE score > 500 ORDER BY score DESC LIMIT 10
```

### Exercise 2: Gene Overlap

```
# Load genes.gff3
# Find genes with peaks
SELECT GENES INTERSECT peaks ORDER BY length DESC
```

### Exercise 3: Multi-Filter

```
# Combine multiple conditions
SELECT FEATURES WHERE type = 'exon' AND strand = '+' IN VIEW
```

You're now ready for advanced genomic analysis in GBetter!
