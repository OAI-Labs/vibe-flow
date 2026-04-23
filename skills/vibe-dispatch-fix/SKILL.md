---
name: vibe-dispatch-fix
description: Use when a PR failed review or CI - re-dispatches a workspace to fix the critical/important review items or CI failures, with tier escalation if the previous agent couldn't solve it
---

# vibe-dispatch-fix

## Overview

Close the review-fix loop. Re-dispatch an agent (same or escalated tier) to fix review feedback or CI failures on the same branch.

**Core principle:** Failed once → maybe retry same tier. Failed twice → escalate. Failed thrice → ask human.

**Announce at start:** "I'm using the vibe-dispatch-fix skill to re-dispatch fixes."

## When to use

- Review returned `request-changes` or `reject`
- CI failed after PR opened
- User manually invokes with feedback

Do NOT use if:
- Original review has only `minor` items (merge and file follow-up instead)
- Issue is `blocked` waiting on human decision
- > 3 escalations already recorded (go to `blocked`)

## The process

### Step 1: Diagnose

Fetch:
- Review feedback (`<VIBE-REVIEW>` block) from state.json or GitHub PR reviews
- CI logs (if CI failed): `gh run view <RUN_ID> --log-failed`
- Current tier of the issue (from state.json)

Classify failure:
| Type | Signal |
|---|---|
| Spec gap | Review `spec_compliance: fail` |
| Correctness bug | Critical items reference logic errors |
| Missing tests | Critical items reference missing tests |
| Style/hygiene only | Only minor + important (→ don't re-dispatch, just merge) |
| CI infra failure | CI red but not due to code (flaky test, env) |

### Step 2: Decide strategy

```
If style/hygiene only → RETURN without dispatching
If CI infra failure → retry CI once (`gh run rerun <ID>`), if still red → treat as code issue
If tier < T3 AND (correctness or spec gap) → escalate tier +1
If tier == T3 AND second failure → try T3 + interactive brainstorm
If tier == T4 AND failure → ask user
If spec gap severe → create sub-issue for clarification, block parent
```

### Step 3: Check escalation count

```
From state.json, count escalations for this issue.
If count >= 3 → mark blocked, STOP.
Else → proceed.
```

### Step 4: Build fix prompt

Use `references/prompt-templates.md` section 7 (fix dispatch prompt). Fill:
- `{{ISSUE_SIMPLE_ID}}`
- `{{REVIEW_CRITICAL}}` — verbatim critical items
- `{{REVIEW_IMPORTANT}}` — verbatim important items  
- `{{BRANCH_NAME}}` — same branch (continuation)
- `{{PR_URL}}`

**Important:** The prompt explicitly says:
- Only fix critical + important
- Do NOT rewrite whole PR
- Do NOT change issue scope
- If disagreeing with critical → respond with reasoning

Append closing protocol (push same branch, no force needed — just add commit).

### Step 5: Dispatch

Determine executor:
- Same tier if first escalation OR "important only" issues
- Next tier up if second escalation OR critical correctness issues
- `CLAUDE_CODE opus-4.6 + brainstorm` if T3 second failure

Call MCP `start_workspace`:
```
name = <BRANCH>-fix-<N>   # N = escalation count
executor = <new_tier.executor>
variant = <new_tier.variant>
repositories = [{repo_id, branch: <same branch>}]  # continuation
issue_id = <same issue>
prompt = <built fix prompt>
```

Record in state.json:
```json
{
  "issue_id": "...",
  "escalations": [
    {
      "from_tier": "T2",
      "to_tier": "T3",
      "reason": "review critical: 3 correctness items",
      "workspace_id": "...",
      "dispatched_at": "<ISO>"
    }
  ],
  "status": "fix_dispatched"
}
```

### Step 6: Wait for fix and re-gate

After fix workspace reports complete:
1. New commit pushed to same branch
2. CI re-runs automatically on push
3. Wait for CI green
4. Re-run `vibe-flow:vibe-review` (fresh subagent, same PR, new HEAD SHA)
5. If approved → `vibe-flow:vibe-merge`
6. If still critical → back to Step 1 (another escalation)

## Escalation chain ceiling

After 3 escalations on same issue:
- Mark `blocked`
- Post comment on issue:
  ```
  [vibe-flow] Escalation limit reached (3 attempts).
  Current tier: <T>
  Last failure: <summary>
  Requires human intervention.
  ```
- Notify via configured channel (Slack/Discord)
- Do NOT dispatch again until user interacts

## Interactive brainstorm for hard cases

When T3 fails twice with correctness bugs:
1. Dispatch 2-3 `vibe-explorer` subagents (parallel, different lenses) on the failing piece
2. Explorers produce approach docs
3. `vibe-flow:vibe-plan` coordinator picks winning approach
4. Dispatch T3 implementer with approach doc + fix context
5. If still fails → `blocked`

## Scope discipline

CRITICAL: The fix prompt must NOT:
- Expand scope beyond original issue + review feedback
- Refactor unrelated code
- "Improve" things not mentioned

If the fix agent expands scope:
- Reviewer will flag `scope drift` on next review
- Revert and re-dispatch with tighter prompt

## Output

```
Fix dispatched for issue <SIMPLE_ID>
  Previous tier: <T>, New tier: <T'>
  Escalation #<N>
  Workspace: <ID>
  Awaiting: commit push + CI re-run + re-review
```

## Sub-skills

- May invoke `vibe-flow:vibe-plan` (brainstorm coordinator) for T3 hard cases
- Dispatches fresh `vibe-flow:vibe-explorer` agents for brainstorm
- Passes to `vibe-flow:vibe-review` after fix pushed

## Remember

- Same branch, add commit (no new PR)
- Escalate tier, don't keep hammering with same model
- Hard limit: 3 escalations → blocked
- Keep scope tight — fix only what review flagged
