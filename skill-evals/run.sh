#!/bin/bash
# Skill eval runner — validates that eval case files are well-formed
# and that referenced commands exist in the CLI surface.
#
# For full LLM-based evals (sending queries to Claude and grading responses),
# extend this script or use an external eval framework.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CASES_DIR="$SCRIPT_DIR/cases"
SURFACE_FILE="$ROOT_DIR/.surface"

TOTAL=0
PASSED=0
FAILED=0

echo "=== Skill Eval Runner ==="
echo ""

if [ ! -d "$CASES_DIR" ]; then
  echo "ERROR: No cases directory found at $CASES_DIR"
  exit 1
fi

if [ ! -f "$SURFACE_FILE" ]; then
  echo "ERROR: No .surface file found at $SURFACE_FILE"
  exit 1
fi

# Extract valid commands from .surface
VALID_COMMANDS=$(grep -E '^[a-z]' "$SURFACE_FILE" | awk '{print $1}' | sort -u)

for case_file in "$CASES_DIR"/*.yml; do
  TOTAL=$((TOTAL + 1))
  case_name=$(basename "$case_file" .yml)

  # Check file is non-empty
  if [ ! -s "$case_file" ]; then
    echo "  FAIL: $case_name — empty file"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Check required fields exist
  has_name=$(grep -c '^name:' "$case_file" || true)
  has_description=$(grep -c '^description:' "$case_file" || true)
  has_queries=$(grep -c '^queries:' "$case_file" || true)
  has_expected=$(grep -c '^expected:' "$case_file" || true)

  if [ "$has_name" -eq 0 ] || [ "$has_description" -eq 0 ] || [ "$has_queries" -eq 0 ] || [ "$has_expected" -eq 0 ]; then
    echo "  FAIL: $case_name — missing required fields (name, description, queries, expected)"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Check that referenced commands exist in surface
  # Only extract from explicit 'command:' fields and command_options values
  case_commands=$(grep -E '^\s+command: [a-z]' "$case_file" | sed 's/.*command: //' | tr -d ' ' || true)
  # command_options block: extract values from lines like "    single: price"
  if grep -q 'command_options:' "$case_file"; then
    opts_cmds=$(sed -n '/command_options:/,/^  [a-z]/p' "$case_file" | grep -v 'command_options:' | grep -v '^  [a-z]' | awk -F': ' '{gsub(/^ +/,"",$NF); print $NF}' || true)
    case_commands="$case_commands $opts_cmds"
  fi

  cmd_error=0
  for cmd in $case_commands; do
    if [ -z "$cmd" ]; then continue; fi
    if ! echo "$VALID_COMMANDS" | grep -qx "$cmd"; then
      echo "  FAIL: $case_name — references unknown command '$cmd'"
      cmd_error=1
    fi
  done

  if [ $cmd_error -eq 1 ]; then
    FAILED=$((FAILED + 1))
    continue
  fi

  # Check that at least one query is defined
  query_count=$(grep -c '^\s*- "' "$case_file" || true)
  if [ "$query_count" -eq 0 ]; then
    echo "  FAIL: $case_name — no queries defined"
    FAILED=$((FAILED + 1))
    continue
  fi

  echo "  PASS: $case_name ($query_count queries)"
  PASSED=$((PASSED + 1))
done

echo ""
echo "Results: $PASSED/$TOTAL passed, $FAILED failed"

if [ $FAILED -gt 0 ]; then
  exit 1
fi

echo ""
echo "All eval cases are well-formed and reference valid commands."
echo "For LLM-based evaluation, run each query through Claude with SKILL.md as system prompt"
echo "and verify the expected command is called."
exit 0
