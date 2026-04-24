---
id: vibe-ship
title: vibe-ship
---

# vibe-ship

Walks the issue DAG in waves, dispatching workspaces in parallel, and chains
`vibe-link → vibe-review → vibe-merge` per issue, with `vibe-dispatch-fix` and
`vibe-rebase` in the loop on failures.

## Invoke

```
/vibe-flow:vibe-ship                        # all open issues in the project
/vibe-flow:vibe-ship --wave 2               # one specific wave
/vibe-flow:vibe-ship --issues ISSUE-42,ISSUE-17
```

## Wave semantics

See [waves & the DAG](../concepts/waves.md). Two barrier modes: `merge`
(default) or `pr-open`.

## Per-issue sub-loop

1. Dispatch workspace (executor picked by tier)
2. Wait for `FINAL REPORT`
3. `vibe-link` → opens/links PR, moves issue to `in_review`
4. `vibe-review` → fresh subagent reviews, posts to GitHub
5. If critical → `vibe-dispatch-fix` (bounded re-tries)
6. If behind main → `vibe-rebase`
7. `vibe-merge` → squash, close, archive

## Escalation ceiling

Per issue, vibe-ship stops after N failed dispatches (config
`escalation_ceiling`, default 3). At 30% of issues escalated, the whole run
aborts — something systemic is wrong.

## Full reference

[skills/vibe-ship/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-ship/SKILL.md)
