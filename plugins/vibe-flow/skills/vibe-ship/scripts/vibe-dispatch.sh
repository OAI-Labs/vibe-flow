#!/usr/bin/env bash
# vibe-dispatch.sh — dispatch a vibe-kanban workspace via direct HTTP API.
#
# Why this exists: vibe-ship previously had the orchestrating LLM emit the
# full prompt body (opening protocol + issue description + closing protocol)
# as a tool argument every time it called start_workspace. That cost
# thousands of output tokens per issue. This script builds the prompt
# locally and POSTs it to the vibe-kanban HTTP backend, so the LLM only
# has to emit a short bash command.
#
# Usage:
#   vibe-dispatch.sh <issue_id> <repo_id> <executor> <variant> <branch_name>
#
# Required env:
#   VIBE_BACKEND_URL   — e.g. http://localhost:5173 (no trailing slash)
#
# Optional env:
#   VIBE_API_PREFIX    — defaults to /api. Some builds mount under /v1.
#
# Output (stdout, JSON):
#   { "workspace_id": "...", "execution_id": "...", "branch": "..." }
#
# Exit non-zero on any HTTP error or missing dependency.

set -euo pipefail

if [[ $# -ne 5 ]]; then
  echo "usage: $0 <issue_id> <repo_id> <executor> <variant> <branch_name>" >&2
  exit 2
fi

ISSUE_ID="$1"
REPO_ID="$2"
EXECUTOR="$3"
VARIANT="$4"
BRANCH_NAME="$5"

: "${VIBE_BACKEND_URL:?VIBE_BACKEND_URL must be set}"
API_PREFIX="${VIBE_API_PREFIX:-/api}"

command -v curl >/dev/null || { echo "curl required" >&2; exit 3; }
command -v jq   >/dev/null || { echo "jq required"   >&2; exit 3; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="${SCRIPT_DIR}/templates/dispatch-prompt.tmpl"
[[ -r "$TEMPLATE_FILE" ]] || { echo "missing template: $TEMPLATE_FILE" >&2; exit 4; }

# 1. Fetch the issue to get description + simple_id + project_id.
ISSUE_JSON=$(curl -fsS "${VIBE_BACKEND_URL}${API_PREFIX}/issues/${ISSUE_ID}")
ISSUE_DESC=$(echo "$ISSUE_JSON" | jq -r '.description // .body // ""')
ISSUE_SIMPLE_ID=$(echo "$ISSUE_JSON" | jq -r '.simple_id // .issue_number // ""')
PROJECT_ID=$(echo "$ISSUE_JSON" | jq -r '.project_id')
ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r '.title // ""')

if [[ -z "$ISSUE_DESC" ]]; then
  echo "issue $ISSUE_ID has no description — refusing to dispatch empty task" >&2
  exit 5
fi

# 2. Render prompt template.
PROMPT=$(sed \
  -e "s|{{BRANCH_NAME}}|${BRANCH_NAME}|g" \
  -e "s|{{ISSUE_SIMPLE_ID}}|${ISSUE_SIMPLE_ID}|g" \
  -e "s|{{ISSUE_TITLE}}|${ISSUE_TITLE//|/\\|}|g" \
  "$TEMPLATE_FILE")
# Append the issue description verbatim (sed-unsafe for long bodies).
PROMPT="${PROMPT}

## TASK

${ISSUE_DESC}"

# 3. Build start_workspace request body.
BODY=$(jq -n \
  --arg repo_id "$REPO_ID" \
  --arg project_id "$PROJECT_ID" \
  --arg issue_id "$ISSUE_ID" \
  --arg executor "$EXECUTOR" \
  --arg variant "$VARIANT" \
  --arg prompt "$PROMPT" \
  '{
    repos: [{ repo_id: $repo_id, target_branch: "main" }],
    linked_issue: { remote_project_id: $project_id, issue_id: $issue_id },
    executor_config: { executor: $executor, variant: $variant },
    prompt: $prompt
  }')

# 4. Dispatch.
RESPONSE=$(curl -fsS -X POST \
  -H "Content-Type: application/json" \
  -d "$BODY" \
  "${VIBE_BACKEND_URL}${API_PREFIX}/workspaces/start")

# 5. Emit machine-readable result.
echo "$RESPONSE" | jq '{
  workspace_id: (.workspace.id // .id),
  execution_id: (.execution_process.id // .execution_id // null),
  branch: (.workspace.branch // .branch // null)
}'
