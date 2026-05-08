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
3. (Once per wave, before any dispatch) git fetch origin && git pull origin main
   then BASE_SHA = git rev-parse origin/main → save to state.json as waves[L].base_sha
   (audit metadata only — see note below)
4. start_workspace(executor, variant, branch="main", name="<issue-id> <slug>", issue_id,
                   prompt = opening-protocol + issue_description + closing-protocol)
5. Read actual feature branch from workspace response → save to state.json
6. Record dispatch in state.json
```

**Why does the workspace get fresh code?** The vibe-kanban API rejects raw SHAs in `repositories[].branch` (only branch names are accepted). Switching the branch arg from `"main"` to `"origin/main"` does not help either — both are local refs that go stale until the server runs `git fetch`. The MCP server may hand the workspace a cached or pre-staged clone of `main` whose HEAD predates Wave-(L-1)'s merges. The Opening protocol prepended to every workspace prompt (`prompt-templates.md` §0) is what actually defeats this — the agent's mandated first action is `git fetch origin && git checkout main && git pull --ff-only origin main && git checkout -b {{BRANCH_NAME}}`, forcing a real fetch from `origin` inside the workspace before any task work. `waves[L].base_sha` in state.json is recorded as audit metadata so you can post-hoc verify what HEAD the wave was dispatched against, but it is not used by the API layer.

## Barrier semantics

### `wave_barrier: merge` (default, strict)

Wave L done when ALL issues have:
- Workspace finished (`get_execution.is_finished == true`)
- PR opened (vibe-link)
- Review approved (vibe-review)
- Merged to main (vibe-merge)
- Branch deleted

Then L+1 starts. Safest. Slowest if any PR is slow to review.

### `wave_barrier: pr-open` (fast — UNSAFE FOR SHARED FILES)

Wave L done when ALL issues have pushed and opened PRs (no merge required).
L+1 dispatches with `base_sha = origin/main` **as it stood before Wave L
merged** — by definition, since Wave L hasn't merged yet.

**The Opening protocol cannot help here.** The Opening protocol pulls the
latest `origin/main` — but with `pr-open`, Wave L's PRs are still open, so
`origin/main` legitimately does not yet contain Wave L's commits. Any
Wave L+1 task that touches a file Wave L also touches will either:
- conflict at merge time, OR
- silently re-implement work Wave L already did (depending on overlap shape).

**Use `pr-open` only when waves are guaranteed to touch disjoint files** —
e.g., independent feature work in separate modules, or each wave operating
on its own repo in a multi-repo setup. For any plan with even partial file
overlap between waves, stick with the default `wave_barrier: merge`.

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
      "base_sha": "abc123...",
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
      "base_sha": "def456...",
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

- `dispatched` — workspace started, `is_finished == false`
- `workspace_running` — still running (long task), `is_finished == false`
- `workspace_complete` — `is_finished == true` (status: completed) and branch pushed to origin
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
   - **Before re-dispatching any issue in a partially-completed wave L**, re-run
     pre-wave sync (`git fetch origin && git pull origin main`), recompute
     `BASE_SHA = git rev-parse origin/main`, and **overwrite** `waves[L].base_sha`
     in state.json with the fresh value. The audit field needs to reflect the
     actual base each re-dispatched workspace will see — and the workspace's
     own Opening protocol will then `git pull --ff-only origin main` to that
     same HEAD (or newer, if more merges landed during the outage).

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
