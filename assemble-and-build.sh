#!/usr/bin/env sh
set -eu

ARCHIVE_NAME="musicwebsite-daw-enterprise-6.9.zip"
PROJECT_DIR="musicwebsite-daw-enterprise-6.9"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUTPUT_ZIP="$SCRIPT_DIR/$ARCHIVE_NAME"
CHECKSUM_FILE="$SCRIPT_DIR/$ARCHIVE_NAME.sha256"
PART_CHECKSUM_FILE="$SCRIPT_DIR/musicwebsite-daw-enterprise-6.9.parts.sha256"

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    printf '%s\n' "Neither sha256sum nor shasum is installed." >&2
    exit 1
  fi
}

printf '%s\n' "Checking split archive parts..."
set -- "$SCRIPT_DIR/$ARCHIVE_NAME".part-*
if [ ! -e "$1" ]; then
  printf '%s\n' "No split parts found beside this script." >&2
  exit 1
fi

if [ -f "$PART_CHECKSUM_FILE" ]; then
  while read -r expected filename; do
    [ -n "$expected" ] || continue
    part="$SCRIPT_DIR/$filename"
    if [ ! -f "$part" ]; then
      printf '%s\n' "Missing archive part: $filename" >&2
      exit 1
    fi
    actual=$(sha256_of "$part")
    if [ "$actual" != "$expected" ]; then
      printf '%s\n' "Part checksum failed: $filename" >&2
      exit 1
    fi
  done < "$PART_CHECKSUM_FILE"
  printf '%s\n' "All part checksums passed."
fi

printf '%s\n' "Assembling $ARCHIVE_NAME from parts no larger than 150 MiB..."
TMP_ZIP="$OUTPUT_ZIP.tmp"
rm -f "$TMP_ZIP"
cat "$@" > "$TMP_ZIP"
mv "$TMP_ZIP" "$OUTPUT_ZIP"

if [ ! -f "$CHECKSUM_FILE" ]; then
  printf '%s\n' "Missing checksum file: $CHECKSUM_FILE" >&2
  exit 1
fi
expected=$(awk '{print $1}' "$CHECKSUM_FILE")
actual=$(sha256_of "$OUTPUT_ZIP")
if [ "$actual" != "$expected" ]; then
  printf '%s\n' "Full ZIP SHA-256 verification failed." >&2
  printf '%s\n' "Expected: $expected" >&2
  printf '%s\n' "Actual:   $actual" >&2
  exit 1
fi
printf '%s\n' "Full ZIP SHA-256 verified: $actual"

command -v unzip >/dev/null 2>&1 || { printf '%s\n' "The unzip command is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { printf '%s\n' "Node.js and npm are required." >&2; exit 1; }

printf '%s\n' "Testing and extracting project archive..."
unzip -tq "$OUTPUT_ZIP" >/dev/null
rm -rf "$SCRIPT_DIR/$PROJECT_DIR"
unzip -q "$OUTPUT_ZIP" -d "$SCRIPT_DIR"

cd "$SCRIPT_DIR/$PROJECT_DIR"
printf '%s\n' "Installing locked dependencies..."
npm ci --no-audit --no-fund
printf '%s\n' "Running project, DAW, client, SSR, prerender, and SEO validation..."
npm run check
printf '%s\n' "Build complete. Production files are in: $SCRIPT_DIR/$PROJECT_DIR/dist"
