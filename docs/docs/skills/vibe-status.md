---
id: vibe-status
title: vibe-status
---

# vibe-status

Dashboard snapshot: active workspaces, open PRs, issue states, and
**inconsistencies** between vibe-kanban, GitHub, and `state.json`.

## Invoke

```
/vibe-flow:vibe-status
/vibe-flow:vibe-status --run <run_id>
```

## Output

```
Run r-2026-04-24-1 — in progress

Wave 2 / 3 active
  ISSUE-42  [T2]  pr_open       #123  CI: passing   review: pending
  ISSUE-17  [T1]  in_review     #124  CI: passing   review: requested-changes (1 critical)
  ISSUE-08  [T3]  review_critical #125 CI: failing   retries: 2/3

Completed this run: 4
Blocked: 0
Cost so far: $12.40 / $50
```

## Inconsistency detection

Flags situations like:

- Issue marked `pr_open` in state.json but no PR on GitHub
- PR merged but issue not transitioned to `done`
- Workspace status `complete` but branch not pushed

Outputs suggested remediations (which skill to re-run).

## Full reference

[skills/vibe-status/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-status/SKILL.md)
