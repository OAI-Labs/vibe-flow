---
id: vibe-merge
title: vibe-merge
---

# vibe-merge

Final gate before code lands on main. Verifies every condition fresh, then
squash-merges via `gh pr merge --squash`.

## Invoke

```
/vibe-flow:vibe-merge <PR_NUMBER>
```

## The iron law

Never merge without fresh verification. Three gates, all required:

1. **CI green** — `gh pr checks`, all SUCCESS or NEUTRAL
2. **Review approved** — `gh pr view` reviewDecision is APPROVED
3. **Mergeable + up-to-date** — mergeStateStatus is CLEAN or UNSTABLE, not
   BEHIND/BLOCKED/DIRTY

Any fail → stop, route:

- CI red → `vibe-dispatch-fix`
- Behind main → `vibe-rebase`
- Review not approved → escalate to human

## After merge

- Update vibe-kanban issue to `done`
- Write `state.json` with `status: merged`, `merge_sha`, `merged_at`
- Archive workspace (MCP)
- Schedule branch deletion per `archive.delete_branch_after_days`

## Hotfix bypass

Issues tagged `hotfix` with ≥ 2 human approvals skip the review gate but still
require CI green. An async `vibe-review` runs post-merge for audit.

## Multi-repo atomicity

If an issue spans PRs on multiple repos, vibe-merge gates all of them before
merging any. Merges in dependency order; alerts if the second fails after the
first succeeds.

## Full reference

[skills/vibe-merge/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-merge/SKILL.md)
