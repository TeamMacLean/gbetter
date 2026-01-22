# Plan: Update Tutorial 03 - Advanced Queries

**Target file**: `docs/tutorials/03-advanced-queries.md`
**Style guide**: `docs/TUTORIAL-STYLE-GUIDE.md`

## Current Issues

1. **Missing standard header** - Needs audience, time, prerequisites, last updated
2. **No real test data** - References hypothetical files
3. **Could use real example data** - R2 test files would help
4. **Minor**: Gene tracks now load automatically

## Required Changes

### 1. Add Standard Header

Replace current intro:

```markdown
# Tutorial 3: Advanced Queries

> **Audience**: Bioinformaticians doing QC and complex multi-track analysis
> **Time**: 30-45 minutes
> **Prerequisites**: Comfortable with GQL basics ([Tutorial 1](01-getting-started.md))
> **Last updated**: Session 23 (2026-01-22)

## What You'll Learn
- SELECT query syntax in depth
- Filtering by numeric values (scores, lengths)
- INTERSECT and WITHIN clauses
- ORDER BY and LIMIT for result control
- Combining multiple query conditions
- Performance optimization tips
```

### 2. Update Scenario

Note that genes load automatically:

```markdown
## Scenario

You're a bioinformatician doing QC on ChIP-seq data. You have:
- Peak calls (BED with scores)
- Signal track (bedGraph)

The gene annotations load automatically from the selected assembly.

You need to check peak quality and promoter overlap.
```

### 3. Update Step 1

```markdown
## Step 1: Set Up Your Tracks

### Automatic tracks

GBetter loads gene/transcript tracks automatically. You should see:
- **Transcripts** in the sidebar

### Load your analysis files

Drag and drop your files:
1. `peaks.bed` - Your ChIP-seq peaks with scores
2. `signal.bedgraph` - Coverage/signal track (optional)

### Verify tracks loaded

You should see your tracks in the sidebar below the automatic gene tracks.
```

### 4. Add "Try It Yourself" Section

Add before "What's Next?":

```markdown
## Try It Yourself

Practice with E. coli test data:

### Setup

1. Select assembly **E. coli K-12 MG1655**
2. Load the test GFF (has genes with scores):
   ```
   https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.gff3.gz
   ```

### Practice queries

```
# Navigate to a gene-rich region
navigate NC_000913.3:100000-200000

# Count features in view
COUNT FEATURES IN VIEW

# Find features by type
SELECT FEATURES WHERE type = 'gene' IN VIEW

# Sort by position
SELECT FEATURES WHERE type = 'gene' ORDER BY start ASC LIMIT 10

# Count by strand
COUNT FEATURES WHERE strand = '+'
COUNT FEATURES WHERE strand = '-'
```

### Challenge

Write a query to find the 5 longest genes on the positive strand in the current view.

<details>
<summary>Solution</summary>

```
SELECT FEATURES WHERE type = 'gene' AND strand = '+' IN VIEW ORDER BY length DESC LIMIT 5
```

</details>
```

### 5. Minor Updates Throughout

- Change "Load all three files" to "Load your analysis files"
- Note that genes come from automatic tracks
- Ensure all GQL syntax is current

## Verification

After editing:
- [ ] Header follows style guide format
- [ ] Notes gene tracks are automatic
- [ ] "Try It Yourself" has working R2 URL
- [ ] All GQL examples are syntactically correct
- [ ] Performance tips section is accurate
