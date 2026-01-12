# Tutorial 5: Reproducible Analysis

*For power users who need to save, share, and reproduce their work*

Science requires reproducibility. This tutorial covers how to save your analysis state, share views with collaborators, and create reproducible query workflows in GBetter.

## What You'll Learn

- Understanding URL state persistence
- Sharing views via URL
- Saving and loading queries
- Creating analysis scripts
- Best practices for reproducibility

## Why Reproducibility Matters

In genomics research, you need to:
- Return to exact views later
- Share findings with collaborators
- Document what you found and how
- Reproduce analyses for publications

GQL ensures every action is recorded as a reproducible command.

---

## Step 1: URL State

GBetter stores your viewport state in the URL.

### What's in the URL

```
https://gbetter.example.com/?chr=chr17&start=7668421&end=7687490
```

This encodes:
- Current chromosome
- Start position
- End position

### Copying your current view

1. Navigate to a region of interest
2. Copy the URL from your browser's address bar
3. Share that URL

### Opening a shared URL

When someone opens your URL, they see exactly the same genomic region.

---

## Step 2: Sharing Views

### Basic sharing

After navigating to a region:

1. Copy the URL
2. Send to collaborator via email, Slack, etc.
3. They paste it in their browser

### With loaded tracks

URL state currently captures **viewport only**. For full reproducibility:

1. Share the URL
2. Also share your data files
3. Include instructions: "Load sample.vcf, then open this URL"

### Future: Full session sharing

*Coming soon: URLs that encode loaded tracks and filters*

---

## Step 3: GQL for Reproducibility

Every action in GBetter can be expressed as GQL.

### Natural language → GQL

When you type natural language, GBetter shows the GQL translation:

```
You typed: "show me genes with variants"
GQL: list genes with variants
```

### Save the GQL, not the English

For reproducibility, save the GQL command:

```
# Reproducible - always works
list genes with variants

# Not reproducible - might translate differently
"what genes have variants in them?"
```

---

## Step 4: Creating Analysis Scripts

Build a sequence of GQL commands for your analysis.

### Example: Variant Analysis Script

```gql
# Variant Analysis Workflow
# Date: 2024-01-15
# Data: sample.gff3, sample.vcf

# Navigate to region of interest
navigate chr17:7668421-7687490

# Get overview of variants
COUNT VARIANTS IN VIEW

# Find genes with variants
list genes with variants

# Check specific gene
list variants in TP53

# Filter to pathogenic
SELECT VARIANTS WHERE significance = 'pathogenic'

# Top affected genes
SELECT GENES INTERSECT variants ORDER BY length DESC LIMIT 10
```

### Save as a text file

Save your script as `my-analysis.gql` for future reference.

### Re-run analysis

Paste commands into GBetter's search bar one at a time to reproduce your workflow.

---

## Step 5: Query Console

For power users, the query console provides a persistent workspace.

### Opening the console

- Click the "GQL Console" button
- Or press `Cmd+\`` (backtick)

### Console features

- Multi-line query editing
- Query history
- Results panel
- Expandable view

### Running queries

1. Type or paste your query
2. Click "Run" or press `Cmd+Enter`
3. View results in the panel

---

## Step 6: Saved Queries

*Feature availability may vary*

### Saving a query

1. Write your query in the console
2. Click "Save Query"
3. Give it a name and description
4. Query is stored locally

### Loading saved queries

1. Click "Saved Queries" in the console
2. Browse your saved queries
3. Click to load

### Organizing queries

Group related queries:
- `variant-analysis/` - Variant-related queries
- `qc/` - Quality control checks
- `figures/` - Views for publication figures

---

## Step 7: Exporting Results

### Results as text

After running a query:
1. Results appear in the panel
2. Select and copy
3. Paste into your document

### Results as table

*Feature availability may vary*

Click "Export" to download results as:
- TSV (tab-separated)
- CSV (comma-separated)
- JSON

### Coordinates for other tools

Copy coordinates to use in other tools:

```
# From GBetter
chr17:7668421-7687490

# Use in samtools
samtools view aligned.bam chr17:7668421-7687490

# Use in bedtools
echo -e "chr17\t7668421\t7687490" > region.bed
```

---

## Step 8: Documentation Best Practices

### Document your analysis

Create a README for your analysis:

```markdown
# TP53 Variant Analysis

## Data files
- genes.gff3 - Gene annotations (GRCh38)
- patient.vcf - Patient variants

## GQL Commands

1. Navigate to TP53
   ```
   navigate chr17:7668421-7687490
   ```

2. Find variants
   ```
   list variants in TP53
   ```

3. Filter pathogenic
   ```
   SELECT VARIANTS WHERE significance = 'pathogenic'
   ```

## Results
Found 3 pathogenic variants in TP53:
- chr17:7674220 G>A (p.R248Q)
- chr17:7673802 G>A (p.R273H)
- chr17:7675088 C>T (p.R175H)
```

### Include session information

Record:
- GBetter version
- Date of analysis
- Data file versions/sources
- Genome assembly used

---

## Step 9: Collaboration Workflow

### For the analyst

1. Do your analysis
2. Save GQL commands to a script file
3. Document key findings
4. Share: URL + script + data files

### For the recipient

1. Open the shared URL
2. Load the same data files
3. Run the GQL script
4. Verify they see the same results

### Version control

Consider storing your `.gql` scripts in git:

```bash
git add analysis/variant-check.gql
git commit -m "Add TP53 variant analysis"
```

---

## Complete Reproducibility Checklist

For fully reproducible analysis:

- [ ] **Assembly**: Document which genome assembly (GRCh38, etc.)
- [ ] **Data files**: Share or document sources of all files
- [ ] **GQL script**: Save all commands used
- [ ] **URL state**: Capture key viewports
- [ ] **Results**: Export query results
- [ ] **Documentation**: Write README explaining the workflow

---

## Example: Publication-Ready Workflow

Preparing a figure for publication:

```gql
# Figure 2: TP53 Variants
# For: Smith et al., Journal of Genomics, 2024

# Exact viewport for figure
navigate chr17:7673700-7674500

# Load and filter
# (load patient.vcf manually)

# Show only exons for clarity
filter type=exon

# Highlight variant region
highlight chr17:7674200-7674250

# Take screenshot (manual step)
# Export as Figure_2_TP53_variants.png
```

Share this script with your co-authors so they can reproduce the exact view.

---

## Troubleshooting

### "My colleague sees something different"

Check:
- Same data files?
- Same genome assembly?
- URL copied correctly?
- Filters applied?

### "I can't find my saved query"

Saved queries are stored in browser local storage:
- Different browser = different storage
- Cleared browser data = lost queries
- Export important queries as `.gql` files

### "The URL is too long"

For complex state, URLs can get long:
- Use URL shorteners for sharing
- Or share as a script file instead

---

## What's Next?

You've completed all tutorials! For reference:

- [GQL Manual](../GQL-MANUAL.md) - Complete command reference
- [GQL Examples](../GQL-EXAMPLES.md) - More query patterns
- [README](../../README.md) - Project overview

---

## Summary

Reproducibility in GBetter:

| What | How |
|------|-----|
| Viewport | URL parameters |
| Commands | GQL scripts |
| Results | Export feature |
| Full session | URL + files + script |

Remember: **Save the GQL, share the URL, document everything.**
