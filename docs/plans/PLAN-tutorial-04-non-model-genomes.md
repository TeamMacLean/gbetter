# Plan: Update Tutorial 04 - Non-Model Genomes

**Target file**: `docs/tutorials/04-non-model-genomes.md`
**Style guide**: `docs/TUTORIAL-STYLE-GUIDE.md`

## Current Issues

1. **Missing standard header** - Needs audience, time, prerequisites, last updated
2. **Assembly dropdown description outdated** - Now has taxonomic categories
3. **Built-in assemblies list incomplete** - Now 27+ with category headers
4. **Test data section references non-existent files**
5. **Missing mention of automatic gene tracks** for supported assemblies

## Required Changes

### 1. Add Standard Header

```markdown
# Tutorial 4: Non-Model Genomes

> **Audience**: Domain experts working with any organism
> **Time**: 20-30 minutes
> **Prerequisites**: Basic GBetter navigation ([Tutorial 1](01-getting-started.md))
> **Last updated**: Session 23 (2026-01-22)

## What You'll Learn
- Selecting from 27+ built-in genome assemblies
- Understanding the taxonomic assembly organization
- Loading custom chromosome sizes for unlisted genomes
- Handling chromosome name mismatches
- Working with non-standard naming conventions
```

### 2. Update Built-in Assemblies Section

Replace the simple table with comprehensive listing:

```markdown
## Step 2: Selecting an Assembly

### Using the assembly dropdown

1. Click the assembly button in the header (shows current assembly name)
2. The dropdown opens with assemblies organized by **taxonomic category**
3. Browse categories or scroll to find your organism
4. Click to select

### Built-in assemblies (27+)

GBetter includes assemblies organized by category:

| Category | Assemblies |
|----------|------------|
| **Animals** | |
| Human | GRCh38 (hg38), GRCh37 (hg19), T2T-CHM13 |
| Mouse | mm39, mm10 |
| Other vertebrates | Zebrafish (danRer11), Rat (rn7), Chicken (galGal6) |
| Invertebrates | Fly (dm6), Worm (ce11) |
| **Plants** | |
| Model plants | Arabidopsis (TAIR10) |
| Crops | Rice (IRGSP-1.0), Maize (Zm-B73-v5), Wheat (IWGSC), Barley (MorexV3) |
| **Fungi** | |
| Model fungi | S. pombe, S. cerevisiae (sacCer3) |
| Plant pathogens | Botrytis cinerea, Magnaporthe oryzae, Puccinia, Zymoseptoria tritici |
| **Protists** | |
| Oomycetes | Phytophthora infestans |
| **Bacteria** | |
| Model bacteria | E. coli K-12 MG1655 |
| **Viruses** | |
| Coronaviruses | SARS-CoV-2 |

### Automatic gene tracks

For most assemblies, gene/transcript tracks load automatically:
- **UCSC assemblies** (human, mouse, etc.): Transcript tracks from knownGene
- **Plant/fungal assemblies**: Gene and transcript tracks from R2 storage

If your assembly has automatic tracks, you'll see them in the sidebar after selection.
```

### 3. Update "After selecting" section

```markdown
### After selecting an assembly

When you select a new assembly:
1. **Chromosome dropdown updates** - Shows chromosomes for that genome
2. **Gene tracks load** - Automatic tracks appear (if available for that assembly)
3. **Reference sequence available** - Nucleotides display at high zoom
4. **View resets** - Navigates to a default position on the first chromosome
```

### 4. Update Test Data Section

Replace with working example:

```markdown
## Try It Yourself

### Explore E. coli (bacteria)

1. Select **E. coli K-12 MG1655** from the assembly dropdown (under Bacteria)
2. Notice the chromosome name: `NC_000913.3` (RefSeq accession)
3. Gene tracks load automatically
4. Navigate:
   ```
   navigate NC_000913.3:100000-110000
   ```
5. Zoom in to see gene structures

### Explore Arabidopsis (plant)

1. Select **TAIR10 (Arabidopsis)** from the dropdown (under Plants)
2. Notice chromosomes are named: `Chr1`, `Chr2`, etc.
3. Both Genes and Transcripts tracks load
4. Navigate:
   ```
   navigate Chr1:1000000-1100000
   ```

### Load custom data for Zymoseptoria

If you work with *Z. tritici*:

1. Select **Zymoseptoria tritici** from dropdown (under Fungi > Plant pathogens)
2. Gene tracks load automatically
3. Load your own VCF/BED/GFF files
4. Navigate using the chromosome names: `chr_1`, `chr_2`, etc.
```

### 5. Update Troubleshooting

Add note about automatic tracks:

```markdown
### "Gene track is empty"

Some assemblies have automatic gene tracks, others don't:
- Check the sidebar for "Transcripts" or "Genes" tracks
- If missing, you need to load your own GFF3 annotations
- Bacterial assemblies may only show CDS, not full gene models
```

## Verification

After editing:
- [ ] Header follows style guide format
- [ ] Assembly dropdown described with taxonomic categories
- [ ] All 27+ assemblies listed by category
- [ ] Mentions automatic gene tracks
- [ ] "Try It Yourself" uses real assemblies (no external files needed)
- [ ] Chromosome naming examples are accurate
