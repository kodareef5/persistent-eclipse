#!/bin/sh
# Build cordis.patch.yml from src/, then test it in DSH and Pi.
# Usage: src/check.sh /path/to/dsh/apps/cli/lib/bin.js [path to pi]
set -e
cd "$(dirname "$0")/.."
dsh="${1:-$DSH_BIN}"
[ -n "$dsh" ] || { echo "usage: src/check.sh <dsh apps/cli/lib/bin.js> [pi]" >&2; exit 2; }
python3 src/build.py
echo '-- dsh'; node src/test-dsh.mjs "$dsh"
echo '-- pi'; node src/test-pi.mjs "${2:-pi}"
echo '-- core'; npm test
echo '-- dsh retry'; node src/test-retry-dsh.mjs "$dsh"
echo '-- dsh supervision'; node src/test-supervise-dsh.mjs "$dsh"
echo '-- dsh web'; node src/test-dsh-client.mjs "$dsh"

echo '-- installed packages'; node src/test-install.mjs "${2:-pi}" "$dsh"
