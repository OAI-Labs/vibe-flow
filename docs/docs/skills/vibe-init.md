---
id: vibe-init
title: vibe-init
---

# vibe-init

First-time setup for a repo that will use vibe-flow. Asks 3–4 questions, writes
a minimal `.vibe-flow.yaml`, scaffolds `.vibe-flow/state.json`, and optionally
gitignores the state directory.

## Invoke

```
/vibe-flow:vibe-init
```

## When to use

- First time using vibe-flow in a repo (no `.vibe-flow.yaml` present)
- You want to reconfigure (re-pick project, re-set defaults)

## What it asks

1. **Project** — picks from `list_projects` on vibe-kanban. No pasting UUIDs.
2. **Concurrency + budget** — `max_parallel`, `cost_budget_usd`, `wave_barrier`.
   Enter to accept defaults.
3. **Notifications** (optional) — Slack/Discord webhook.
4. **`ready_to_merge` column** (optional) — if your board has one, its name goes
   in `statuses.ready_to_merge`.

## Output

- `.vibe-flow.yaml` at repo root (commit this)
- `.vibe-flow/state.json` skeleton
- Optional `.vibe-flow/` entry in `.gitignore`

Idempotent: re-running won&rsquo;t clobber existing state.

## Full reference

[skills/vibe-init/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-init/SKILL.md)
