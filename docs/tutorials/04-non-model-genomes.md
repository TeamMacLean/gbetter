# Tutorial 4: Non-Model Genomes

*For domain experts working with any organism*

GBetter is species-agnostic. Whether you study wheat pathogens, fruit flies, or marine bacteria, this tutorial shows you how to work with custom genome assemblies and non-standard chromosome names.

## What You'll Learn

- Selecting genome assemblies
- Loading custom chromosome sizes
- Working with non-standard chromosome names
- Handling chromosome mismatches
- Inferring assembly from data

## Scenario

You're a plant pathologist studying *Zymoseptoria tritici*, a fungal wheat pathogen. Your genome has chromosomes named differently than human (e.g., `chromosome_7` instead of `chr7`), and you have custom gene annotations.

---

## Step 1: Understanding Assemblies

A genome assembly defines:
- Which chromosomes exist
- How long each chromosome is
- The chromosome naming convention

### Human assemblies

Most examples use human:
- **GRCh38** (hg38) - Current standard
- **GRCh37** (hg19) - Legacy, still common

### Non-human assemblies

GBetter supports many organisms:
- Mouse (GRCm39, GRCm38)
- *Drosophila melanogaster*
- *Arabidopsis thaliana*
- *E. coli*
- And many more...

---

## Step 2: Selecting an Assembly

### Using the assembly dropdown

1. Click the assembly button in the header (shows "GRCh38" by default)
2. Browse or search for your organism
3. Click to select

### Built-in assemblies

GBetter includes common assemblies organized by category:

| Category | Examples |
|----------|----------|
| Human | GRCh38, GRCh37 |
| Model organisms | Mouse, Fly, Worm, Zebrafish, Yeast |
| Plants | Arabidopsis, Rice, Maize |
| Bacteria | E. coli, common pathogens |

### After selecting

- Chromosome dropdown updates to show new chromosomes
- Navigation uses appropriate coordinate ranges
- Default view adjusts

---

## Step 3: Custom Assemblies

If your organism isn't listed, you have options.

### Option A: Infer from data

Load your data file first, and GBetter will offer to create an assembly from the chromosomes it finds.

1. Load your GFF3 or BED file
2. If chromosomes don't match, a dialog appears
3. Choose "Infer from data"
4. GBetter creates an assembly from your file

### Option B: Load chrom.sizes

A `chrom.sizes` file lists chromosome names and lengths:

```
chromosome_1    6150000
chromosome_2    3870000
chromosome_3    3700000
chromosome_4    2580000
chromosome_5    1820000
chromosome_6    1730000
chromosome_7    1450000
```

To use it:

1. Click "Load Assembly" in assembly dropdown
2. Select your `.chrom.sizes` file
3. The assembly is created automatically

### Creating a chrom.sizes file

If you have a FASTA file:

```bash
# Using samtools
samtools faidx genome.fasta
cut -f1,2 genome.fasta.fai > genome.chrom.sizes
```

Or manually create one in any text editor.

---

## Step 4: Chromosome Name Conventions

Different genomes use different naming conventions.

### Common patterns

| Organism | Convention | Example |
|----------|------------|---------|
| Human | chr prefix | chr1, chr2, chrX |
| Some bacteria | No prefix | 1, 2, plasmid |
| Fungi | Descriptive | chromosome_1, chromosome_7 |
| Plants | Variable | Chr1, chr1, 1, scaffold_123 |

### Handling mismatches

If your data uses different names than the assembly:

**Your file**: `1, 2, 3, X, Y`
**Assembly expects**: `chr1, chr2, chr3, chrX, chrY`

GBetter will warn you and offer to:
1. **Infer assembly** - Create new assembly from your data
2. **Continue anyway** - Hope for partial matches

---

## Step 5: Working with Your Data

Once the assembly matches, everything works normally.

### Load your annotations

```
# Drag and drop your GFF3 file
```

### Navigate to a chromosome

```
navigate chromosome_7:1-500000
```

Or use the chromosome dropdown.

### Search for genes

If your GFF3 has gene names:

```
# Gene search works with any name in your data
search gene ZtEFFECTOR1
```

---

## Step 6: Verifying Data Alignment

Always verify your data loaded correctly.

### Check chromosome coverage

After loading, navigate to different chromosomes:

```
navigate chromosome_1:1-100000
navigate chromosome_7:1-100000
```

Features should appear if your assembly matches.

### Check coordinate ranges

Your features should fit within chromosome boundaries:
- Feature at position 5,000,000 won't display if chromosome is only 3,000,000 bp

### Visual sanity check

- Gene models should have sensible sizes
- Exons should be smaller than genes
- No features outside chromosome bounds

---

## Step 7: Multiple Tracks with Custom Assembly

Once you have a working assembly, add more tracks.

### Important: Consistent chromosome names

All your files must use the **same** chromosome naming:

```
# All files should match:
genes.gff3:    chromosome_7  ...
variants.vcf:  chromosome_7  ...
peaks.bed:     chromosome_7  ...
```

### Loading additional tracks

Just drag and drop. GBetter uses your current assembly for all tracks.

---

## Organism-Specific Tips

### Bacteria

Bacterial genomes often have:
- Single circular chromosome
- Plasmids as separate sequences
- No "chr" prefix

```
navigate chromosome:1-1000000
navigate plasmid_pABC:1-50000
```

### Fungi

Fungal genomes vary widely:
- Core chromosomes
- Accessory chromosomes
- Unusual naming schemes

```
navigate chr7:1-1000000
navigate chr_dispensable_1:1-500000
```

### Plants

Plant genomes can be large with many scaffolds:
- Numbered chromosomes
- Unplaced scaffolds
- Organelle genomes (chloroplast, mitochondria)

```
navigate Chr1:1-10000000
navigate scaffold_123:1-50000
navigate chloroplast:1-150000
```

---

## Troubleshooting

### "No features visible"

1. Check chromosome names match between assembly and data
2. Verify coordinate ranges are valid
3. Try navigating to a specific position you know has data

### "Chromosome not found"

The chromosome in your navigation doesn't exist in the assembly:
- Check spelling (case-sensitive!)
- Verify the assembly was loaded correctly
- List available chromosomes in the dropdown

### "Features extend beyond chromosome"

Your features have coordinates larger than the chromosome length:
- Verify your chrom.sizes file is correct
- Check you're using the right genome version

### Tracks don't align

Different tracks use different chromosome names:
- Standardize names in your files
- Or load each file and infer separate assemblies

---

## Complete Workflow Example

Setting up *Zymoseptoria tritici* analysis:

```
# 1. Load chromosome sizes
#    Click Assembly dropdown → Load Assembly → select ztritici.chrom.sizes

# 2. Verify assembly loaded
#    Chromosome dropdown should show: chromosome_1, chromosome_2, etc.

# 3. Navigate to a chromosome
navigate chromosome_7:1-500000

# 4. Load your gene annotations
#    Drag and drop ztritici_genes.gff3

# 5. Verify genes loaded
#    Features should appear on the canvas

# 6. Search for a specific gene
search gene ZtEffector1

# 7. Filter to see coding sequences
filter type=CDS

# 8. Add more data
#    Drag and drop variants.vcf, expression.bedgraph, etc.
```

---

## What's Next?

- [Tutorial 5: Reproducible Analysis](05-reproducible-analysis.md) - Save and share
- [GQL Manual](../GQL-MANUAL.md) - Complete reference
- [GQL Examples](../GQL-EXAMPLES.md) - More query patterns

---

## Practice with Test Data

GBetter includes E. coli test data:

1. Load the assembly: `test-data/ecoli.chrom.sizes`
2. Load genes: `test-data/ecoli-genes.gff3`
3. Navigate: `navigate U00096.3:1-100000`
4. Explore!

This lets you practice the non-model genome workflow without needing your own data.
