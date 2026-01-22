# Plan: Create Tutorial 06 - Loading Remote Tracks

**Target file**: `docs/tutorials/06-remote-tracks.md` (NEW)
**Style guide**: `docs/TUTORIAL-STYLE-GUIDE.md`

## Purpose

Teach users how to load genomic data directly from URLs without downloading files. This is a major feature that enables working with large datasets efficiently.

## Document Structure

```markdown
# Tutorial 6: Loading Remote Tracks

> **Audience**: Anyone working with large genomic datasets or shared data repositories
> **Time**: 15-20 minutes
> **Prerequisites**: Basic GBetter navigation ([Tutorial 1](01-getting-started.md))
> **Last updated**: Session 23 (2026-01-22)

## What You'll Learn
- Loading data directly from URLs (no download required)
- Supported remote formats (BigBed, BigWig, BAM, tabix)
- Understanding index files and auto-discovery
- Working with public data repositories
- CORS requirements for self-hosted data
```

## Content Outline

### Section 1: Why Remote Tracks?

Explain benefits:
- No need to download large files (BAM files can be gigabytes)
- Only fetches data for current viewport (efficient)
- Easy sharing - just share the URL
- Works with public repositories (UCSC, Ensembl, your own server)

### Section 2: Supported Formats

Table of remote-loadable formats:

| Format | Extensions | Index | Description |
|--------|------------|-------|-------------|
| BigBed | .bb, .bigbed | Built-in | Indexed intervals |
| BigWig | .bw, .bigwig | Built-in | Indexed signal/coverage |
| BAM | .bam | .bam.bai | Alignments |
| CRAM | .cram | .cram.crai | Compressed alignments |
| VCF | .vcf.gz | .vcf.gz.tbi | Tabix-indexed variants |
| GFF | .gff.gz, .gff3.gz | .tbi | Tabix-indexed annotations |
| BED | .bed.gz | .bed.gz.tbi | Tabix-indexed intervals |

### Section 3: How to Load a Remote Track

Step-by-step:
1. Click the **URL** tab in the sidebar (under Add Tracks)
2. Paste the URL to your data file
3. Click the **+** button
4. Wait for the track to load

Note about index files:
- BigBed/BigWig: Self-indexed, no extra file needed
- BAM: Index auto-discovered at `{url}.bai`
- Tabix: Index auto-discovered at `{url}.tbi`

### Section 4: Try It - Example URLs

Provide working examples for each format:

```markdown
## Try It Yourself

### Load a BigWig signal track

1. Select assembly **GRCh38**
2. Click **URL** tab in sidebar
3. Paste:
   ```
   https://hgdownload.soe.ucsc.edu/goldenPath/hg38/phyloP100way/hg38.phyloP100way.bw
   ```
4. Click **+**
5. Navigate to `chr17:7668421-7687490` (TP53)
6. See conservation scores across the gene

### Load E. coli test files

Select assembly **E. coli K-12 MG1655**, then try these URLs:

**VCF (variants)**:
```
https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.vcf.gz
```

**GFF (annotations)**:
```
https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.gff3.gz
```

**BAM (alignments)**:
```
https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.bam
```

Navigate to `NC_000913.3:100000-101000` to see all tracks.
```

### Section 5: Working with Public Repositories

Mention common sources:
- UCSC Genome Browser downloads
- Ensembl FTP
- ENCODE project
- Your institution's data server

Note: URL must be publicly accessible (or use browser credentials)

### Section 6: CORS Requirements

Explain for self-hosting:
- Remote URLs must allow cross-origin requests
- Server needs `Access-Control-Allow-Origin` header
- Cloudflare R2 and AWS S3 (with CORS config) work well
- If you get errors, check CORS settings

### Section 7: Troubleshooting

Common issues:
- "Failed to load" - Check URL is accessible, check CORS
- "Index not found" - Ensure index file is at expected path
- "No features visible" - Check chromosome names match assembly
- "Track loads but empty" - Navigate to a region with data

## Verification Checklist

- [ ] All example URLs tested and working
- [ ] Format table is complete and accurate
- [ ] CORS explanation is clear
- [ ] Troubleshooting covers common issues
- [ ] Follows style guide structure

## GitHub Markdown Enhancements

Add these alerts throughout the tutorial:

### Tips
```markdown
> [!TIP]
> Remote loading only fetches data for the current viewport - perfect for huge files.
```

```markdown
> [!TIP]
> BigBed and BigWig files are self-indexed - no separate index file needed.
```

### Important
```markdown
> [!IMPORTANT]
> Index files must be at the same URL path: `file.bam` needs `file.bam.bai` alongside it.
```

### Warnings
```markdown
> [!WARNING]
> Remote URLs must be CORS-enabled. If you get errors, check your server's CORS configuration.
```

### Notes
```markdown
> [!NOTE]
> Public repositories like UCSC and Ensembl are already CORS-enabled.
```

### Collapsible CORS Setup
```markdown
<details>
<summary>Setting up CORS for your own server</summary>

For **Cloudflare R2**:
- Public buckets have CORS enabled by default

For **AWS S3**:
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"]
  }]
}
```

For **nginx**:
```
add_header Access-Control-Allow-Origin *;
```

</details>
```
