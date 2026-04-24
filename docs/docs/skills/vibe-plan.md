---
id: vibe-plan
title: vibe-plan
---

# vibe-plan

Decomposes a spec into an atomic issue tree on your vibe-kanban board. Each
leaf is independently dispatchable; dependencies define the DAG that vibe-ship
will walk in waves.

## Invoke

```
/vibe-flow:vibe-plan "Add a dark mode toggle to settings"
/vibe-flow:vibe-plan path/to/spec.md
/vibe-flow:vibe-plan https://github.com/.../issues/42
```

## What it produces

- An **epic** issue (optional)
- **Story** issues, each an atomic deliverable
- **Sub-tasks** when a story is too big
- Explicit `blocking` / `related` / `has_duplicate` relationships
- Tier estimate per issue (T0–T4)
- User approval gate before issues are created

## Short-circuits

If the spec is trivial (&lt; 300 chars, one clear change), it skips the full tree
and just creates a single issue via `create_issue`.

## For T4 (research / ambiguous) issues

Triggers a brainstorm sub-flow with N parallel explorer subagents (configurable
via `brainstorm.explorers`). The human then picks a direction.

## Full reference

[skills/vibe-plan/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-plan/SKILL.md)
