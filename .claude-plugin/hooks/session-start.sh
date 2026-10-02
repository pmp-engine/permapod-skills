#!/bin/bash
# Session-start hook for permapod-skills
# Validates environment before the skill is used.

WARNINGS=0

# 1. Check Node.js is installed and version >= 18
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//')
if [ -z "$NODE_VERSION" ]; then
  echo "permapod-skills: Node.js not found. Install Node.js 18+ to use this skill."
  WARNINGS=$((WARNINGS + 1))
else
  MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$MAJOR" -lt 18 ]; then
    echo "permapod-skills: Node.js $NODE_VERSION detected, but 18+ is required."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# 2. Check if the project is built
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ ! -f "$ROOT_DIR/build/index.js" ]; then
  echo "permapod-skills: Not built. Run 'yarn build' in $ROOT_DIR"
  WARNINGS=$((WARNINGS + 1))
fi

# 3. Check if dependencies are installed
if [ ! -d "$ROOT_DIR/node_modules/@cosmjs" ]; then
  echo "permapod-skills: Dependencies not installed. Run 'yarn install' in $ROOT_DIR"
  WARNINGS=$((WARNINGS + 1))
fi

# 4. Quick RPC reachability check (non-blocking, 3s timeout)
RPC_URL="${PERMAPOD_RPC_URL:-https://public-zigchain-rpc.numia.xyz}"
if command -v curl &> /dev/null; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "${RPC_URL}/status" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "000" ]; then
    echo "permapod-skills: Zigchain RPC unreachable ($RPC_URL). Some commands may fail."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

if [ $WARNINGS -eq 0 ]; then
  echo "permapod-skills: Environment OK (Node $NODE_VERSION, RPC reachable)"
fi

# Always exit 0 — warnings are informational, never block the session
exit 0
