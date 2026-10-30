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
echo '-- cvss'; node src/test-cvss.mjs
echo '-- lint'; node src/test-lint.mjs
echo '-- pack'; node src/test-pack.mjs
echo '-- history'; node --test src/test-history.mjs
echo '-- integrity'; node --test src/test-integrity.mjs
echo '-- retry'; node --test src/test-retry.mjs
echo '-- dsh retry'; node src/test-retry-dsh.mjs "$dsh"
