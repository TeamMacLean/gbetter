#!/usr/bin/env python3
"""
GFF3 to BigBed conversion using gffutils for robust GFF3 parsing.

This script handles diverse GFF3 formats from Ensembl, NCBI, and other sources.
It produces separate tracks for genes and transcripts where applicable.

Output format:
  - {genome}.genes.bb: Gene-level features (simple blocks)
  - {genome}.transcripts.bb: Transcript-level features (compound blocks with exons)

Label format: LOCUS_ID (SYMBOL) or just LOCUS_ID if no symbol available

Prerequisites:
    pip install gffutils

Usage:
    python convert_gffutils.py genome_id
    python convert_gffutils.py --all
    python convert_gffutils.py --list
"""

import argparse
import gzip
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

try:
    import gffutils
except ImportError:
    print("gffutils not installed. Install with: pip install gffutils")
    sys.exit(1)


SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / "genomes.json"
OUTPUT_DIR = SCRIPT_DIR / "output"
TOOLS_DIR = SCRIPT_DIR / "tools"
TEMP_DIR = SCRIPT_DIR / "temp"


def load_config():
    """Load genome configuration from JSON file."""
    with open(CONFIG_FILE) as f:
        return json.load(f)


def ensure_tools():
    """Ensure UCSC bedToBigBed tool is available."""
    TOOLS_DIR.mkdir(exist_ok=True)

    import platform
    system = platform.system()
    machine = platform.machine()

    if system == "Darwin":
        if machine == "arm64":
            platform_str = "macOSX.arm64"
        else:
            platform_str = "macOSX.x86_64"
    elif system == "Linux":
        platform_str = "linux.x86_64"
    else:
        raise RuntimeError(f"Unsupported platform: {system}")

    tool_path = TOOLS_DIR / "bedToBigBed"
    if not tool_path.exists():
        url = f"https://hgdownload.soe.ucsc.edu/admin/exe/{platform_str}/bedToBigBed"
        print(f"  Downloading bedToBigBed from {url}")
        urllib.request.urlretrieve(url, tool_path)
        tool_path.chmod(0o755)

    return tool_path


def format_label(feature, is_gene: bool = True) -> str:
    """
    Format label as: LOCUS_ID (SYMBOL) or just LOCUS_ID

    For genes: use gene_id/locus_tag as primary, Name/gene as symbol
    For transcripts: use transcript_id as primary, Name as symbol
    """
    locus_id = None
    symbol = None

    if is_gene:
        # Primary: gene_id, locus_tag, or extract from ID
        for attr in ['gene_id', 'locus_tag']:
            if attr in feature.attributes:
                val = feature.attributes[attr][0]
                if val and val != '.':
                    locus_id = val
                    break

        # Extract from ID if not found (e.g., "gene:AT1G01010" -> "AT1G01010")
        if not locus_id and 'ID' in feature.attributes:
            raw_id = feature.attributes['ID'][0]
            if ':' in raw_id:
                locus_id = raw_id.split(':')[-1]
            else:
                locus_id = raw_id

        if not locus_id:
            locus_id = feature.id.split(':')[-1] if feature.id and ':' in feature.id else feature.id

        # Symbol: Name or gene attribute
        for attr in ['Name', 'gene', 'gene_name']:
            if attr in feature.attributes:
                val = feature.attributes[attr][0]
                if val and val != '.' and val != locus_id:
                    symbol = val
                    break
    else:
        # Transcript: use transcript_id as primary
        for attr in ['transcript_id']:
            if attr in feature.attributes:
                val = feature.attributes[attr][0]
                if val and val != '.':
                    locus_id = val
                    break

        if not locus_id and 'ID' in feature.attributes:
            raw_id = feature.attributes['ID'][0]
            if ':' in raw_id:
                locus_id = raw_id.split(':')[-1]
            else:
                locus_id = raw_id

        if not locus_id:
            locus_id = feature.id.split(':')[-1] if feature.id and ':' in feature.id else feature.id

        # Symbol for transcript (usually Name like "NAC001-201")
        if 'Name' in feature.attributes:
            val = feature.attributes['Name'][0]
            if val and val != '.' and val != locus_id:
                symbol = val

    # Format: "LOCUS_ID (SYMBOL)" or just "LOCUS_ID"
    if symbol:
        return f"{locus_id} ({symbol})"
    return locus_id or "unknown"


def gene_to_bed12(feature, label: str) -> str:
    """Convert a gene feature to simple single-block BED12 format.

    Genes span the entire locus (including introns), so they should be
    represented as simple contiguous blocks, not compound exon structures.
    """
    chrom = feature.chrom
    start = feature.start - 1  # GFF is 1-based, BED is 0-based
    end = feature.end
    strand = feature.strand if feature.strand else '.'
    score = 0
    thick_start = start
    thick_end = end
    item_rgb = "0,0,0"
    block_count = 1
    block_sizes = str(end - start)
    block_starts = "0"

    return f"{chrom}\t{start}\t{end}\t{label}\t{score}\t{strand}\t{thick_start}\t{thick_end}\t{item_rgb}\t{block_count}\t{block_sizes},\t{block_starts},"


def transcript_to_bed12(feature, db, label: str) -> str:
    """Convert a transcript feature to BED12 format with exon blocks.

    Transcripts have exon structure that should be shown as compound blocks.
    Uses gffutils to extract the exon positions for proper visualization.
    """
    try:
        # Get BED12 with exon structure from gffutils
        bed12 = db.bed12(feature, name_field='ID')
        fields = bed12.split('\t')
        fields[3] = label  # Replace name field with our formatted label
        return '\t'.join(fields)
    except Exception:
        # Fallback: create simple BED12 entry if exon extraction fails
        chrom = feature.chrom
        start = feature.start - 1  # GFF is 1-based, BED is 0-based
        end = feature.end
        strand = feature.strand if feature.strand else '.'
        score = 0
        thick_start = start
        thick_end = end
        item_rgb = "0,0,0"
        block_count = 1
        block_sizes = str(end - start)
        block_starts = "0"

        return f"{chrom}\t{start}\t{end}\t{label}\t{score}\t{strand}\t{thick_start}\t{thick_end}\t{item_rgb}\t{block_count}\t{block_sizes},\t{block_starts},"


def extract_features(gff3_path: Path) -> tuple[list[str], list[str]]:
    """
    Extract gene and transcript features from GFF3.

    Returns:
        (gene_bed_lines, transcript_bed_lines)
    """
    print(f"  Creating gffutils database...")

    db = gffutils.create_db(
        str(gff3_path),
        ":memory:",
        merge_strategy="create_unique",
        keep_order=True,
        sort_attribute_values=True,
    )

    gene_lines = []
    transcript_lines = []

    # Extract gene features
    gene_count = 0
    for ftype in ['gene']:
        try:
            features = list(db.features_of_type(ftype))
            if features:
                print(f"  Found {len(features)} {ftype} features")
                for feature in features:
                    try:
                        label = format_label(feature, is_gene=True)
                        bed12 = gene_to_bed12(feature, label)
                        gene_lines.append(bed12)
                        gene_count += 1
                    except Exception:
                        continue
                break
        except Exception:
            continue

    # Extract transcript features (mRNA, transcript)
    transcript_count = 0
    for ftype in ['mRNA', 'transcript']:
        try:
            features = list(db.features_of_type(ftype))
            if features:
                print(f"  Found {len(features)} {ftype} features")
                for feature in features:
                    try:
                        label = format_label(feature, is_gene=False)
                        bed12 = transcript_to_bed12(feature, db, label)
                        transcript_lines.append(bed12)
                        transcript_count += 1
                    except Exception:
                        continue
                break
        except Exception:
            continue

    # If no genes found but transcripts exist, that's OK
    # If no transcripts found, try CDS as fallback (for bacteria)
    if not transcript_lines and not gene_lines:
        print("  No gene/mRNA features, trying CDS...")
        for ftype in ['CDS']:
            try:
                features = list(db.features_of_type(ftype))
                if features:
                    print(f"  Found {len(features)} {ftype} features")
                    for feature in features:
                        try:
                            label = format_label(feature, is_gene=True)
                            bed12 = gene_to_bed12(feature, label)
                            gene_lines.append(bed12)
                        except Exception:
                            continue
                    break
            except Exception:
                continue

    print(f"  Extracted {len(gene_lines)} genes, {len(transcript_lines)} transcripts")
    return gene_lines, transcript_lines


def create_chrom_sizes(genome_config: dict) -> Path:
    """Create chrom.sizes file from genome config."""
    chrom_sizes_path = TEMP_DIR / f"{genome_config['id']}.chrom.sizes"

    with open(chrom_sizes_path, 'w') as f:
        for chrom in genome_config['chromosomes']:
            f.write(f"{chrom['name']}\t{chrom['length']}\n")

    return chrom_sizes_path


def create_bigbed(bed_lines: list[str], output_path: Path, chrom_sizes_path: Path,
                  genome_id: str, track_type: str) -> bool:
    """Create BigBed file from BED lines."""
    if not bed_lines:
        return False

    bed_to_bigbed = ensure_tools()

    # Write BED12 file
    bed12_path = TEMP_DIR / f"{genome_id}.{track_type}.bed12"
    with open(bed12_path, 'w') as f:
        for line in bed_lines:
            f.write(line + '\n')

    # Sort BED file
    sorted_bed_path = TEMP_DIR / f"{genome_id}.{track_type}.sorted.bed12"
    with open(sorted_bed_path, 'w') as f:
        subprocess.run(
            ['sort', '-k1,1', '-k2,2n', str(bed12_path)],
            stdout=f,
            check=True
        )

    # Read chrom sizes for filtering
    chrom_sizes = {}
    with open(chrom_sizes_path) as f:
        for line in f:
            parts = line.strip().split('\t')
            chrom_sizes[parts[0]] = int(parts[1])

    # Filter out-of-bounds entries
    filtered_path = TEMP_DIR / f"{genome_id}.{track_type}.filtered.bed12"
    with open(sorted_bed_path) as f_in, open(filtered_path, 'w') as f_out:
        for line in f_in:
            parts = line.strip().split('\t')
            chrom = parts[0]
            start = int(parts[1])
            end = int(parts[2])

            if chrom in chrom_sizes:
                if start >= 0 and end <= chrom_sizes[chrom]:
                    f_out.write(line)

    # Convert to BigBed
    print(f"  Creating BigBed: {output_path}")

    result = subprocess.run(
        [
            str(bed_to_bigbed),
            '-type=bed12',
            '-tab',
            str(filtered_path),
            str(chrom_sizes_path),
            str(output_path)
        ],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(f"  ERROR: bedToBigBed failed: {result.stderr}")
        return False

    # Report size
    size = output_path.stat().st_size
    if size > 1024 * 1024:
        size_str = f"{size / 1024 / 1024:.1f} MB"
    else:
        size_str = f"{size / 1024:.1f} KB"

    print(f"  SUCCESS: Created {output_path.name} ({size_str})")
    return True


def convert_genome(genome_id: str, config: dict) -> bool:
    """Convert a single genome from GFF3 to BigBed."""

    genome_config = None
    for g in config['genomes']:
        if g['id'] == genome_id:
            genome_config = g
            break

    if not genome_config:
        print(f"ERROR: Genome '{genome_id}' not found in config")
        return False

    print(f"\nProcessing: {genome_config['name']} ({genome_id})")

    # Setup directories
    TEMP_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Download GFF3 if needed
    gff3_path = TEMP_DIR / f"{genome_id}.gff3"
    if not gff3_path.exists():
        url = genome_config['gff3_url']
        print(f"  Downloading GFF3...")

        if url.endswith('.gz'):
            compressed_path = TEMP_DIR / f"{genome_id}.gff3.gz"
            urllib.request.urlretrieve(url, compressed_path)

            with gzip.open(compressed_path, 'rb') as f_in:
                with open(gff3_path, 'wb') as f_out:
                    f_out.write(f_in.read())

            compressed_path.unlink()
        else:
            urllib.request.urlretrieve(url, gff3_path)
    else:
        print(f"  Using cached GFF3: {gff3_path}")

    # Extract gene and transcript features
    gene_lines, transcript_lines = extract_features(gff3_path)

    if not gene_lines and not transcript_lines:
        print(f"  ERROR: No features found in GFF3")
        return False

    # Create chrom.sizes
    chrom_sizes_path = create_chrom_sizes(genome_config)

    success = False

    # Create genes BigBed if we have genes
    if gene_lines:
        genes_output = OUTPUT_DIR / f"{genome_id}.genes.bb"
        if create_bigbed(gene_lines, genes_output, chrom_sizes_path, genome_id, "genes"):
            success = True

    # Create transcripts BigBed if we have transcripts (and they're different from genes)
    if transcript_lines:
        transcripts_output = OUTPUT_DIR / f"{genome_id}.transcripts.bb"
        if create_bigbed(transcript_lines, transcripts_output, chrom_sizes_path, genome_id, "transcripts"):
            success = True

    # Cleanup temp files
    for f in TEMP_DIR.glob(f"{genome_id}.*"):
        f.unlink()

    return success


def list_genomes(config: dict):
    """List available genomes."""
    print("Available genomes:")
    for g in config['genomes']:
        print(f"  {g['id']}: {g['name']}")


def main():
    parser = argparse.ArgumentParser(description="Convert GFF3 to BigBed using gffutils")
    parser.add_argument('genome_id', nargs='?', help="Genome ID to convert")
    parser.add_argument('--all', action='store_true', help="Convert all genomes")
    parser.add_argument('--list', action='store_true', help="List available genomes")

    args = parser.parse_args()

    config = load_config()

    if args.list:
        list_genomes(config)
        return

    if args.all:
        failed = []
        for g in config['genomes']:
            if not convert_genome(g['id'], config):
                failed.append(g['id'])

        print("\n" + "=" * 50)
        print(f"Conversion complete. Output in {OUTPUT_DIR}")
        if failed:
            print(f"Failed: {', '.join(failed)}")
        return

    if args.genome_id:
        convert_genome(args.genome_id, config)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
