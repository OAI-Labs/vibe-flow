---
name: vibe-ship-fast
description: Use when you want to ship a planned spec locally without vibe-kanban or per-feature PRs - dispatches sub-agents in git worktrees off a dev-wave integration branch, merges and reviews each wave locally, opens one final PR to main at the end
---

# vibe-ship-fast

## Overview

Local-mode dispatch. No vibe-kanban API, no per-feature PR. Sub-agents work in git worktrees off a single integration branch (`dev-wave-<ts>`), waves merge locally, one PR opens to `main` at the end.

**Core principle:** Same wave/DAG model as `vibe-ship`, but every API call goes to the local git tree and the Agent tool. Cheap when you don't need kanban tracking — quick prototypes, solo runs, offline work.

**Announce at start:** "I'm using the vibe-ship-fast skill (local mode)."

## When to use

- `.vibe-flow/plan-local.json` exists (from `vibe-plan --local`) OR user passes a spec inline
- No need for vibe-kanban tracking on this run
- User wants one PR at the end, not one-per-issue

Do NOT use if:
- Run is already tracked in vibe-kanban → use `vibe-ship`
- User explicitly wants per-feature PRs and review-on-GitHub → use `vibe-ship`
- Spec is one trivial change → just do it inline

## Required references

- `references/executor-routing.md` — tier triage (subagent_type mapping below)
- `references/wave-scheduler.md` — DAG → wave algorithm
- `references/prompt-templates.md` — closing protocol (still injected into each subagent)

## Tier → subagent_type mapping

Local mode uses the Agent tool, not VK executors. Default mapping:

| Tier | Agent subagent_type | Model override |
|------|---------------------|----------------|
| T0   | general-purpose     | haiku          |
| T1   | general-purpose     | sonnet         |
| T2   | general-purpose     | sonnet         |
| T3   | general-purpose     | opus           |
| T4   | vibe-flow:vibe-explorer (per approach, N=3) then general-purpose with winner | opus |

Override via `.vibe-flow.yaml` → `local.tier_agents`.

## The process

### Step 1: Load plan + config

1. Read `.vibe-flow.yaml`. Apply defaults.
2. Read `.vibe-flow/plan-local.json`. If missing AND `$ARGUMENTS` has a spec → invoke `vibe-plan --local` first, then continue.
3. Check `.vibe-flow/state-local.json`:
   - Has incomplete run → **resume**: skip already-merged issues, re-dispatch failed
   - Else → **fresh**

### Step 2: Create the wave branch

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
BASE_SHA=$(git rev-parse HEAD)
WAVE_BRANCH="dev-wave-$(date -u +%Y%m%d-%H%M)"
git checkout -b "$WAVE_BRANCH"
git push -u origin "$WAVE_BRANCH"   # so subagent worktrees can be reviewed remotely if needed
```

Persist `wave_branch` and `base_sha` to `state-local.json`.

### Step 3: Present plan + waves

Compute waves from the plan's DAG (same algorithm as `references/wave-scheduler.md`). Show:

```
vibe-ship-fast plan:
  Integration branch: dev-wave-20260511-1430 (off main @ abc123)
  Issues: <N> | Waves: <M>

Wave 0 (parallel):
  - [T1 sonnet] L1: Define notification model     → feat/L1-notif-model
  - [T2 sonnet] L2: Add migration                  → feat/L2-migration
Wave 1 (waits on Wave 0):
  - [T3 opus]   L3: Notification service           → feat/L3-notif-service

Final step: one PR from dev-wave-... → main

Proceed? (yes / modify / abort)
```

### Step 4: Execute each wave

For each wave L (sequential between waves, parallel within):

**4a. Spawn one subagent per issue in parallel.**

For issue I in wave L:
1. Compute tier → resolve `subagent_type` + `model` per mapping above.
2. Compute `feat_branch = feat/<L-id>-<slug>` (slug from issue title).
3. Dispatch with `isolation: "worktree"` so each agent gets its own working tree off the wave branch.

```
Agent({
  description: "Implement <issue title>",
  subagent_type: "<resolved>",
  model: "<resolved>",
  isolation: "worktree",
  prompt: "<see prompt template below>"
})
```

**Parallel:** issue all Agent calls in a single message with multiple tool uses.

**Prompt template per agent** (built from `references/prompt-templates.md` closing protocol + local-mode preamble):

```
You are working on issue <L-id>: <title>.

## Branch setup (do this first)
You are in an isolated worktree. Your starting branch is the wave integration branch.
Create your feature branch off the current HEAD:

  git checkout -b <feat_branch>

## Issue
<full description from plan-local.json>

## Acceptance criteria
<bullets>

## Closing protocol
When done:
1. Stage and commit ALL your changes to <feat_branch>.
2. Push: git push -u origin <feat_branch>
3. Emit a <VIBE-FLOW-REPORT> block as the last thing in your reply:
   <VIBE-FLOW-REPORT>
   status: completed | blocked
   branch: <feat_branch>
   summary: <one line>
   </VIBE-FLOW-REPORT>

If blocked, do not commit speculative changes — emit status: blocked with a reason.
```

Record in `state-local.json`: `{status: dispatched, feat_branch, agent_task_id}`.

**4b. Barrier — wait for all agents in this wave.**

Agent tool returns when each subagent finishes. Collect results.

For each result, parse the `<VIBE-FLOW-REPORT>`:
- `completed` + branch pushed (`git ls-remote --heads origin <feat_branch>` non-empty) → mark `ready_to_merge`
- `blocked` → log, ask user at end of wave whether to skip or retry
- Crash / no report → mark `failed`, schedule a retry dispatch with the next tier up (max 2 escalations)

**4c. Sequential local merge into wave branch.**

For each `ready_to_merge` issue in dependency order:

```bash
git checkout "$WAVE_BRANCH"
git fetch origin
git merge --no-ff "origin/$feat_branch" -m "merge $feat_branch into $WAVE_BRANCH"
```

Conflict path:
1. If conflict → dispatch a fix subagent (opus, isolation: worktree on the feat branch) with the conflict diff and ask it to rebase onto current `$WAVE_BRANCH`.
2. Re-attempt merge after the agent pushes.
3. Two failed rebases in a row → stop and ask the user.

After all wave merges land, push `$WAVE_BRANCH` to origin.

**4d. Per-wave local review.**

Compute the wave's diff:

```bash
PREV=$(jq -r ".waves[\"$((L-1))\"].head_sha // .base_sha" .vibe-flow/state-local.json)
CURR=$(git rev-parse "$WAVE_BRANCH")
```

Dispatch `vibe-flow:vibe-reviewer` with the diff `$PREV..$CURR` and the wave's issue list (titles + acceptance criteria from plan-local.json). Reviewer returns a VIBE-REVIEW block with severity-classified findings.

Routing:
- Only `nit` / `suggestion` findings → log to `state-local.json.review.wave_<L>` and advance.
- Any `critical` or `important` → dispatch a fix subagent with the findings + diff. After the fix lands on `$WAVE_BRANCH`, re-review. Max 2 review loops per wave.
- Persistent critical after 2 loops → STOP and surface to user.

Persist `waves[L].head_sha = $CURR` after review passes.

**4e. Advance.**

Move to wave L+1.

### Step 5: Final PR

After the last wave:

```bash
git push origin "$WAVE_BRANCH"
gh pr create --base main --head "$WAVE_BRANCH" \
  --title "<spec title from plan-local.json>" \
  --body "$(cat .vibe-flow/state-local.json | jq -r '... summary ...')"
```

PR body should include:
- Spec summary
- Per-wave issue list with status
- Link to each per-wave review block (or inline them)

Update `state-local.json.status = "pr_opened"` + record `pr_url`.

Do NOT auto-merge. The final PR exists so the user (or `vibe-review` on GitHub) gets one last gate before `main`.

### Step 6: Report

```
vibe-ship-fast complete.

Integration branch: dev-wave-20260511-1430
Waves: <M> | Issues merged into wave branch: <X> | Blocked: <Y>
Final PR: <url>

State: .vibe-flow/state-local.json
```

## Concurrency

Respect `config.max_parallel` (default 5). If a wave has more issues, batch within the wave with a mini-barrier between batches — but still no merge until the whole wave is `ready_to_merge` (keeps the merge ordering deterministic).

## Verification gates

Before marking a wave done:
- Every feat branch in the wave is merged into `$WAVE_BRANCH` locally (`git branch --merged $WAVE_BRANCH | grep <feat_branch>`)
- `git status` is clean
- Review findings are not `critical`

Before opening the final PR:
- `$WAVE_BRANCH` is pushed and up-to-date with origin
- `git diff main..$WAVE_BRANCH` is non-empty

Follow superpowers:verification-before-completion — no claim without fresh evidence.

## Escalation chain

Per issue (same as `vibe-ship`, simpler dispatch):
1. Initial tier fails (crash / blocked / unfixable conflict) → re-dispatch with next tier
2. Second escalation → opus + verbose prompt
3. Third failure → mark `blocked`, ask user

## When to stop and ask

- DAG cycle in plan-local.json
- Two consecutive review loops still produce critical findings
- Merge conflict that the fix subagent couldn't resolve twice
- More than 3 issues in a wave are `blocked`

## Differences vs vibe-ship (cheat-sheet)

| Concern              | vibe-ship                          | vibe-ship-fast                     |
|----------------------|------------------------------------|------------------------------------|
| Issue source         | vibe-kanban MCP                    | `.vibe-flow/plan-local.json`       |
| Dispatch             | `vibe-dispatch.sh` → VK executor   | `Agent` tool + `isolation: worktree` |
| Per-feature PR       | yes (via `vibe-link`)              | no                                 |
| Per-feature review   | `vibe-review` on GitHub PR         | local `vibe-reviewer` per wave     |
| Merge target         | `main` per issue                   | `dev-wave-<ts>` per issue, then one PR to `main` |
| State                | `.vibe-flow/state.json`            | `.vibe-flow/state-local.json`      |
| Final PR             | n/a (already merged)               | one PR `dev-wave-... → main`       |

## Sub-skills (you will invoke these)

- `vibe-flow:vibe-plan` with `--local` — if `plan-local.json` is missing
- `vibe-flow:vibe-reviewer` (agent) — per-wave review
- `vibe-flow:vibe-rebase` — only on stubborn merge conflicts (rare; merge is local here)

## Remember

- One integration branch, many feature branches, one final PR
- Worktree isolation is what makes parallel safe — never let two agents share a working tree
- Review per wave, not per issue, not per PR — the wave is the local unit
- `state-local.json` is the source of truth — update after every transition
