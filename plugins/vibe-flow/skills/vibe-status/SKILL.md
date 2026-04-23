---
name: vibe-status
description: Use when you want a snapshot of all active vibe-kanban workspaces, their PRs, and any inconsistencies - shows dashboard-style table with workspace state, branch, PR status, CI, and review state, flags anything stuck or inconsistent
---

# vibe-status

## Overview

Quick read-only dashboard of active work. Reconciles state.json with live MCP + GitHub data to detect inconsistencies.

**Core principle:** Reality check — surface what's really happening across vibe-kanban, git, and GitHub.

**Announce at start:** "I'm using the vibe-status skill to check work state."

## When to use

- User asks "what's running?" / "status?" / "how's the queue?"
- Debugging why a wave is stuck
- Before starting new work, to see current load

This skill is read-only. It never modifies state or dispatches.

## The process

### Step 1: Load state.json

Read `.vibe-flow/state.json`. If missing → "No active run. Start with /vibe-flow:vibe-ship or /vibe-flow:vibe-plan."

### Step 2: Reconcile each tracked issue

For each issue in state.json:

```
A. Query MCP: get_issue(issue_id) → current issue status
B. Query MCP: list_sessions(workspace_id) → workspace state
C. Query gh: gh pr view <PR> --json state,mergeable,checks,reviews (if PR recorded)
D. Compare to state.json → flag inconsistencies
```

### Step 3: Compose dashboard

Output a table grouped by wave, with columns:

```
Wave 0 (completed):
┌───────────┬──────────┬──────┬──────────────────────┬─────┬────────┬──────────┐
│ Issue     │ Tier     │ Exec │ Branch               │ PR  │ CI     │ Status   │
├───────────┼──────────┼──────┼──────────────────────┼─────┼────────┼──────────┤
│ A20K-1    │ T0       │ flash│ vk/a20k-1-remove-ai  │ #42 │ ✓      │ merged   │
│ A20K-3    │ T2       │ s4.6h│ vk/a20k-3-pagination │ #43 │ ✓      │ merged   │
└───────────┴──────────┴──────┴──────────────────────┴─────┴────────┴──────────┘

Wave 1 (in progress):
┌───────────┬──────────┬──────┬──────────────────────┬─────┬────────┬──────────────┐
│ A20K-5    │ T2       │ s4.6h│ vk/a20k-5-auth-oidc  │ #44 │ ⏳ run │ in_review    │
│ A20K-6    │ T1       │ s4.6m│ vk/a20k-6-form-val   │ --  │ --     │ workspace..  │
│ A20K-7    │ T3       │ opus │ vk/a20k-7-migration  │ --  │ ✗      │ review_crit! │
└───────────┴──────────┴──────┴──────────────────────┴─────┴────────┴──────────────┘

Cost so far: ~$<amount>
Started: <timestamp>
```

Emoji/icons:
- `✓` CI pass / approved / merged
- `✗` CI fail / review critical / blocked
- `⏳` running / pending
- `--` not yet reached this stage
- `!` flag — inconsistency detected

### Step 4: Highlight inconsistencies

For each issue, check:

| Inconsistency | Example | Flag |
|---|---|---|
| state.json says `pr_open` but no PR on GitHub | workspace didn't link | `push_missing` |
| state.json says `merged` but PR is still open | stale state | `state_stale` |
| Workspace has no recent activity > timeout | hung | `workspace_stuck` |
| CI has been running > 30 min | slow CI | `ci_slow` |
| Review approved but not merged > 1 hour | merge forgotten | `merge_pending` |
| Branch deleted but issue not closed | orphaned | `branch_orphan` |

Output after table:
```
⚠️ Inconsistencies:
  - A20K-6: workspace_stuck (no update in 90m, last session heartbeat: <time>)
  - A20K-7: review_critical but no fix dispatched yet
```

### Step 5: Suggest actions

```
Recommended next actions:
  - A20K-6: Run /vibe-flow:vibe-dispatch-fix to retry (T1 → T2)
  - A20K-7: Fix dispatch has been waiting 20m; dispatch now?
  - Wave 1 barrier: 1 of 3 issues merged. 2 remain to advance.
```

## Standalone run (no state.json)

If called without an active state.json, still useful:
1. List recent workspaces via MCP `list_workspaces`
2. For each, check branch + PR on GitHub
3. Show a similar table without wave grouping
4. Useful for post-hoc inspection

## Cost breakdown mode

`/vibe-flow:vibe-status cost` → show cost aggregation:
```
Cost by tier (this run):
  T0 (flash): $0.02 (1 issue)
  T1 (s-med): $0.15 (2 issues)
  T2 (s-hi):  $1.20 (4 issues, 2 with escalation)
  T3 (opus):  $2.40 (1 issue, 1 fix)

Total: $3.77
Avg per merged issue: $0.54
Worst cost/value: A20K-7 (T3, 3 escalations, still not merged)
```

## Wait mode

`/vibe-flow:vibe-status --wait` → poll every 30s until wave barrier advances or user interrupts. Useful for long waits.

## Output

Return the table + inconsistencies + suggestions. No changes made.

## Remember

- Read-only — never dispatch, never update state
- Cross-reference vibe-kanban + git + GitHub
- Flag anything that doesn't match state.json
- Suggest next action but don't take it
