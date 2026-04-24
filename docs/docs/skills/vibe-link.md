---
id: vibe-link
title: vibe-link
---

# vibe-link

Bridges a finished workspace (branch pushed) to GitHub. Finds or creates the
PR, links it back to the vibe-kanban issue, and moves the issue to
`in_review` on the board.

## Invoke

```
/vibe-flow:vibe-link <workspace_id>
```

Usually auto-invoked by vibe-ship after each workspace reports complete.

## What it does

1. Verifies branch exists on `origin`
2. Checks for existing PR via `gh pr list --head <branch>`
3. Creates PR if needed (title, body from issue + FINAL REPORT)
4. **Moves issue to `in_review`** (resolves name from
   `.vibe-flow.yaml → statuses.in_review`)
5. Appends PR URL to issue comments / description
6. Updates `state.json` with `pr_url`, `pr_number`, `status: pr_open`

## Optional CI wait

If `skip_ci_wait: false`, watches the first CI run and routes to
`vibe-dispatch-fix` if it fails.

## Idempotent

Running twice won&rsquo;t duplicate PRs or comments. Looks for existing
`[vibe-flow] PR opened:` markers.

## Full reference

[skills/vibe-link/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-link/SKILL.md)
