#!/bin/bash
# Check that SKILL.md documents all commands listed in .surface
# and that .surface lists all commands referenced in SKILL.md.
#
# Exit 0 if in sync, exit 1 if drift detected.

set -euo pipefail

SURFACE_FILE=".surface"
SKILL_FILE="SKILL.md"
ERRORS=0

if [ ! -f "$SURFACE_FILE" ]; then
  echo "ERROR: $SURFACE_FILE not found"
  exit 1
fi

if [ ! -f "$SKILL_FILE" ]; then
  echo "ERROR: $SKILL_FILE not found"
  exit 1
fi

# Extract command names from .surface (lines starting with a lowercase word, excluding denom shortcuts with ->)
surface_commands=$(grep -E '^[a-z]' "$SURFACE_FILE" | grep -v '\->' | awk '{print $1}' | sort -u)

# Extract command references from SKILL.md
# Match backtick-wrapped commands: `dashboard`, `market <denom>`, `account <id>`, etc.
skill_commands=$(grep -oE '`(dashboard|markets|market|prices|price|supply|yields|wallet|accounts|account|rewards|vaults)' "$SKILL_FILE" | tr -d '`' | sort -u)

echo "=== Skill Drift Check ==="
echo ""

# Check: every command in .surface should appear in SKILL.md
echo "Checking .surface commands are documented in SKILL.md..."
for cmd in $surface_commands; do
  if ! echo "$skill_commands" | grep -qx "$cmd"; then
    echo "  DRIFT: '$cmd' is in .surface but not documented in SKILL.md"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check: every command in SKILL.md should appear in .surface
echo "Checking SKILL.md commands exist in .surface..."
for cmd in $skill_commands; do
  if ! echo "$surface_commands" | grep -qx "$cmd"; then
    echo "  DRIFT: '$cmd' is referenced in SKILL.md but not in .surface"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check: denom shortcuts in .surface match SKILL.md
echo "Checking denom shortcuts..."
surface_denoms=$(grep -E '^[A-Za-z].*->' "$SURFACE_FILE" | awk '{print $1}' | sort -u)
for denom in $surface_denoms; do
  if ! grep -qF "$denom" "$SKILL_FILE"; then
    echo "  DRIFT: Denom shortcut '$denom' in .surface but not in SKILL.md"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check: environment variables in .surface match SKILL.md
echo "Checking environment variables..."
surface_envvars=$(grep -E '^PERMAPOD_' "$SURFACE_FILE" | sort -u)
for var in $surface_envvars; do
  if ! grep -qF "$var" "$SKILL_FILE"; then
    echo "  DRIFT: Env var '$var' in .surface but not in SKILL.md"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check: global flags in .surface are documented in SKILL.md
# Use -F (fixed string) to avoid BSD grep interpreting --flag as options
echo "Checking global flags..."
surface_flags=$(grep -E '^--' "$SURFACE_FILE" | grep -oE '\-\-[a-z]+' | sort -u)
for flag in $surface_flags; do
  if ! grep -qF -- "$flag" "$SKILL_FILE"; then
    echo "  DRIFT: Flag '$flag' in .surface but not in SKILL.md"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
if [ $ERRORS -eq 0 ]; then
  surface_cmd_count=$(echo "$surface_commands" | wc -l | tr -d ' ')
  surface_denom_count=$(echo "$surface_denoms" | wc -l | tr -d ' ')
  surface_flag_count=$(echo "$surface_flags" | wc -l | tr -d ' ')
  echo "OK: SKILL.md and .surface are in sync ($surface_cmd_count commands, $surface_denom_count denoms, $surface_flag_count flags)"
  exit 0
else
  echo "FAIL: $ERRORS drift issue(s) detected"
  exit 1
fi
