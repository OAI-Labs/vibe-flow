# Wave Scheduler

How `vibe-ship` turns an issue tree into execution waves with barriers, and how state is persisted for crash-resume.

## Core principle

**Barrier ≠ serialization.** Within a wave, everything runs parallel. Between waves, we wait for the slowest member to merge (or PR-open, depending on `wave_barrier` config). This maximizes parallelism without letting downstream issues race ahead of their dependencies.

## Algorithm

### 1. Build DAG

Input: list of issues in a project (from `list_issues`), plus relationships (from `list_issues` with `parent_issue_id` filter or dedicated relationships endpoint).

```
nodes = issues
edges = relationship_kind=blocks     # parent blocks child
edges += relationship_kind=depends_on # child depends on parent
```

Validate: no cycles. If cycle detected, abort and report to user.

### 2. Topological sort → levels

```
level[node] = 0 if no incoming edges
            = 1 + max(level[pred] for pred in predecessors)

waves[L] = [node for node in nodes if level[node] == L]
```

Levels become waves. Wave 0 = roots (no blockers). Wave N = issues whose deepest predecessor is in wave N-1.

### 3. Dispatch wave-by-wave

```
for L in 0..max_level:
    parallel_dispatch(waves[L])
    wait_for_barrier(waves[L])
    if any failed:
        run_dispatch_fix_loop(waves[L].failed)
        wait again
    advance to L+1
```

### 4. Wave dispatch sub-steps

For each issue in wave L:
```
1. Triage tier (executor-routing.md algorithm)
2. Allocate executor/variant honoring max_opus_per_wave
3. git pull origin main (at wave start — shared for all issues in wave)
4. For each issue: create branch vk/<id>-<slug>
5. start_workspace(executor, variant, branch, issue_id, prompt+closing-protocol)
6. Record dispatch in state.json
```

## Barrier semantics

### `wave_barrier: merge` (default, strict)

Wave L done when ALL issues have:
- Workspace complete (FINAL REPORT received)
- PR opened (vibe-link)
- Review approved (vibe-review)
- Merged to main (vibe-merge)
- Branch deleted

Then L+1 starts. Safest. Slowest if any PR is slow to review.

### `wave_barrier: pr-open` (fast)

Wave L done when ALL issues have pushed and opened PRs.
L+1 starts with base = origin/main (pre-wave-L).

Risk: if multiple waves are in review simultaneously, late merges may conflict with each other. Use only for independent feature work.

## State persistence

`.vibe-flow/state.json` at repo root:

```json
{
  "run_id": "2026-04-24T10-30-00Z-abc",
  "project_id": "42d306d0-...",
  "started_at": "2026-04-24T10:30:00Z",
  "waves": [
    {
      "level": 0,
      "status": "completed",
      "issues": [
        {
          "issue_id": "91dfb411-...",
          "simple_id": "A20K-1",
          "tier": "T0",
          "executor": "GEMINI",
          "variant": "gemini-3-flash-preview",
          "workspace_id": "936c256d-...",
          "branch": "vk/a20k-1-remove-ai-literacy-column",
          "pr_url": "https://github.com/OAI-Labs/agent-code-review/pull/42",
          "commit_sha": "abc123",
          "status": "merged",
          "merged_at": "2026-04-24T11:15:00Z",
          "cost_estimate_usd": 0.02,
          "escalations": []
        }
      ]
    },
    {
      "level": 1,
      "status": "in_progress",
      "issues": [
        {
          "issue_id": "b8e2...",
          "simple_id": "A20K-5",
          "tier": "T2",
          "executor": "CLAUDE_CODE",
          "variant": "sonnet-4.6-high",
          "workspace_id": "...",
          "branch": "vk/a20k-5-...",
          "pr_url": null,
          "status": "workspace_running"
        }
      ]
    }
  ],
  "cost_total_usd": 0.02,
  "config": { "...snapshot of .vibe-flow.yaml at run start": true }
}
```

### Status values per issue

- `dispatched` — workspace started, no report yet
- `workspace_running` — still running (long task)
- `workspace_complete` — FINAL REPORT received, branch pushed
- `pr_open` — PR created by vibe-link
- `in_review` — vibe-review running
- `review_critical` — review blocked, waiting on fix
- `fix_dispatched` — vibe-dispatch-fix active
- `approved` — review passed
- `conflicts` — rebase needed
- `rebase_running` — vibe-rebase active
- `ready_to_merge` — all gates green
- `merged` — done
- `blocked` — human intervention needed
- `abandoned` — user chose to drop

### Resume protocol

On vibe-flow start:
1. Check for `.vibe-flow/state.json`
2. If exists and `status != completed`:
   - Reconcile each issue's actual state (query MCP + git + gh)
   - Resume from last consistent state
   - Skip already-merged issues

## Concurrency limits

- Max parallel workspaces per wave: `config.max_parallel` (default 5) — to avoid overloading the executor runner and GitHub rate limits
- If wave has more issues than `max_parallel`: dispatch in sub-batches, each batch barriered before next

## Failure handling

### Workspace crash / timeout

- Detected by: no report after `workspace_timeout_minutes` (default 60)
- Action: mark as failed, run `vibe-dispatch-fix` (which may escalate tier)

### MCP connection loss mid-wave

- state.json has enough to resume
- On next run, skip merged issues, reconcile others by PR/branch state

### Partial wave merge

- If 3/5 issues merged and 2 failing review:
  - Barrier waits for the 2 until they merge or are marked `abandoned`
  - User can manually `abandon` via issue tag `abandon`

## Multi-repo handling

If `start_workspace` includes multiple repos:
- Branch name is same across both repos
- Both repos pulled, branched, committed, pushed
- Single PR per repo (linked via issue comment)
- vibe-merge merges both PRs atomically (or reports cross-repo conflict)

## Cost tracking

Per dispatch, estimate via:
- Claude Code: tokens_in * price_in + tokens_out * price_out (read from MCP session metadata if available)
- Gemini: flat per-request
- Codex: per-token

Accumulate in state.json. `vibe-standup` reads aggregate.
