---
name: vibe-rebase
description: Use when a PR has merge conflicts with main or mergeStateStatus is BEHIND/DIRTY - dispatches an agent to rebase the branch onto latest main, resolve conflicts, re-run tests, and force-with-lease push
---

# vibe-rebase

## Overview

Handle the messy case: main moved forward while PR was in review, now there's a conflict. Dispatch a focused agent to rebase and resolve.

**Core principle:** Always `--force-with-lease`, never `--force`. Tests must pass after rebase.

**Announce at start:** "I'm using the vibe-rebase skill to resolve branch conflicts."

## When to use

- `vibe-merge` Step 1 reports `mergeStateStatus: BEHIND` or `DIRTY`
- `gh pr view` shows `mergeable: CONFLICTING`
- User manually reports a conflict

Do NOT use if:
- PR is already merged
- Conflict is ambiguous and needs design decision (go to user)
- Rebase attempts already >= 2 on this PR (go to user / escalate)

## The process

### Step 1: Preflight

```bash
git fetch origin
gh pr view <PR> --json headRefName,baseRefName,mergeable,mergeStateStatus
```

Confirm:
- `baseRefName` is `main` (or project's base branch)
- `mergeable` is `CONFLICTING` or `MERGEABLE` but behind
- We have write access

Find the head branch commit and count commits ahead:
```bash
BRANCH=<head>
git log --oneline origin/main..origin/$BRANCH | wc -l
```

If the branch has > 5 commits → simple rebase may be messy. Consider merge commit instead (keep history). Rebase still preferred for clean squash merge.

### Step 2: Check conflict complexity

```bash
git checkout origin/$BRANCH
git rebase origin/main --dry-run 2>&1 | grep -c "CONFLICT"
```

If 0 conflicts expected (just "behind") → rebase is trivial, do it in-process:
```bash
git rebase origin/main
git push --force-with-lease origin $BRANCH
```
Skip to Step 5.

If 1-3 conflicts in isolated files → dispatch T1 agent.
If 4+ conflicts OR conflicts in core logic → dispatch T2 or T3 agent.

### Step 3: Dispatch rebase agent

Use `references/prompt-templates.md` section 6 (rebase prompt). Fill:
- `{{BRANCH_NAME}}`

Pass additional context:
- The original issue (so the agent knows the feature's intent)
- List of conflicted files (from `git status` preview)
- Whether tests are present (so agent knows to run them)

MCP `start_workspace`:
```
name = <branch>-rebase-<N>
executor = CLAUDE_CODE
variant = sonnet-4.6-high  # default for rebase; use opus if complex
repositories = [{repo_id, branch: <same branch>}]
issue_id = <same issue>
prompt = <rebase prompt>
```

### Step 4: Wait and verify

Agent reports one of:
- `status: complete` + tests green + force-with-lease pushed
- `status: blocked` + reason (e.g., "semantic conflict needs human decision")

If `blocked`:
- Post issue comment with the specific conflict + agent's question
- Notify user
- Mark issue `blocked`

If `complete`:
- Verify push landed:
  ```bash
  git fetch origin
  git rev-parse origin/<BRANCH>
  # should match the new HEAD_SHA
  ```
- Verify branch is now ahead of main cleanly:
  ```bash
  git log --oneline origin/main..origin/<BRANCH>
  ```

### Step 5: Re-check PR state

```bash
gh pr view <PR> --json mergeable,mergeStateStatus
```

Should now be `MERGEABLE` + `CLEAN` (or `UNSTABLE` if CI still running).

If still `CONFLICTING` → agent didn't actually resolve. Dispatch at higher tier once, then block.

### Step 6: Re-trigger review (lightweight)

The rebase changed commits — original review is on an older SHA. Recommended:
- Dispatch a LIGHTWEIGHT re-review: "Verify the rebase didn't change intent or introduce bugs"
- Reviewer only looks at rebase-introduced diff (merge-base changes)
- If clean → proceed to `vibe-merge`
- If rebase changed behavior unexpectedly → treat like any review failure

Optional: Skip re-review if rebase was trivial (no conflicts, just fast-forward catch-up) AND `config.skip_rebase_review: true`.

### Step 7: Proceed to merge

Invoke `vibe-flow:vibe-merge` to finish.

## Rebase vs merge commit

Default: **rebase** (clean history for squash merge).

Exception: if conflicts span many commits and rebase would be painful, allow merge commit from `main` into branch:
```bash
git checkout $BRANCH
git merge origin/main
# resolve conflicts
git push origin $BRANCH   # normal push, no force needed
```

Merge commit is OK because PR uses `--squash` merge anyway — history gets flattened.

Configure via `config.rebase_strategy: rebase | merge-commit` (default `rebase`).

## Force-with-lease safety

Always use `--force-with-lease`, which refuses if someone else pushed to the branch since you fetched. Never `--force`.

If `--force-with-lease` fails:
- Someone else pushed (maybe a human collaborator, maybe another agent)
- Fetch, inspect, DO NOT overwrite
- Alert user

## Escalation

- Rebase attempt 1 fails → retry once with T2 agent
- Rebase attempt 2 fails → mark `blocked`, human intervention

Log each rebase attempt in state.json:
```json
{
  "rebase_attempts": [
    {
      "attempt_num": 1,
      "agent_tier": "T1",
      "result": "failed",
      "reason": "semantic conflict in auth.ts"
    }
  ]
}
```

## Output

```
Rebase complete for PR #<N>:
  Branch: <BRANCH> (was <OLD_SHA>, now <NEW_SHA>)
  Tests: pass
  Mergeable: CLEAN
  Re-review: <pending|skipped>
```

## Sub-skills

- Dispatches a rebase-specific agent via MCP `start_workspace`
- May invoke `vibe-flow:vibe-review` (lightweight) after rebase
- Passes to `vibe-flow:vibe-merge` on success

## Remember

- `--force-with-lease` only
- Tests MUST pass after rebase
- If conflict is semantic (not textual) → block and ask human
- Re-review after rebase (unless trivial)
- Max 2 rebase attempts
