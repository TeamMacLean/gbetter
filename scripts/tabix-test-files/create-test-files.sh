#!/bin/bash
# Create small tabix-indexed test files for E. coli K-12
# Requires: htslib (brew install htslib)

set -e

# Check for required tools
if ! command -v bgzip &> /dev/null || ! command -v tabix &> /dev/null; then
    echo "Error: bgzip and tabix are required. Install with:"
    echo "  brew install htslib"
    exit 1
fi

OUTDIR="$(dirname "$0")/output"
mkdir -p "$OUTDIR"

CHROM="NC_000913.3"
CHROM_LENGTH=4641652

echo "Creating test files for E. coli K-12 ($CHROM)..."

# ============================================
# 1. Create test VCF file
# ============================================
echo "Creating VCF test file..."

cat > "$OUTDIR/ecoli-test.vcf" << EOF
##fileformat=VCFv4.2
##contig=<ID=${CHROM},length=${CHROM_LENGTH}>
##INFO=<ID=DP,Number=1,Type=Integer,Description="Total Depth">
##INFO=<ID=AF,Number=A,Type=Float,Description="Allele Frequency">
##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
${CHROM}	100000	rs001	A	G	30	PASS	DP=50;AF=0.5
${CHROM}	150000	rs002	C	T	45	PASS	DP=75;AF=0.3
${CHROM}	200000	rs003	G	A	60	PASS	DP=100;AF=0.8
${CHROM}	250000	rs004	T	C	55	PASS	DP=80;AF=0.4
${CHROM}	300000	rs005	A	T	40	PASS	DP=60;AF=0.6
${CHROM}	500000	rs006	G	C	70	PASS	DP=120;AF=0.2
${CHROM}	750000	rs007	C	G	35	PASS	DP=55;AF=0.7
${CHROM}	1000000	rs008	T	A	50	PASS	DP=90;AF=0.5
${CHROM}	1500000	rs009	A	C	65	PASS	DP=110;AF=0.3
${CHROM}	2000000	rs010	G	T	75	PASS	DP=130;AF=0.4
${CHROM}	2500000	rs011	C	A	80	PASS	DP=140;AF=0.6
${CHROM}	3000000	rs012	T	G	85	PASS	DP=150;AF=0.5
${CHROM}	3500000	rs013	A	G	90	PASS	DP=160;AF=0.7
${CHROM}	4000000	rs014	G	A	95	PASS	DP=170;AF=0.8
${CHROM}	4500000	rs015	C	T	100	PASS	DP=180;AF=0.9
EOF

bgzip -f "$OUTDIR/ecoli-test.vcf"
tabix -p vcf "$OUTDIR/ecoli-test.vcf.gz"
echo "  Created: ecoli-test.vcf.gz + .tbi"

# ============================================
# 2. Create test GFF file
# ============================================
echo "Creating GFF test file..."

cat > "$OUTDIR/ecoli-test.gff3" << EOF
##gff-version 3
##sequence-region ${CHROM} 1 ${CHROM_LENGTH}
${CHROM}	test	gene	100000	102000	.	+	.	ID=gene001;Name=testGeneA;biotype=protein_coding
${CHROM}	test	mRNA	100000	102000	.	+	.	ID=mRNA001;Parent=gene001;Name=testGeneA-RA
${CHROM}	test	exon	100000	100500	.	+	.	ID=exon001;Parent=mRNA001
${CHROM}	test	exon	101500	102000	.	+	.	ID=exon002;Parent=mRNA001
${CHROM}	test	CDS	100100	100500	.	+	0	ID=CDS001;Parent=mRNA001
${CHROM}	test	CDS	101500	101900	.	+	0	ID=CDS002;Parent=mRNA001
${CHROM}	test	gene	200000	205000	.	-	.	ID=gene002;Name=testGeneB;biotype=protein_coding
${CHROM}	test	mRNA	200000	205000	.	-	.	ID=mRNA002;Parent=gene002;Name=testGeneB-RA
${CHROM}	test	exon	200000	201000	.	-	.	ID=exon003;Parent=mRNA002
${CHROM}	test	exon	203000	205000	.	-	.	ID=exon004;Parent=mRNA002
${CHROM}	test	gene	500000	510000	.	+	.	ID=gene003;Name=testGeneC;biotype=protein_coding
${CHROM}	test	gene	1000000	1015000	.	-	.	ID=gene004;Name=testGeneD;biotype=protein_coding
${CHROM}	test	gene	1500000	1520000	.	+	.	ID=gene005;Name=testGeneE;biotype=protein_coding
${CHROM}	test	gene	2000000	2025000	.	-	.	ID=gene006;Name=testGeneF;biotype=protein_coding
${CHROM}	test	gene	2500000	2530000	.	+	.	ID=gene007;Name=testGeneG;biotype=protein_coding
${CHROM}	test	gene	3000000	3035000	.	-	.	ID=gene008;Name=testGeneH;biotype=protein_coding
${CHROM}	test	gene	3500000	3540000	.	+	.	ID=gene009;Name=testGeneI;biotype=protein_coding
${CHROM}	test	gene	4000000	4045000	.	-	.	ID=gene010;Name=testGeneJ;biotype=protein_coding
EOF

# Sort by position (required for tabix)
(grep "^#" "$OUTDIR/ecoli-test.gff3"; grep -v "^#" "$OUTDIR/ecoli-test.gff3" | sort -k4,4n) > "$OUTDIR/ecoli-test.sorted.gff3"
mv "$OUTDIR/ecoli-test.sorted.gff3" "$OUTDIR/ecoli-test.gff3"

bgzip -f "$OUTDIR/ecoli-test.gff3"
tabix -p gff "$OUTDIR/ecoli-test.gff3.gz"
echo "  Created: ecoli-test.gff3.gz + .tbi"

# ============================================
# 3. Create test BED file
# ============================================
echo "Creating BED test file..."

cat > "$OUTDIR/ecoli-test.bed" << EOF
${CHROM}	50000	55000	region_A	100	+
${CHROM}	100000	110000	region_B	200	-
${CHROM}	200000	220000	region_C	300	+
${CHROM}	400000	450000	region_D	400	-
${CHROM}	600000	680000	region_E	500	+
${CHROM}	900000	950000	region_F	600	-
${CHROM}	1200000	1280000	region_G	700	+
${CHROM}	1600000	1700000	region_H	800	-
${CHROM}	2100000	2200000	region_I	900	+
${CHROM}	2600000	2750000	region_J	1000	-
${CHROM}	3100000	3250000	region_K	1100	+
${CHROM}	3600000	3800000	region_L	1200	-
${CHROM}	4100000	4300000	region_M	1300	+
${CHROM}	4400000	4550000	region_N	1400	-
EOF

# Sort by position
sort -k2,2n "$OUTDIR/ecoli-test.bed" > "$OUTDIR/ecoli-test.sorted.bed"
mv "$OUTDIR/ecoli-test.sorted.bed" "$OUTDIR/ecoli-test.bed"

bgzip -f "$OUTDIR/ecoli-test.bed"
tabix -p bed "$OUTDIR/ecoli-test.bed.gz"
echo "  Created: ecoli-test.bed.gz + .tbi"

# ============================================
# Summary
# ============================================
echo ""
echo "=== Test files created in $OUTDIR ==="
ls -la "$OUTDIR"/*.gz "$OUTDIR"/*.tbi 2>/dev/null || true
echo ""
echo "To upload to R2:"
echo "  1. cd $OUTDIR"
echo "  2. Upload ecoli-test.vcf.gz and ecoli-test.vcf.gz.tbi"
echo "  3. Upload ecoli-test.gff3.gz and ecoli-test.gff3.gz.tbi"
echo "  4. Upload ecoli-test.bed.gz and ecoli-test.bed.gz.tbi"
echo ""
echo "R2 URLs will be:"
echo "  https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.vcf.gz"
echo "  https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.gff3.gz"
echo "  https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev/test/ecoli-test.bed.gz"
