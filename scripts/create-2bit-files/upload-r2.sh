#!/bin/bash
#
# Upload 2bit reference files to Cloudflare R2
#
# Prerequisites:
#   - rclone configured with R2 (see ../gene-tracks/README.md)
#   - 2bit files in ./output directory
#
# Usage:
#   ./upload-r2.sh              # Upload all files
#   ./upload-r2.sh ecoli-k12    # Upload specific assembly
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"

# R2 configuration (same bucket as gene-tracks)
R2_REMOTE="r2"
R2_BUCKET="gbetter-gene-tracks"
R2_PUBLIC_URL="https://pub-cdedc141a021461d9db8432b0ec926d7.r2.dev"
R2_PATH="reference"  # subfolder for reference sequences

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Check rclone is configured
check_rclone() {
    if ! command -v rclone &> /dev/null; then
        echo "rclone is not installed. Install with: brew install rclone"
        echo "Then configure R2: rclone config"
        echo "See ../gene-tracks/README.md for setup instructions."
        exit 1
    fi

    if ! rclone listremotes | grep -q "^${R2_REMOTE}:"; then
        echo "rclone remote '$R2_REMOTE' not configured."
        echo "See ../gene-tracks/README.md for setup instructions."
        exit 1
    fi
}

upload_file() {
    local file="$1"
    local filename=$(basename "$file")
    local size=$(ls -lh "$file" | awk '{print $5}')

    log_info "Uploading $filename ($size) to R2..."

    # Upload with proper content-type
    rclone copyto \
        --s3-no-check-bucket \
        --progress \
        "$file" \
        "${R2_REMOTE}:${R2_BUCKET}/${R2_PATH}/${filename}" \
        --header-upload "Content-Type: application/octet-stream"

    log_info "Uploaded: ${R2_PATH}/${filename}"
}

main() {
    check_rclone

    if [[ ! -d "$OUTPUT_DIR" ]]; then
        echo "Output directory not found: $OUTPUT_DIR"
        echo "Run ./create-2bit.sh first to generate 2bit files."
        exit 1
    fi

    if [[ $# -eq 1 ]]; then
        # Upload specific assembly
        local file="$OUTPUT_DIR/${1}.2bit"
        if [[ ! -f "$file" ]]; then
            echo "File not found: $file"
            exit 1
        fi
        upload_file "$file"
    else
        # Upload all files
        local files=("$OUTPUT_DIR"/*.2bit)
        if [[ ${#files[@]} -eq 0 ]]; then
            echo "No .2bit files found in $OUTPUT_DIR"
            exit 1
        fi

        # Calculate total size
        local total_size=$(du -ch "${files[@]}" | grep total | awk '{print $1}')
        log_info "Total upload size: $total_size"
        echo ""

        for file in "${files[@]}"; do
            upload_file "$file"
            echo ""
        done
    fi

    echo ""
    log_info "Upload complete!"
    echo ""
    echo "Files are available at:"
    for file in "$OUTPUT_DIR"/*.2bit; do
        echo "  ${R2_PUBLIC_URL}/${R2_PATH}/$(basename "$file")"
    done
    echo ""
    echo "Next step: Add URLs to src/lib/services/fasta.ts"
}

main "$@"
