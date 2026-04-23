---
name: vibe-ship
description: Use when you have vibe-kanban issues ready to dispatch to coding agents - turns an issue tree into execution waves with parallel dispatch, executor routing by complexity (T0-T4), and barrier sync between waves
---

# vibe-ship

## Overview

Wave-based parallel dispatch for vibe-kanban issues. Route each issue to the cheapest executor that can plausibly solve it, run waves in parallel, barrier between waves.

**Core principle:** Cheap first, escalate on failure. Barrier between waves, never between issues within a wave.

**Announce at start:** "I'm using the vibe-ship skill to dispatch issues."

## When to use

- User has issues in a vibe-kanban project ready to work on (from `vibe-plan` or manually created)
- User wants agents to actually do the work, not just plan
- Multiple issues with or without dependencies

Do NOT use if:
- Issues don't exist yet → use `vibe-plan` first
- User wants to manually pick one issue → use `start_workspace` directly via MCP
- Running in a subagent that was dispatched by `vibe-ship` itself

## Required references

Load before dispatching:
- `references/executor-routing.md` — tier triage + fallback chain
- `references/prompt-templates.md` — closing protocol (MUST inject into every workspace)
- `references/wave-scheduler.md` — DAG algorithm + state persistence

## The process

### Step 1: Load config and state

1. Read `.vibe-flow.yaml` at repo root. Apply defaults if missing.
2. Check `.vibe-flow/state.json`:
   - If exists and has incomplete run → **resume mode**: reconcile and continue from last consistent state
   - Else → **fresh mode**: start new run

### Step 2: Determine scope

Ask user (or use `$ARGUMENTS`):
- Which issues to ship? Options:
  - All open issues in project
  - Issues matching a tag (e.g., `sprint:q2`)
  - Specific issue IDs / simple_ids
  - A parent issue's sub-tree

Use `list_issues` with filters. Fetch relationships for each to build DAG.

### Step 3: Build DAG and waves

Follow `references/wave-scheduler.md` step 1-2.

Present to user:
```
Wave plan (N waves, M total issues):

Wave 0 (<count> issues, parallel):
  - [T0 gemini-flash] A20K-1: Remove AI Literacy column
  - [T2 sonnet-high] A20K-3: Add pagination to /dashboard
  - [T1 sonnet-medium] A20K-4: Refactor login form

Wave 1 (<count> issues, parallel, waits on Wave 0):
  - [T3 opus] A20K-5: Migrate auth to OIDC (blocked by A20K-4)

Estimated cost: $<X>
Max opus in single wave: <N>
Barrier mode: merge

Proceed? (yes / modify / abort)
```

If user says "modify": let them override tiers or remove issues, then re-present.

### Step 4: Execute waves

For each wave L:

**4a. Pre-wave sync**
```bash
git fetch origin
git checkout main
git pull origin main
```

**4b. For each issue in wave (parallel):**
1. Compute tier via `executor-routing.md`
2. Honor `max_opus_per_wave` — downgrade lowest-criticality opus issues to sonnet-high
3. Compute branch name `vk/<simple-id>-<slug>`
4. Build prompt: `{issue_description}` + closing-protocol template with `{{BRANCH_NAME}}` filled in
5. Call MCP `start_workspace`:
   ```
   executor = tier.executor
   variant = tier.variant
   name = branch_name
   repositories = [{repo_id, branch: branch_name}]
   issue_id = issue.id
   prompt = built_prompt
   ```
6. Record in state.json: `status: dispatched`

**Dispatch in parallel** — issue calls in a single message with multiple tool invocations.

**4c. Wait for wave barrier**

Poll each workspace's sessions (`list_sessions` + `get_execution`) until:
- FINAL REPORT received (`status: complete` or `blocked`)
- OR `workspace_timeout_minutes` elapsed

For each completed workspace:
- If `status: complete`: trigger `vibe-flow:vibe-link` to open/link PR
- If `status: blocked`: log, leave for user
- If timeout: mark failed, schedule `vibe-dispatch-fix`

**4d. Per-issue closing flow**

After `vibe-link`:
1. Run `vibe-flow:vibe-review`
2. If review approves: `vibe-flow:vibe-merge`
3. If review has critical: `vibe-flow:vibe-dispatch-fix` → loop back to review
4. If merge hits conflict: `vibe-flow:vibe-rebase` → re-review → merge

**4e. Wave complete check**

Wave L done when ALL issues are:
- Merged (barrier=merge) OR
- PR-opened (barrier=pr-open)
- OR marked `abandoned` / `blocked` by user decision

Then advance to L+1.

### Step 5: Run complete

After last wave:
1. Update state.json: `status: completed`
2. Run `vibe-flow:vibe-standup` → summary report
3. Archive: delete merged branches per config `archive.delete_branch_after_days`

## Concurrency limit

Respect `config.max_parallel` (default 5). If wave has 12 issues:
- Batch 1: dispatch 5, barrier
- Batch 2: dispatch next 5, barrier
- Batch 3: dispatch last 2, barrier
- Then advance to next wave

## Verification gate

**REQUIRED:** Before marking any issue `merged` in state.json:

```bash
gh pr view <PR_NUMBER> --json state,mergedAt --jq '.state'
# must return "MERGED"
```

Follow superpowers:verification-before-completion principle — no claim without fresh evidence.

## Escalation chain

When an issue fails (timeout / review critical / CI red):
1. Classify failure type from review feedback or logs
2. Consult `executor-routing.md` fallback chain: current tier → next tier
3. Invoke `vibe-flow:vibe-dispatch-fix` with escalated tier
4. Log escalation in state.json + post comment on issue

Max 3 escalations per issue. After that → mark `blocked`, ask user.

## Hotfix mode

If issue has tag `hotfix` AND issue has ≥ 2 comments from human members (checked via `list_org_members` + comments):
- Skip `vibe-review` gate
- Go straight from `vibe-link` → `vibe-merge` after CI green
- Post-merge: run async `vibe-review` for audit trail

Log hotfix usage in state.json.

## When to stop and ask

**STOP and consult user when:**
- DAG has cycle
- Critical blocker in multiple issues suggests shared misunderstanding
- Wave has been stuck > 2x `workspace_timeout_minutes`
- > 3 escalations in same wave (cost runaway signal)
- `.vibe-flow.yaml` missing `project_id` and no obvious default

## Output format

Final report (post-run):
```
vibe-ship run complete.

Waves: <N>
Issues dispatched: <M>
Merged: <X> | Blocked: <Y> | Abandoned: <Z>
Total cost: ~$<amount>
Total wall time: <duration>

State: .vibe-flow/state.json
```

## Sub-skills (you will invoke these)

- `vibe-flow:vibe-link` — after each workspace completes
- `vibe-flow:vibe-review` — after each PR opened
- `vibe-flow:vibe-merge` — after review approved
- `vibe-flow:vibe-dispatch-fix` — on failure
- `vibe-flow:vibe-rebase` — on conflicts
- `vibe-flow:vibe-standup` — at end

## Remember

- Parallel within wave, barrier between waves
- Cheapest executor first, escalate on actual evidence of failure
- State.json is the source of truth — update it after EVERY state transition
- Never claim merged without `gh pr view` confirmation
