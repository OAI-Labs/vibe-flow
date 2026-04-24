---
id: state
title: State & persistence
---

# State & persistence

vibe-flow persists state so runs survive crashes, context compression, and
session restarts.

## `.vibe-flow.yaml`

Per-repo config, committed to the repo. Controls project_id, concurrency,
budget, status mapping, notifications. See
[`.vibe-flow.example.yaml`](https://github.com/OAI-Labs/vibe-flow/blob/main/.vibe-flow.example.yaml)
for all fields.

## `.vibe-flow/state.json`

Live run state, usually **gitignored** (may contain PR URLs, workspace IDs,
cost totals). Shape:

```json
{
  "version": 1,
  "project_id": "<uuid>",
  "runs": [
    {
      "run_id": "r-2026-04-24-1",
      "started_at": "2026-04-24T09:12:00Z",
      "spec": "...",
      "issues": [
        {
          "issue_id": "<uuid>",
          "simple_id": "ISSUE-42",
          "status": "pr_open | approved | review_critical | merged",
          "pr_url": "...",
          "workspace_id": "<uuid>",
          "tier": "T2",
          "cost_usd": 0.34
        }
      ]
    }
  ]
}
```

Every transition (dispatch, link, review, merge) writes a fresh snapshot before
claiming the step succeeded.

## `.vibe-flow/runs/<run-id>.log`

Optional streaming log per run. Useful for debugging long runs.

## Resume

If a run is interrupted, `/vibe-flow:vibe-flow resume` picks up where it left
off — reading state.json, re-verifying each in-flight issue against reality
(PR still open? CI still green?), and continuing.

## Two sources of truth

vibe-kanban board status and `state.json` must agree. The skills always write
to both atomically:

- `vibe-link` → issue `in_review` + state `pr_open`
- `vibe-review` approve → state `approved` (board stays `in_review`)
- `vibe-merge` → board `done` + state `merged`

If they disagree, `vibe-status` flags the inconsistency.
