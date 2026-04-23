---
name: vibe-flow
description: Use when you have a spec or set of requirements and want the full end-to-end loop from spec to merged code - orchestrates vibe-plan → vibe-ship → vibe-link → vibe-review → vibe-merge (with vibe-dispatch-fix and vibe-rebase in the loop) → vibe-standup
---

# vibe-flow (meta)

## Overview

The full loop. You hand in a spec, you get merged code. All other vibe-flow skills are sub-skills invoked in sequence and parallel.

**Core principle:** Human decides scope, agents do the work, verification gates everywhere, escalation stays bounded.

**Announce at start:** "I'm using the vibe-flow skill to run the full pipeline."

## When to use

- User provides a spec and wants "make it happen"
- You're orchestrating a whole feature, not a single task
- User invokes `/vibe-flow:vibe-flow <spec-or-file>`

Do NOT use if:
- User only wants planning → just `vibe-plan`
- User only wants to dispatch existing issues → just `vibe-ship`
- Task is trivial (one issue) → direct MCP `start_workspace`

## Phase map

```
PHASE 1: Plan
  └─ vibe-plan
     └─ (creates issues + DAG)
     └─ (user approves)

PHASE 2: Ship (per wave)
  └─ vibe-ship
     └─ [parallel per issue in wave]
        ├─ dispatch workspace
        ├─ wait for FINAL REPORT
        ├─ vibe-link (open/link PR)
        ├─ vibe-review (subagent)
        ├─ if critical → vibe-dispatch-fix → loop
        ├─ if conflicts → vibe-rebase → loop
        └─ vibe-merge
     └─ wave barrier
  └─ advance to next wave

PHASE 3: Report
  └─ vibe-standup
```

## The process

### Phase 0: Preflight

1. Verify MCP vibe-kanban connection is live: `list_organizations`
2. Verify `gh` CLI authenticated: `gh auth status`
3. Verify we're in a git repo (for branch ops)
4. Read `.vibe-flow.yaml` — fill defaults if missing
5. Check for in-progress run: if `.vibe-flow/state.json` has incomplete run, ASK user:
   - Resume?
   - Discard and start fresh?
   - Cancel?

### Phase 1: Plan

Invoke `vibe-flow:vibe-plan` with the spec.

Outcome: issue tree created, user approved, tags applied.

If user rejects plan → return to brainstorm or abort.

### Phase 2: Ship

Invoke `vibe-flow:vibe-ship` with `scope = "all open issues in project from this run"`.

`vibe-ship` handles:
- Wave DAG
- Parallel dispatch per wave
- Chained vibe-link → vibe-review → vibe-merge
- vibe-dispatch-fix + vibe-rebase loops
- Escalation ceiling
- State persistence

### Phase 3: Report

After ship completes (success, partial, or stopped):
1. Run `vibe-flow:vibe-standup run` (scoped to this run)
2. Deliver to configured channel
3. Write audit trail: `.vibe-flow/runs/<run-id>.md`

## Modes

### `/vibe-flow:vibe-flow full <spec>`

Default. All phases.

### `/vibe-flow:vibe-flow plan-only <spec>`

Stops after Phase 1. User reviews issues before shipping.

### `/vibe-flow:vibe-flow ship-only`

Skip Phase 1 (issues already exist). Goes straight to `vibe-ship`.

### `/vibe-flow:vibe-flow resume`

Resume interrupted run from state.json.

### `/vibe-flow:vibe-flow dry-run <spec>`

Phase 1 + cost estimate + wave preview. No dispatch.

## Input spec formats

Accept any of:
- Inline text in prompt
- Path to markdown file: `/vibe-flow:vibe-flow spec.md`
- GitHub issue URL: `/vibe-flow:vibe-flow https://github.com/.../issues/42`
- Confluence / Notion URL (fetch via WebFetch)
- "Use the selected text" (from terminal selection if available)

## Stop conditions

`vibe-flow` stops (cleanly) when:
- All issues in plan are merged OR explicitly abandoned
- User interrupts with Ctrl-C (state preserved for resume)
- Escalation ceiling reached on >30% of issues (too many failures, something systemic is wrong)
- MCP or git connection lost (preserve state, alert user)

`vibe-flow` does NOT stop for:
- Individual issue escalations (recoverable within ceiling)
- Single rebase conflicts (handled by `vibe-rebase`)
- CI flakes (auto-retry once)

## Cost guardrails

Before starting Phase 2:
1. Sum estimated cost from tier assignments
2. If total > `config.cost_budget_usd`:
   - ASK user to confirm
   - Suggest tier downgrades for low-priority issues
3. Track running cost during Phase 2; if exceeds budget mid-run:
   - ALERT user
   - Pause new dispatches (finish in-flight)
   - Ask: continue, abort, reduce tier for remaining?

## Observability

During long runs:
- Periodic status auto-broadcast (every 30 min) via `vibe-status` summary
- State.json updated after every transition (so `vibe-status` always reflects reality)
- Optional: stream events to log file `.vibe-flow/runs/<run-id>.log`

## Human handoff points

Human MUST be involved at:
- Phase 1 plan approval
- T4 interactive brainstorm (if configured)
- Escalation ceiling hit
- Cost budget exceeded
- Semantic conflict in rebase
- Hotfix 2-approval gate

Human MAY be involved (configurable):
- Per-wave approval before advancing
- Review of T3+ changes (even if `vibe-review` approves)
- Daily standup delivery

## Final report

After all phases:

```
vibe-flow run <run-id> complete.

Spec: <name>
Duration: <X>
Issues planned: <N>
Issues merged: <X>
Issues blocked: <Y>
Issues abandoned: <Z>

Cost: $<total>
Fastest merge: <issue> (<time>)
Slowest merge: <issue> (<time>)
Escalation rate: <X%>

Artifacts:
- Plan: .vibe-flow/plans/<run-id>.md
- State: .vibe-flow/state.json
- Log: .vibe-flow/runs/<run-id>.log
- Standup: posted to <channel>

PRs merged:
  <list with links>

Blocked issues requiring attention:
  <list>
```

## Remember

- Never skip verification gates
- Human approves plan, agents do work
- State.json = source of truth, update it
- Escalate on evidence, don't hammer with same tier
- Report at end — agents can't know if value was delivered, human does
