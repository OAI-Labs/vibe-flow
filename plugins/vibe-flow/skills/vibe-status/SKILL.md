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

Primary source of truth is **git + GitHub**, not the VK MCP API. VK status calls have been
flaky, so derive workspace state from observable branch activity instead. VK MCP is a
**soft check** — used if it responds quickly, ignored on error/timeout.

**Branch naming — critical gotcha.** Vibe-kanban auto-creates an internal "working branch"
per workspace (visible in VK workspace metadata, sometimes shown truncated in the UI). This
is **NOT the same** as the actual git branch the agent pushed to `origin`. Always use the
branch reported in the agent's FINAL REPORT (recorded by vibe-link into `state.json[issue].branch`)
as canonical. The VK working branch may be: (a) truncated, (b) prefixed differently, or
(c) absent on `origin` entirely if the agent renamed it before push. If `state.json[issue].branch`
fails `git ls-remote`, do NOT silently fall back to VK's working branch — flag `branch_mismatch`
and let the user inspect.

For each issue in state.json (each has a recorded `branch` field from vibe-link, sourced
from the FINAL REPORT — this is the actual pushed git branch, not VK's working branch):

```
A. git fetch origin <branch> --quiet  (single ref, fast)
B. git ls-remote origin refs/heads/<branch> → exists? remote SHA?
C. If branch exists:
     git log --format="%H %ct %an %s" origin/main..origin/<branch>
       → commit count, last commit time, last author, last subject
D. gh pr list --head <branch> --json number,state,mergeable,statusCheckRollup,reviewDecision
     → PR state, CI, review decision (-- if no PR)
E. SOFT: try get_issue(issue_id) with short timeout (~3s). On success, cross-check
     against derived state and flag drift. On error/timeout, skip silently.
F. Derive workspace state from B/C/D — see rules below.
```

**Workspace state derivation (no VK API needed):**

| Observed | Derived state |
|---|---|
| Branch missing, PR merged | `merged` |
| Branch missing, PR closed unmerged | `abandoned` |
| Branch missing, no PR | `branch_orphan` |
| Branch exists, no commits past main | `workspace_empty` |
| Branch exists, last commit < 10 min ago | `running` |
| Branch exists, last commit 10–60 min ago, no PR | `pushing` |
| Branch exists, PR open, CI green, approved | `merge_pending` |
| Branch exists, PR open, CI red | `ci_fail` |
| Branch exists, PR open, review critical | `review_critical` |
| Branch exists, last commit > 90 min ago, no PR | `workspace_stuck` |

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

| Inconsistency | Detected via | Flag |
|---|---|---|
| state.json says `pr_open` but `gh pr list --head <branch>` returns none | gh | `push_missing` |
| state.json says `merged` but PR still open on GitHub | gh | `state_stale` |
| Branch has no commit in > 90 min and no PR | git log timestamp | `workspace_stuck` |
| PR CI checks have been running > 30 min | gh statusCheckRollup | `ci_slow` |
| Review approved but not merged > 1 hour | gh reviewDecision + state.json | `merge_pending` |
| Branch deleted but state.json issue not closed | git ls-remote empty | `branch_orphan` |
| VK soft-check disagrees with derived state | get_issue vs derived | `vk_drift` (info only) |
| state.json branch not found on origin, but VK reports a (different) working branch | git ls-remote + VK meta | `branch_mismatch` |

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
1. List recent branches: `git for-each-ref --sort=-committerdate --format='%(refname:short) %(committerdate:iso8601) %(authorname)' refs/remotes/origin/ | head -20`
2. Filter to vibe-kanban naming convention (e.g. `vk/`, `vibe/`) if configured
3. For each, check open PRs via `gh pr list --head <branch>` and derive state per the rules in Step 2
4. Show a similar table without wave grouping
5. Optional soft VK check via `list_workspaces` — ignore on error

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
