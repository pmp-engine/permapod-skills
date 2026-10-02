#!/bin/bash
# Generate .surface file from the current CLI implementation.
# Run this when commands/flags change, then commit the updated .surface file.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CLI="node $ROOT_DIR/build/index.js"

echo "# Perma Pod CLI Surface"
echo "# Auto-generated command inventory. Update when commands/flags change."
echo "# Run \`make drift-check\` to verify SKILL.md stays in sync."
echo ""

echo "# Global flags"
echo "--help, -h"
echo "--version, -v"
echo "--testnet, -t"
echo "--json, -j"
echo ""

# Extract commands from help output
echo "# Protocol-level commands"
HELP_OUTPUT=$($CLI --help 2>&1 || true)

# Parse commands from help text
echo "$HELP_OUTPUT" | grep -E '^\s{2}\w+\s' | while read -r line; do
  cmd=$(echo "$line" | awk '{print $1}')
  arg=$(echo "$line" | awk '{print $2}')

  case "$arg" in
    "<denom>"|"<address>"|"<id>")
      echo "$cmd $arg [--testnet] [--json]"
      ;;
    *)
      echo "$cmd [--testnet] [--json]"
      ;;
  esac
done

echo ""
echo "# Denom shortcuts"
# Extract from config.ts
grep -E "^\s+'[^']+': '[A-Z]" "$ROOT_DIR/src/config.ts" 2>/dev/null | while read -r line; do
  denom=$(echo "$line" | grep -oP "'[^']+'" | head -1 | tr -d "'")
  label=$(echo "$line" | grep -oP "'[^']+'" | tail -1 | tr -d "'")
  echo "$label -> $denom"
done

echo ""
echo "# Environment variables"
echo "PERMAPOD_RPC_URL"
echo "PERMAPOD_TESTNET_RPC_URL"
echo "PERMAPOD_TIMEOUT_MS"
echo "PERMAPOD_MAX_RETRIES"
