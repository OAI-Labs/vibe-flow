---
id: vibe-flow
title: vibe-flow (meta)
---

# vibe-flow (meta)

The full loop. You hand in a spec; you get merged code. Orchestrates
`vibe-plan` → `vibe-ship` (which runs link → review → merge per issue) →
`vibe-standup`.

## Invoke

```
/vibe-flow:vibe-flow "Add a dark mode toggle to settings"
/vibe-flow:vibe-flow path/to/spec.md
/vibe-flow:vibe-flow https://github.com/org/repo/issues/42
```

## Modes

| Mode | What it does |
|---|---|
| `full` (default) | All phases: plan → ship → standup |
| `plan-only` | Stops after planning; you review before shipping |
| `ship-only` | Skips planning; ships existing open issues |
| `resume` | Picks up an interrupted run from `state.json` |
| `dry-run` | Plan + cost preview + wave map, no dispatch |

```
/vibe-flow:vibe-flow dry-run "Add dark mode"
```

## Phase gates

Human is pulled in at:

- **Phase 1**: plan approval
- **T4 brainstorm**: direction pick (if configured interactive)
- **Cost budget**: if estimate exceeds `cost_budget_usd`
- **Escalation**: > 30% of issues blocked
- **Semantic conflict**: rebase can&rsquo;t resolve automatically
- **Hotfix**: 2-approval gate

## Final report

After the run:

```
vibe-flow run r-2026-04-24-1 complete.
  Issues merged: 4 / 5
  Blocked: 1 (ISSUE-17, reason: spec-gap)
  Cost: $12.40
  PRs: <list>
```

## Full reference

[skills/vibe-flow/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-flow/SKILL.md)
