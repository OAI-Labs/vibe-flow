#!/usr/bin/env bash
# Validates plugin + marketplace manifests and skill frontmatter.
# Run locally: bash scripts/validate-plugin.sh
# Used in CI: .github/workflows/validate.yml

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

fail=0
err() { echo "::error::$*"; fail=1; }
ok()  { echo "  ok: $*"; }

echo "==> Manifest parse + version sync"

PLUGIN_JSON="plugins/vibe-flow/.claude-plugin/plugin.json"
MARKET_JSON=".claude-plugin/marketplace.json"

[ -f "$PLUGIN_JSON" ] || { err "missing $PLUGIN_JSON"; exit 1; }
[ -f "$MARKET_JSON" ] || { err "missing $MARKET_JSON"; exit 1; }

PLUGIN_VER=$(jq -er '.version' "$PLUGIN_JSON")    || { err "$PLUGIN_JSON: cannot read .version"; exit 1; }
MKT_TOP_VER=$(jq -er '.metadata.version' "$MARKET_JSON") || { err "$MARKET_JSON: cannot read .metadata.version"; exit 1; }
MKT_PLUGIN_VER=$(jq -er '.plugins[0].version' "$MARKET_JSON") || { err "$MARKET_JSON: cannot read .plugins[0].version"; exit 1; }

if [ "$PLUGIN_VER" != "$MKT_TOP_VER" ] || [ "$PLUGIN_VER" != "$MKT_PLUGIN_VER" ]; then
  err "Version mismatch — plugin.json=$PLUGIN_VER, marketplace.metadata=$MKT_TOP_VER, marketplace.plugins[0]=$MKT_PLUGIN_VER"
else
  ok "version $PLUGIN_VER consistent across plugin.json and marketplace.json"
fi

echo "==> Skill frontmatter (name + description required)"

shopt -s nullglob
skills=(plugins/vibe-flow/skills/*/SKILL.md)
if [ ${#skills[@]} -eq 0 ]; then
  err "no SKILL.md files found under plugins/vibe-flow/skills/"
fi

for skill in "${skills[@]}"; do
  # Frontmatter is the first --- ... --- block at the top of the file.
  fm=$(awk 'BEGIN{i=0} /^---$/ {i++; if(i==2){exit}; next} i==1 {print}' "$skill")
  if [ -z "$fm" ]; then
    err "$skill: missing YAML frontmatter (--- ... ---)"
    continue
  fi
  echo "$fm" | grep -qE '^name:[[:space:]]*[^[:space:]]' || err "$skill: missing or empty 'name:' in frontmatter"
  echo "$fm" | grep -qE '^description:[[:space:]]*[^[:space:]]' || err "$skill: missing or empty 'description:' in frontmatter"
  ok "$skill"
done

echo "==> Done."
if [ "$fail" -ne 0 ]; then
  echo "FAIL"
  exit 1
fi
echo "PASS"
