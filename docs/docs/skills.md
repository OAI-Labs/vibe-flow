---
id: skills
title: Skills overview
sidebar_position: 3
slug: /skills
---

# Skills overview

Eleven skills. Each is invokable directly via `/vibe-flow:<skill>`, or used as a
sub-skill by a higher-level one.

| Skill | Invoke | Purpose |
|---|---|---|
| [vibe-init](./skills/vibe-init.md) | `/vibe-flow:vibe-init` | First-time setup: pick project, scaffold `.vibe-flow.yaml` + state.json |
| [vibe-plan](./skills/vibe-plan.md) | `/vibe-flow:vibe-plan <spec>` | Decompose a spec into an atomic issue tree with deps + tiers |
| [vibe-ship](./skills/vibe-ship.md) | `/vibe-flow:vibe-ship` | Wave-based parallel dispatch with executor routing |
| [vibe-link](./skills/vibe-link.md) | `/vibe-flow:vibe-link` | Link pushed branch to a GitHub PR; move issue to in_review |
| [vibe-review](./skills/vibe-review.md) | `/vibe-flow:vibe-review <PR>` | Two-stage review by a fresh subagent; post to PR |
| [vibe-merge](./skills/vibe-merge.md) | `/vibe-flow:vibe-merge <PR>` | Verify gates, squash merge, close loop |
| [vibe-dispatch-fix](./skills/vibe-dispatch-fix.md) | `/vibe-flow:vibe-dispatch-fix` | Re-dispatch to fix review criticals or CI failures |
| [vibe-rebase](./skills/vibe-rebase.md) | `/vibe-flow:vibe-rebase <PR>` | Resolve conflicts against updated main |
| [vibe-status](./skills/vibe-status.md) | `/vibe-flow:vibe-status` | Snapshot of active workspaces + PRs + inconsistencies |
| [vibe-standup](./skills/vibe-standup.md) | `/vibe-flow:vibe-standup` | Periodic summary to configured channel |
| [vibe-flow](./skills/vibe-flow.md) (meta) | `/vibe-flow:vibe-flow <spec>` | Full loop: plan → ship → review → merge → standup |

## Invocation patterns

Claude Code will auto-discover the relevant skill from your prompt — you don&rsquo;t
have to memorize the exact name. But explicit invocations work too:

```
/vibe-flow:vibe-plan "Ship a dark mode toggle"
/vibe-flow:vibe-ship
/vibe-flow:vibe-review 123
```

## Sub-skill composition

Higher-level skills invoke the specialists:

- **`vibe-flow`** (meta) calls `vibe-plan` → `vibe-ship` → `vibe-standup`
- **`vibe-ship`** calls `vibe-link` → `vibe-review` → `vibe-merge` per issue, with
  `vibe-dispatch-fix` and `vibe-rebase` in the loop on failures

See [waves](./concepts/waves.md) for how the DAG drives parallel dispatch.
