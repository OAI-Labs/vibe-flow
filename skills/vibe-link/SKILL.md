---
name: vibe-link
description: Use when a workspace finished and pushed a branch - finds or creates the corresponding GitHub PR, links it back to the vibe-kanban issue, and syncs PR status to the UI
---

# vibe-link

## Overview

Bridge between vibe-kanban workspace output (a pushed branch) and GitHub pull requests. Ensures every completed workspace has a tracked PR, and the issue comments reference it.

**Core principle:** One workspace → one branch → one PR → one issue. Keep the graph tight.

**Announce at start:** "I'm using the vibe-link skill to link PR to workspace."

## When to use

- A workspace just reported `status: complete` with a branch pushed
- User explicitly invokes `/vibe-flow:vibe-link <workspace_id>`
- Auto-triggered by `vibe-ship` after each workspace completes

Do NOT use if:
- Workspace is still running (wait for FINAL REPORT)
- Workspace reported `status: blocked` (no branch pushed)
- Branch already has a PR that's linked in issue comments (idempotent skip)

## Required context

- `workspace_id` from vibe-kanban
- Repo path on disk (to run `gh` commands)
- `gh` CLI authenticated with repo access

## The process

### Step 1: Fetch workspace info

Call MCP `get_execution` or `list_sessions` for the workspace. Extract:
- `branch` (from FINAL REPORT or workspace metadata)
- `issue_id` (from workspace link)
- `commit_sha` (from FINAL REPORT)

Verify branch exists on origin:
```bash
git fetch origin
git ls-remote --heads origin <BRANCH_NAME>
```

If branch not on origin → STOP, workspace didn't actually push. Mark issue state: `push_missing`, alert user.

### Step 2: Check for existing PR

```bash
gh pr list --head <BRANCH_NAME> --json number,url,state,headRefOid
```

Cases:
- **PR exists and open**: proceed to Step 4 (update linkage)
- **PR exists but closed/merged**: report to user, likely re-use of stale branch. Stop.
- **No PR**: proceed to Step 3

### Step 3: Create PR

Fetch issue details via MCP `get_issue`:
```bash
gh pr create \
  --head <BRANCH_NAME> \
  --base main \
  --title "<issue_title> (vk #<SIMPLE_ID>)" \
  --body "$(cat <<EOF
## Summary

<from issue description, first paragraph>

## Changes

<bullet list from workspace FINAL REPORT files_changed>

## Linked issue

vibe-kanban: <ISSUE_URL> (simple_id: <SIMPLE_ID>)

## Test plan

- [ ] CI passes
- [ ] Manual verification by reviewer
EOF
)"
```

Capture the PR URL from output.

### Step 4: Link PR ↔ issue

**A. Update vibe-kanban issue:**

Add comment via MCP (note: check current MCP tools; if no `create_comment`, embed in issue description):
```
[vibe-flow] PR opened: <PR_URL>
Branch: <BRANCH_NAME>
Commit: <SHA>
```

Use `update_issue` to append PR URL to description if no comment API.

**B. Update PR body with back-link:**

Already included in Step 3 body — no-op if PR was pre-existing and already linked.

If PR was pre-existing without link, update body:
```bash
gh pr edit <PR_NUMBER> --body "$(cat <<EOF
<existing body>

---
vibe-kanban issue: <ISSUE_URL> (simple_id: <SIMPLE_ID>)
EOF
)"
```

### Step 5: Update state.json

```json
{
  "issues": [{
    "issue_id": "...",
    "pr_url": "<PR_URL>",
    "pr_number": <N>,
    "status": "pr_open",
    "linked_at": "<ISO timestamp>"
  }]
}
```

## CI wait (optional but recommended)

After linking, optionally wait for initial CI status:
```bash
gh pr checks <PR_NUMBER> --watch --fail-fast
```

If CI fails on first run → mark issue `ci_failed`, trigger `vibe-dispatch-fix` with CI logs as context.
If CI passes → issue ready for `vibe-review`.

Skip this step if user has `config.skip_ci_wait: true`.

## Auto PR body generation

Parse workspace FINAL REPORT or `git diff --stat origin/main...<BRANCH>`:

```markdown
## Summary
<issue description first paragraph — 2-3 sentences>

## Changes
- `<file1>`: <inferred purpose from path>
- `<file2>`: <inferred purpose from path>

## Test plan
- [ ] CI passes
- [ ] <any acceptance criteria from issue>

---
vibe-kanban: <ISSUE_URL>
Workspace: <WORKSPACE_ID>
Closes #<github-issue-if-linked>
```

Keep it minimal — reviewer will read diff, not PR body prose.

## Multi-repo issues

If the workspace touches multiple repos:
1. For each repo, check branch + PR independently
2. Create PR per repo
3. Cross-link PRs in each PR body:
   ```
   Related PRs:
   - agent-code-review: <PR_URL_1>
   - discord-agent-vbi: <PR_URL_2>
   ```
4. Comment on issue with ALL PR URLs

`vibe-merge` must later merge all PRs atomically.

## Idempotency

Running `vibe-link` twice on same workspace should:
- Not create duplicate PRs (Step 2 check)
- Not duplicate issue comments (check existing comments for `[vibe-flow] PR opened:` marker)
- Re-sync state.json if PR state changed

## Failure modes

| Failure | Handling |
|---|---|
| Branch not pushed | Mark issue `push_missing`, alert user |
| PR already closed on stale branch | Stop, escalate to user |
| `gh` not authenticated | Instruct user to run `gh auth login` |
| Rate limit hit | Sleep 60s, retry once; if still fails, mark `link_failed` |
| Issue has no associated repo | Prompt user to pick repo from issue metadata |

## Verification

Before claiming success:
```bash
gh pr view <PR_NUMBER> --json number,url,state
```

Confirm `state: OPEN`, then record.

## Output

```
PR linked for issue <SIMPLE_ID>:
  Branch: <BRANCH_NAME>
  PR: <PR_URL>
  CI: <pending|passing|failing>
```

## Sub-skills

- Optionally invokes `vibe-flow:vibe-dispatch-fix` on first CI failure
- Passes control to `vibe-flow:vibe-review` on CI green (if called from `vibe-ship`)

## Remember

- One workspace = one PR; avoid duplicates
- Update state.json after every operation
- Don't wait for CI if `skip_ci_wait: true`
- Cross-link on multi-repo
