# Tutorial 1: Getting Started

*For first-time users and students learning genomics*

Welcome to GBetter! This tutorial will walk you through the basics of using a genome browser. By the end, you'll be able to navigate the genome, search for genes, and load your own data.

## What You'll Learn

- Opening GBetter and understanding the interface
- Searching for genes
- Navigating with pan and zoom
- Loading genomic data files
- Using basic filters

## Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- No installation or account required!

---

## Step 1: Opening GBetter

Open GBetter in your web browser. You'll see a dark-themed interface with:

- **Header** (top): Search bar and navigation controls
- **Sidebar** (left): Track list and file loading
- **Main area** (center): Genomic visualization canvas
- **Footer**: Current coordinates display

The browser starts with a default view of chromosome 1 in the human genome.

---

## Step 2: Searching for a Gene

Let's find TP53, a famous tumor suppressor gene often mutated in cancer.

### Using the search bar

1. Click the search bar at the top (or press `/` on your keyboard)
2. Type: `TP53`
3. Press Enter

GBetter navigates to chromosome 17 where TP53 is located. You should see the coordinate display change to something like `chr17:7,668,421-7,687,490`.

### What just happened?

When you typed `TP53`, GBetter:

1. Recognized it as a gene name
2. Looked up its coordinates (chr17:7668421-7687490)
3. Navigated the view to show that region

---

## Step 3: Zooming In and Out

### Using buttons

- Click the **+** button to zoom in (see more detail)
- Click the **-** button to zoom out (see more context)

### Using your mouse/trackpad

- **Scroll up** to zoom in
- **Scroll down** to zoom out

### Using commands

Type in the search bar:

```
zoom in
```

or

```
zoom out
```

### Try it!

Zoom in several times until you can see individual features (exons, CDS regions). Then zoom out to see the gene in its genomic context.

---

## Step 4: Panning

Move left or right along the chromosome.

### Using your mouse

Click and drag on the canvas to pan.

### Using commands

```
pan left 10kb
pan right 10kb
```

### Try it!

Pan around to explore the region near TP53. What other genes are nearby?

---

## Step 5: Loading a Data File

GBetter can display your own genomic data. Let's try loading a file.

### Supported formats

| Format | Extension | Contains |
|--------|-----------|----------|
| BED | .bed | Genomic intervals |
| GFF3 | .gff3, .gff | Gene annotations |
| VCF | .vcf | Variants |
| bedGraph | .bedgraph, .bg | Signal data |

### Loading a file

**Option A: Drag and drop**

1. Find a genomic file on your computer
2. Drag it onto the GBetter window
3. Drop it anywhere on the canvas

**Option B: File picker**

1. Click the "Load File" button in the sidebar
2. Select your file
3. Click Open

### What happens next?

Your data appears as a new track below the main view. Each track shows a different type of information at the same genomic position.

---

## Step 6: Using Filters

When viewing gene annotations (GFF3 files), you can filter to focus on specific feature types.

### Show only exons

```
filter type=exon
```

Exons (coding parts of genes) appear bright; everything else dims.

### Show only coding sequences

```
filter type=CDS
```

### Show features on a specific strand

```
filter strand=+
```

Shows features on the plus (forward) strand.

### Clear filters

```
clear filters
```

Returns to showing all features normally.

---

## Step 7: Highlighting Regions

Mark regions of interest with highlights.

### Highlight a region

```
highlight chr17:7670000-7675000
```

A colored overlay appears over that region.

### Clear highlights

```
clear highlights
```

---

## Quick Reference

| Action | How |
|--------|-----|
| Search for gene | Type gene name, press Enter |
| Go to coordinates | Type `chr17:1000000-2000000` |
| Zoom in | Scroll up, or type `zoom in` |
| Zoom out | Scroll down, or type `zoom out` |
| Pan | Click and drag, or type `pan left 10kb` |
| Load file | Drag and drop |
| Filter features | Type `filter type=exon` |
| Clear filters | Type `clear filters` |
| Highlight region | Type `highlight chr17:1000-2000` |

---

## Common Questions

### Q: Why can't I find my gene?

GBetter has a built-in index of common human genes. If your gene isn't found:
- Check the spelling
- Try the official gene symbol (BRCA1, not "breast cancer gene")
- Load a GFF3 file containing your gene annotations

### Q: My file won't load!

Check that:
- The file has the correct extension (.bed, .gff3, .vcf, .bedgraph)
- The file isn't too large (stay under 100MB for best performance)
- The chromosome names match (chr1 vs 1)

### Q: Everything disappeared!

You might have zoomed out too far. Try:
- Searching for a gene to navigate back
- Type `navigate chr1:1-1000000` for a default view

### Q: The tracks overlap!

Each track needs space. Try:
- Closing tracks you don't need
- Zooming out for a wider view

---

## What's Next?

Now that you know the basics, explore these topics:

- [Tutorial 2: Exploring Genes](02-exploring-genes.md) - Work with variant data
- [GQL Examples](../GQL-EXAMPLES.md) - More commands to try
- [GQL Manual](../GQL-MANUAL.md) - Complete command reference

---

## Practice Exercise

Try this sequence on your own:

1. Navigate to BRCA1: `search gene BRCA1`
2. Zoom in 3 times
3. Filter to show only exons: `filter type=exon`
4. Pan left to see more of the gene
5. Clear the filter: `clear filters`
6. Highlight a region of interest

Congratulations! You've learned the fundamentals of genome browsing.
