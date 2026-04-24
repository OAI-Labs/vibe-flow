---
id: vibe-dispatch-fix
title: vibe-dispatch-fix
---

# vibe-dispatch-fix

Re-dispatches a workspace to fix specific problems — review criticals, CI
failures, or merge conflicts. Keeps the same issue but sends a new prompt with
the failure context.

## Invoke

```
/vibe-flow:vibe-dispatch-fix <issue_id> --reason review-critical
/vibe-flow:vibe-dispatch-fix <issue_id> --reason ci-failure
/vibe-flow:vibe-dispatch-fix <issue_id> --reason conflict
```

## What it sends to the executor

The fix workspace gets:

- The original issue + its spec
- The failure context (review comments / CI logs / conflict markers)
- Explicit instructions: fix ONLY the listed problems, don&rsquo;t refactor
  adjacent code

## Tier escalation

Consecutive fix dispatches escalate up the fallback chain. If T2 sonnet failed
twice, the third attempt goes to T3 opus. Ceiling is `escalation_ceiling`
(default 3) — after that, the issue is marked `blocked` and the human is
pulled in.

## Idempotent re-runs

Picks up the existing workspace if still alive, rather than creating a new one
— unless the workspace is unrecoverable.

## Full reference

[skills/vibe-dispatch-fix/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-dispatch-fix/SKILL.md)
