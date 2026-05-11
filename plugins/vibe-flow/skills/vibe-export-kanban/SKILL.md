---
name: vibe-export-kanban
description: Use after the final vibe-ship-fast PR has merged to sync results back to vibe-kanban - posts a comment with the PR url and commit SHA on each linked issue, then transitions the issue to done. Idempotent via a marker comment, never modifies title or description.
---

# vibe-export-kanban

## Overview

One-way sync from a completed local run back to vibe-kanban. For each issue in `plan-local.json` that has a `kanban_id`, post a "merged" comment with the final PR url and the commit SHA, then transition the issue to done. Idempotent — re-running is safe.

**Core principle:** Comment + transition only. Never touch title, description, tags, or relationships. Teammates own the canonical metadata; we just close the loop.

**Announce at start:** "I'm using the vibe-export-kanban skill to sync results back."

## When to use

- `vibe-ship-fast` finished, the final PR is **merged** to `main` (verified via `gh pr view --json state`)
- `.vibe-flow/plan-local.json` exists and at least one issue has a non-null `kanban_id`

Do NOT use if:
- Final PR is still open or closed-without-merge → wait or abandon
- Plan was created by `vibe-plan --local` (no kanban links) → nothing to export, exit early with a message
- A previous export already ran for this commit (detected via marker comment) → no-op confirmation

## The process

### Step 1: Verify preconditions

```bash
# Final PR must be merged
PR_URL=$(jq -r '.pr_url' .vibe-flow/state-local.json)
PR_NUM=$(echo "$PR_URL" | grep -oE '[0-9]+$')
STATE=$(gh pr view "$PR_NUM" --json state,mergeCommit --jq '.state')
[ "$STATE" = "MERGED" ] || { echo "PR $PR_NUM not merged (state=$STATE)"; exit 1; }
MERGE_SHA=$(gh pr view "$PR_NUM" --json mergeCommit --jq '.mergeCommit.oid')
```

If preconditions fail → STOP, report to user.

### Step 2: Load plan + state

Read `.vibe-flow/plan-local.json` and `.vibe-flow/state-local.json`. Build the export set:

```
for each issue in plan-local.json.issues:
  if issue.kanban_id is null → skip (local-only)
  if state-local.json.issues[issue.id].status != "merged" → skip (not actually shipped this run)
  else → include in export set
```

If export set is empty → output "nothing to sync" and exit.

### Step 3: Check the idempotency marker

For each issue in the export set, call `list_issue_comments(issue_id)` (or equivalent MCP read). Look for an existing comment containing:

```
<!-- vibe-flow:merged sha=<MERGE_SHA> -->
```

If a comment with the **same MERGE_SHA** already exists → mark this issue `already_synced`, skip writes.

If a vibe-flow merged comment with a **different** SHA exists → this is unusual (re-merge?). Surface to user, default to skip unless `--force` in `$ARGUMENTS`.

### Step 4: Post comment + transition

For each non-skipped issue, in parallel batches of `config.max_parallel` (default 5):

**4a. Comment** (MCP `create_comment` or equivalent):

```markdown
<!-- vibe-flow:merged sha=<MERGE_SHA> -->
Merged via vibe-ship-fast.

- PR: <PR_URL>
- Commit: `<MERGE_SHA>`
- Wave: <wave index from state-local.json>
- Local branch (pre-merge): `<feat_branch from state-local.json>`

This issue is being transitioned to done by vibe-export-kanban.
```

**4b. Transition** (MCP `transition_issue` or `update_issue_status`):

Resolve the target status:
1. If `.vibe-flow.yaml` has `kanban.done_status` → use it
2. Else read available transitions; prefer one named `done`, `closed`, `merged`, in that order
3. Else STOP and ask user which status to use (do not guess)

Transition the issue.

**Order:** comment FIRST, then transition. If the transition fails after the comment is posted, the next run sees the marker and won't double-comment, but will retry the transition.

### Step 5: Report

```
vibe-export-kanban complete.

Synced: <X> issues
Already-synced (skipped): <Y>
Local-only (skipped): <Z>
Failed: <W>

Issues:
  KAN-12 ✓ merged → done
  KAN-15 ✓ merged → done
  KAN-19 ⚠ comment posted, transition failed (no 'done' status found)
  L4    – local-only, no kanban link
```

If any `Failed`, the run exits non-zero so an outer loop / `vibe-flow` can branch on it.

### Step 6: Persist export receipt

Append to `.vibe-flow/state-local.json`:

```json
{
  "export": {
    "pr_url": "...",
    "merge_sha": "...",
    "exported_at": "<ISO-8601 UTC>",
    "synced": ["KAN-12", "KAN-15"],
    "skipped": ["KAN-9 (already-synced)", "L4 (local-only)"],
    "failed": [{"id": "KAN-19", "reason": "no done status"}]
  }
}
```

So a later run can show what happened without re-querying kanban.

## Idempotency

Marker comment `<!-- vibe-flow:merged sha=<SHA> -->` is the lock. Same SHA → no-op. Different SHA on the same issue → ask (rare; usually means the PR was reverted then re-merged).

Status transition is idempotent by nature (transitioning a done issue to done is a no-op in vibe-kanban). If it isn't on a given backend, skip the API call when the current status already matches the target.

## What this skill explicitly does NOT do

- Update issue title or description (teammates may have edited those)
- Update tags or labels
- Create new kanban issues for local-only items (out of scope; user can create manually if needed)
- Reopen or modify already-closed issues
- Touch issues that were not part of this run

## When to stop and ask

- No `done` status discoverable and not configured
- Marker comment with a **different** SHA already on an issue
- `state-local.json` says some issues are `blocked` / `failed` — confirm we should still close the merged ones (default: yes, surface the blocked ones at the end so user can handle them separately)
- More than 25% of issues fail to transition (signals a backend / permissions issue, not per-issue problems)

## Remember

- Comment first, transition second — the marker is what makes us idempotent
- Read-only on metadata, write-only on comments + status
- Final PR must be MERGED, not just open or closed
- Skip local-only issues silently; they were never on the board
