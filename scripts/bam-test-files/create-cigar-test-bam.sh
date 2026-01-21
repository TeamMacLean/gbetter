#!/bin/bash
# Create test BAM file with varied CIGAR operations for rendering tests
# Requires: samtools (brew install samtools)
#
# This BAM contains reads specifically designed to test:
# - Insertions (I) - green markers
# - Deletions (D) - gap lines
# - Soft clips (S) - trimmed ends
# - Mismatches - red background (vs E. coli reference)
# - Varying quality scores - opacity differences

set -e

if ! command -v samtools &> /dev/null; then
    echo "Error: samtools is required. Install with:"
    echo "  brew install samtools"
    exit 1
fi

OUTDIR="$(dirname "$0")/output"
mkdir -p "$OUTDIR"

CHROM="NC_000913.3"
CHROM_LENGTH=4641652

echo "Creating CIGAR test BAM for E. coli K-12 ($CHROM)..."

# Create SAM header
cat > "$OUTDIR/cigar-test.sam" << 'SAMEOF'
@HD	VN:1.6	SO:coordinate
@SQ	SN:NC_000913.3	LN:4641652
@RG	ID:cigar_test	SM:cigar_sample	PL:ILLUMINA
@PG	ID:synthetic	PN:cigar_test_generator	VN:1.0
SAMEOF

# Helper: generate quality string of given length
# I=40 (high), 5=20 (medium), +=10 (low)
gen_qual_high() { printf 'I%.0s' $(seq 1 $1); }
gen_qual_med()  { printf '5%.0s' $(seq 1 $1); }
gen_qual_low()  { printf '+%.0s' $(seq 1 $1); }

# ============================================
# Region 1: Simple matches at position 100000
# Baseline - all 50M with 50bp sequences
# ============================================
echo "Adding simple match reads..."
cat >> "$OUTDIR/cigar-test.sam" << EOF
simple_match_01	0	${CHROM}	100000	60	50M	*	0	0	ATGAAACGCATTAGCACCACCATTACCACCACCATCACCATTACCACAGG	$(gen_qual_high 50)	RG:Z:cigar_test
simple_match_02	0	${CHROM}	100010	60	50M	*	0	0	TTAGCACCACCATTACCACCACCATCACCATTACCACAGGTAACGGTGCG	$(gen_qual_high 50)	RG:Z:cigar_test
simple_match_03	16	${CHROM}	100020	60	50M	*	0	0	CCATTACCACCACCATCACCATTACCACAGGTAACGGTGCGGGCTGACGC	$(gen_qual_high 50)	RG:Z:cigar_test
EOF

# ============================================
# Region 2: Insertions at position 100050-100100
# I consumes query only, not reference
# ============================================
echo "Adding insertion reads..."
# 25M2I23M = 25+2+23 = 50bp query
cat >> "$OUTDIR/cigar-test.sam" << EOF
insertion_2bp_01	0	${CHROM}	100050	60	25M2I23M	*	0	0	ACCACCATCACCATTACCACAGGTTAACGGTGCGGGCTGACGCGTACAGG	$(gen_qual_high 50)	RG:Z:cigar_test
EOF
# 20M3I27M = 20+3+27 = 50bp query
cat >> "$OUTDIR/cigar-test.sam" << EOF
insertion_3bp_01	0	${CHROM}	100055	60	20M3I27M	*	0	0	CATCACCATTACCACAGGAAATAACGGTGCGGGCTGACGCGTACAGGAAA	$(gen_qual_high 50)	RG:Z:cigar_test
EOF
# 15M5I30M = 15+5+30 = 50bp query
cat >> "$OUTDIR/cigar-test.sam" << EOF
insertion_5bp_01	0	${CHROM}	100060	60	15M5I30M	*	0	0	CCATTACCACAGGGGGGGAACGGTGCGGGCTGACGCGTACAGGAAACACG	$(gen_qual_high 50)	RG:Z:cigar_test
EOF

# ============================================
# Region 3: Deletions at position 100100-100150
# D consumes reference only, not query
# ============================================
echo "Adding deletion reads..."
# 25M3D25M = 25+25 = 50bp query, spans 53bp on reference
cat >> "$OUTDIR/cigar-test.sam" << EOF
deletion_3bp_01	0	${CHROM}	100100	60	25M3D25M	*	0	0	TAACGGTGCGGGCTGACGCGTACAGGAAACACGGAAGTCAACGAGCAACG	$(gen_qual_high 50)	RG:Z:cigar_test
EOF
# 20M5D30M = 20+30 = 50bp query
cat >> "$OUTDIR/cigar-test.sam" << EOF
deletion_5bp_01	0	${CHROM}	100110	60	20M5D30M	*	0	0	CGGGCTGACGCGTACAGGAAACACGGAAGTCAACGAGCAACGGTAATGCC	$(gen_qual_high 50)	RG:Z:cigar_test
EOF
# 20M10D20M = 20+20 = 40bp query
cat >> "$OUTDIR/cigar-test.sam" << EOF
deletion_10bp_01	0	${CHROM}	100120	60	20M10D20M	*	0	0	GACGCGTACAGGAAACACGGCAACGAGCAACGGTAATGCC	$(gen_qual_high 40)	RG:Z:cigar_test
EOF

# ============================================
# Region 4: Soft clips at position 100150-100200
# S consumes query only (clipped bases)
# ============================================
echo "Adding soft clip reads..."
# 5S45M = 5+45 = 50bp query, 45bp aligned
cat >> "$OUTDIR/cigar-test.sam" << EOF
softclip_start_01	0	${CHROM}	100150	60	5S45M	*	0	0	NNNNNAAACACGGAAGTCAACGAGCAACGGTAATGCCGGGGGTTAGCGCG	$(gen_qual_high 50)	RG:Z:cigar_test
EOF
# 45M5S = 45+5 = 50bp query
cat >> "$OUTDIR/cigar-test.sam" << EOF
softclip_end_01	0	${CHROM}	100160	60	45M5S	*	0	0	CGGAAGTCAACGAGCAACGGTAATGCCGGGGGTTAGCGCGAAAAGNNNNN	$(gen_qual_high 50)	RG:Z:cigar_test
EOF
# 5S40M5S = 5+40+5 = 50bp query
cat >> "$OUTDIR/cigar-test.sam" << EOF
softclip_both_01	0	${CHROM}	100170	60	5S40M5S	*	0	0	NNNNNGTCAACGAGCAACGGTAATGCCGGGGGTTAGCGCGAAAAGNNNNN	$(gen_qual_high 50)	RG:Z:cigar_test
EOF

# ============================================
# Region 5: Mismatches at position 100200-100250
# All T's, G's, C's will mismatch reference
# ============================================
echo "Adding mismatch reads..."
cat >> "$OUTDIR/cigar-test.sam" << EOF
mismatch_allT_01	0	${CHROM}	100200	60	50M	*	0	0	TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT	$(gen_qual_high 50)	RG:Z:cigar_test
mismatch_allG_01	0	${CHROM}	100210	60	50M	*	0	0	GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG	$(gen_qual_high 50)	RG:Z:cigar_test
mismatch_allC_01	0	${CHROM}	100220	60	50M	*	0	0	CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC	$(gen_qual_high 50)	RG:Z:cigar_test
EOF

# ============================================
# Region 6: Varying quality scores at 100250-100300
# Same sequence, different quality = different opacity
# ============================================
echo "Adding quality variation reads..."
cat >> "$OUTDIR/cigar-test.sam" << EOF
quality_high_01	0	${CHROM}	100250	60	50M	*	0	0	ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTAC	$(gen_qual_high 50)	RG:Z:cigar_test
quality_med_01	0	${CHROM}	100260	60	50M	*	0	0	ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTAC	$(gen_qual_med 50)	RG:Z:cigar_test
quality_low_01	0	${CHROM}	100270	60	50M	*	0	0	ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTACGTAC	$(gen_qual_low 50)	RG:Z:cigar_test
EOF

# ============================================
# Region 7: Complex CIGAR at 100300-100350
# Multiple operations in single read
# ============================================
echo "Adding complex CIGAR reads..."
# 10M2I10M3D10M = 10+2+10+10 = 32bp query
cat >> "$OUTDIR/cigar-test.sam" << EOF
complex_cigar_01	0	${CHROM}	100300	60	10M2I10M3D10M	*	0	0	ACGTACGTACTTACGTACGTACACGTACGTAC	$(gen_qual_high 32)	RG:Z:cigar_test
EOF
# 5S10M2D10M3I10M5S = 5+10+10+3+10+5 = 43bp query
cat >> "$OUTDIR/cigar-test.sam" << EOF
complex_cigar_02	0	${CHROM}	100320	60	5S10M2D10M3I10M5S	*	0	0	NNNNNACGTACGTACACGTACGTACGGGACGTACGTAGNNNNN	$(gen_qual_high 43)	RG:Z:cigar_test
EOF

# ============================================
# Region 8: Dense coverage at 100350-100400
# Multiple overlapping reads for pileup testing
# ============================================
echo "Adding dense coverage reads..."
for i in $(seq 1 10); do
    pos=$((100350 + i * 2))
    cat >> "$OUTDIR/cigar-test.sam" << EOF
dense_read_$(printf '%02d' $i)	0	${CHROM}	${pos}	60	40M	*	0	0	ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGT	$(gen_qual_high 40)	RG:Z:cigar_test
EOF
done

# ============================================
# Convert to BAM and index
# ============================================
echo "Converting to BAM..."
samtools view -bS "$OUTDIR/cigar-test.sam" > "$OUTDIR/cigar-test.unsorted.bam"

echo "Sorting BAM..."
samtools sort "$OUTDIR/cigar-test.unsorted.bam" -o "$OUTDIR/cigar-test.bam"
rm "$OUTDIR/cigar-test.unsorted.bam"

echo "Indexing BAM..."
samtools index "$OUTDIR/cigar-test.bam"

# ============================================
# Verify
# ============================================
echo ""
echo "Verifying BAM file..."
samtools flagstat "$OUTDIR/cigar-test.bam"

echo ""
echo "Sample reads with CIGAR operations:"
samtools view "$OUTDIR/cigar-test.bam" | cut -f1,4,6 | column -t

echo ""
echo "=== Test files created in $OUTDIR ==="
ls -lh "$OUTDIR"/cigar-test.* 2>/dev/null || true

echo ""
echo "To upload to R2:"
echo "  rclone copy $OUTDIR/cigar-test.bam r2:gbetter-public/test/"
echo "  rclone copy $OUTDIR/cigar-test.bam.bai r2:gbetter-public/test/"
echo ""
echo "R2 URL will be:"
echo "  https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/cigar-test.bam"
echo ""
echo "Test regions in browser (E. coli K-12 assembly):"
echo "  Simple matches:  NC_000913.3:100000-100050"
echo "  Insertions:      NC_000913.3:100050-100100"
echo "  Deletions:       NC_000913.3:100100-100150"
echo "  Soft clips:      NC_000913.3:100150-100200"
echo "  Mismatches:      NC_000913.3:100200-100250"
echo "  Quality scores:  NC_000913.3:100250-100300"
echo "  Complex CIGAR:   NC_000913.3:100300-100350"
echo "  Dense coverage:  NC_000913.3:100350-100400"
