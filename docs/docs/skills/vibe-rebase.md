---
id: vibe-rebase
title: vibe-rebase
---

# vibe-rebase

Resolves conflicts when a PR falls behind `main`. Tries automatic rebase first;
if there are semantic conflicts, dispatches a subagent with the conflict
context. Force-pushes with `--force-with-lease`.

## Invoke

```
/vibe-flow:vibe-rebase <PR_NUMBER>
```

Auto-triggered by `vibe-merge` when `mergeStateStatus: BEHIND` or `DIRTY`.

## Flow

1. `git fetch origin` → try `git rebase origin/main`
2. If clean → `git push --force-with-lease`
3. If conflicts → dispatch subagent with file list + both sides of each hunk
4. Subagent resolves, pushes, reports
5. Re-verify mergeable state post-push

## Safety

- Never `--force` (uses `--force-with-lease`)
- Max 2 rebase attempts per PR; then → `blocked`, human notified
- Won&rsquo;t touch main, won&rsquo;t rebase other people&rsquo;s branches

## Full reference

[skills/vibe-rebase/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-rebase/SKILL.md)
