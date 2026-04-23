---
name: vibe-merge
description: Use when a PR is approved by vibe-review and ready to merge - verifies CI green, checks for conflicts against latest main, rebases if needed, squash merges, archives the workspace, and closes the issue
---

# vibe-merge

## Overview

Final gate before code lands on main. Verifies every condition, handles conflicts by delegating to `vibe-rebase`, squash-merges via `gh`, closes the loop.

**Core principle:** Never merge without fresh verification. No hope-based merges.

**Announce at start:** "I'm using the vibe-merge skill to merge the PR."

## When to use

- PR is approved (by `vibe-review` or human)
- OR issue is `hotfix` with 2+ human approvals (bypass path)
- Issue status `approved` or `ready_to_merge` in state.json

Do NOT use if:
- Review pending or requested changes
- CI failing
- Conflicts present (go to `vibe-rebase` first)

## The process

### Step 1: Gate verification (iron law)

Follow superpowers:verification-before-completion. Run fresh commands.

```bash
PR=<PR_NUMBER>

# 1. CI status
gh pr checks $PR --json state,conclusion
# All conclusions must be SUCCESS or NEUTRAL (skipped)

# 2. Review status
gh pr view $PR --json reviewDecision
# Must be APPROVED

# 3. Mergeable?
gh pr view $PR --json mergeable,mergeStateStatus
# mergeable: MERGEABLE, mergeStateStatus: CLEAN or UNSTABLE (not BLOCKED/BEHIND/DIRTY)

# 4. Branch up-to-date with base?
git fetch origin
BASE_SHA=$(git rev-parse origin/main)
PR_BASE=$(gh pr view $PR --json baseRefOid --jq '.baseRefOid')
# If PR_BASE != BASE_SHA → rebase needed
```

If ANY gate fails → STOP, do not merge. Route:
- CI failing → `vibe-dispatch-fix` with CI logs
- Review not approved → wait or escalate
- Conflicts / behind → `vibe-flow:vibe-rebase`

### Step 2: Squash merge

```bash
gh pr merge $PR --squash --delete-branch=false
```

Get the resulting commit SHA:
```bash
MERGE_SHA=$(gh pr view $PR --json mergeCommit --jq '.mergeCommit.oid')
```

We keep the branch temporarily for audit; delete in Step 4 or via archive policy.

### Step 3: Post-merge verification

```bash
gh pr view $PR --json state,mergedAt
# state: MERGED, mergedAt: <timestamp>
```

Confirm merge commit landed on main:
```bash
git fetch origin
git log origin/main --oneline -1 | grep $MERGE_SHA
```

If not landed → something weird (protected branch, async merge), wait 30s and retry once.

### Step 4: Close loop

**A. Update vibe-kanban issue:**

Use MCP `update_issue` to:
- Set status to `completed` or equivalent done status
- Add comment:
  ```
  [vibe-flow] Merged to main.
  PR: <PR_URL>
  Commit: <MERGE_SHA>
  Merged at: <timestamp>
  ```

**B. Update state.json:**

```json
{
  "issue_id": "...",
  "status": "merged",
  "merged_at": "<ISO>",
  "merge_sha": "<SHA>"
}
```

**C. Archive workspace (optional but recommended):**

Call MCP `update_workspace` to archive (if archive flag supported) or `delete_workspace` after `archive.keep_workspace_after_merge_days`.

**D. Branch deletion:**

Scheduled, not immediate:
- Record `branch_delete_at = now + config.archive.delete_branch_after_days`
- A separate cron/scheduled task deletes branches past the due date
- OR delete immediately if `config.archive.delete_branch_after_days = 0`

Immediate delete:
```bash
gh api -X DELETE repos/<owner>/<repo>/git/refs/heads/<BRANCH> 2>/dev/null || true
```

### Step 5: Trigger downstream

If this issue was blocking others (via relationships):
- The blocked issues become eligible when all blockers merged
- If called from `vibe-ship`, the wave barrier advances when this completes

### Hotfix bypass path

If issue tagged `hotfix` AND ≥ 2 human approvals in comments:

**Modified flow:**
1. Skip review gate (but still gate on CI green)
2. Merge via `gh pr merge --squash`
3. Post-merge: async dispatch `vibe-review` for audit trail (don't block)
4. Tag the issue with `hotfix-audit-pending` until audit review arrives

## Multi-repo merging

If issue spans PRs on multiple repos:
1. Gate verify ALL PRs (Step 1)
2. If any fails → STOP, none merged yet
3. Merge all PRs in sequence (not parallel — order by dependency if any)
4. If second merge fails after first succeeded:
   - ALERT user immediately
   - Mark state `partial_merge`, do not revert the first (that's up to user)
   - Log as critical incident

Prefer merging the "library" repo before the "consumer" repo if there's a dependency.

## Conflict handling

If Step 1 reports `mergeStateStatus: BEHIND` or `DIRTY`:
- Do NOT attempt `gh pr merge`
- Invoke `vibe-flow:vibe-rebase` with PR info
- After rebase, re-invoke `vibe-merge`

Max 2 rebase attempts per PR. After that → `blocked`, notify user.

## Failure modes

| Failure | Handling |
|---|---|
| CI goes red between approve and merge | Abort, re-dispatch fix |
| Someone pushed to base main during merge | Retry rebase + merge once |
| Merge commit doesn't land (weird GitHub state) | Wait 30s, re-verify; if still missing, alert user |
| GitHub API rate limit | Sleep + retry once |
| `gh` not authenticated | Prompt user |

## Output

```
Merged PR #<N> for issue <SIMPLE_ID>
  Commit: <MERGE_SHA>
  Branch: <BRANCH_NAME> (delete at <date>)
  Issue: closed
  Next in wave: <count> issues unblocked
```

## Sub-skills

- Invokes `vibe-flow:vibe-rebase` on conflicts
- Invokes `vibe-flow:vibe-dispatch-fix` on CI regression

## Remember

- Iron law: verify fresh before claiming merge
- CI green + review approved + clean merge state — all three required
- Handle multi-repo atomically where possible
- Close vibe-kanban issue + update state.json after every merge
- Delete branches per archive policy, not immediately unless configured
