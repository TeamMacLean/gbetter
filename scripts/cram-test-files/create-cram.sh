#!/bin/bash
# Create a test CRAM file from existing BAM
# Requires: samtools, reference FASTA

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
BAM_DIR="$SCRIPT_DIR/../bam-test-files/output"

mkdir -p "$OUTPUT_DIR"

# Download E. coli K-12 reference if not present
REF_FASTA="$OUTPUT_DIR/ecoli-k12.fa"
if [ ! -f "$REF_FASTA" ]; then
    echo "Downloading E. coli K-12 reference..."
    curl -sL "https://ftp.ncbi.nlm.nih.gov/genomes/all/GCF/000/005/845/GCF_000005845.2_ASM584v2/GCF_000005845.2_ASM584v2_genomic.fna.gz" | gunzip > "$REF_FASTA"
    samtools faidx "$REF_FASTA"
fi

# Convert BAM to CRAM
echo "Converting BAM to CRAM..."
samtools view -C -T "$REF_FASTA" -o "$OUTPUT_DIR/cigar-test.cram" "$BAM_DIR/cigar-test.bam"

# Index CRAM
echo "Indexing CRAM..."
samtools index "$OUTPUT_DIR/cigar-test.cram"

echo "Created:"
ls -la "$OUTPUT_DIR"/*.cram* 2>/dev/null || echo "No CRAM files found"

echo ""
echo "Test with: samtools view $OUTPUT_DIR/cigar-test.cram NC_000913.3:100000-100100"
