#!/bin/bash
#
# Upload BigBed files to Cloudflare R2
#
# Prerequisites:
#   - rclone configured with R2 (see README.md)
#   - BigBed files in ./output directory
#
# Usage:
#   ./upload-r2.sh              # Upload all files
#   ./upload-r2.sh genome_id    # Upload specific genome
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
CONFIG_FILE="$SCRIPT_DIR/genomes.json"

# R2 configuration
R2_REMOTE="r2"  # rclone remote name
R2_BUCKET=$(jq -r '.r2_bucket' "$CONFIG_FILE")

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
        exit 1
    fi

    if ! rclone listremotes | grep -q "^${R2_REMOTE}:"; then
        echo "rclone remote '$R2_REMOTE' not configured."
        echo ""
        echo "Configure with:"
        echo "  rclone config"
        echo ""
        echo "Choose:"
        echo "  - New remote: r2"
        echo "  - Type: s3"
        echo "  - Provider: Cloudflare"
        echo "  - Access Key ID: <from R2 dashboard>"
        echo "  - Secret Access Key: <from R2 dashboard>"
        echo "  - Endpoint: https://<account_id>.r2.cloudflarestorage.com"
        exit 1
    fi
}

upload_file() {
    local file="$1"
    local filename=$(basename "$file")

    log_info "Uploading $filename to R2..."

    # Upload with proper content-type for BigBed
    rclone copyto \
        --s3-no-check-bucket \
        "$file" \
        "${R2_REMOTE}:${R2_BUCKET}/${filename}" \
        --header-upload "Content-Type: application/octet-stream"

    log_info "Uploaded: ${R2_BUCKET}/${filename}"
}

main() {
    check_rclone

    if [[ ! -d "$OUTPUT_DIR" ]]; then
        echo "Output directory not found: $OUTPUT_DIR"
        echo "Run ./convert.sh first to generate BigBed files."
        exit 1
    fi

    if [[ $# -eq 1 ]]; then
        # Upload specific genome
        local file="$OUTPUT_DIR/${1}.genes.bb"
        if [[ ! -f "$file" ]]; then
            echo "File not found: $file"
            exit 1
        fi
        upload_file "$file"
    else
        # Upload all files
        local files=("$OUTPUT_DIR"/*.bb)
        if [[ ${#files[@]} -eq 0 ]]; then
            echo "No .bb files found in $OUTPUT_DIR"
            exit 1
        fi

        for file in "${files[@]}"; do
            upload_file "$file"
        done
    fi

    echo ""
    log_info "Upload complete!"
    echo ""
    echo "Files are available at:"
    local public_url=$(jq -r '.r2_public_url' "$CONFIG_FILE")
    for file in "$OUTPUT_DIR"/*.bb; do
        echo "  ${public_url}/$(basename "$file")"
    done
}

main "$@"
