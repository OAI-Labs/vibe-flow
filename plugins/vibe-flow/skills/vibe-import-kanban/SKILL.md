---
name: vibe-import-kanban
description: Use when you want to ship existing vibe-kanban issues locally with vibe-ship-fast - pulls issues from a vibe-kanban project via MCP and writes them to .vibe-flow/plan-local.json with kanban_id/simple_id preserved, so vibe-export-kanban can sync results back after merge
---

# vibe-import-kanban

## Overview

One-way snapshot from vibe-kanban to a local plan file. Does not modify kanban state. The resulting `plan-local.json` is the input for `vibe-ship-fast`; the preserved `kanban_id` / `simple_id` per issue let `vibe-export-kanban` post the merge result back to the right issue after the final PR lands.

**Core principle:** Snapshot, don't subscribe. No polling, no two-way sync, no live updates. If kanban changes mid-flight, the local plan is stale by design — re-import if you need to.

**Announce at start:** "I'm using the vibe-import-kanban skill to snapshot issues."

## When to use

- Issues already exist in vibe-kanban (created by you, a teammate, or `vibe-plan` without `--local`)
- You want `vibe-ship-fast`'s local workflow (one PR at the end) but still want the kanban board to reflect "done" later
- Solo run on a shared project

Do NOT use if:
- Issues don't exist yet → `vibe-plan --local` (skip kanban entirely)
- You want per-issue PRs and per-PR review on GitHub → `vibe-ship` (no import needed)
- A `.vibe-flow/plan-local.json` from this run already exists → either resume `vibe-ship-fast` or delete the file first

## The process

### Step 1: Resolve scope

Read `.vibe-flow.yaml` for `project_id`. If `$ARGUMENTS` overrides, use that.

Ask the user (or take from `$ARGUMENTS`) which subset:
- All open issues in the project
- Issues with a specific tag (e.g., `sprint:q2`)
- A parent issue's sub-tree
- Explicit list of `simple_id`s

### Step 2: Pull from kanban

Use MCP:
1. `list_issues(project_id, status_filter, tag_filter)` for the candidate set
2. For each candidate: `get_issue(issue_id)` for the full description and tags
3. `list_issue_relationships(issue_id)` to capture `blocks` / `blocked_by` edges

Do NOT issue any write call. This skill is read-only against kanban.

### Step 3: Map to local schema

For each kanban issue, build:

```json
{
  "id": "L<n>",
  "title": "<kanban title>",
  "description": "<kanban description, verbatim>",
  "tier": "<read from tag tier:t0..t4, fallback T2>",
  "depends_on": ["L<m>", "..."],
  "tags": ["<kanban tags except tier:* and the internal vibe-flow ones>"],
  "brainstorm": "<from tag brainstorm:interactive|autonomous, else null>",
  "files_hint": [],
  "kanban_id": "<issue_id>",
  "simple_id": "<simple_id>"
}
```

Rules:
- Assign `L<n>` IDs by topological order (parents first). The mapping `kanban_id → L<n>` is built first, then `depends_on` is rewritten from kanban IDs to local IDs.
- If a referenced parent is outside the imported scope → drop the edge AND surface a warning at the end (`"L3 depended on KAN-87 which was not in scope; treated as no-dep"`).
- Preserve the kanban description verbatim — do not re-format. `vibe-ship-fast` injects its own preamble before dispatching.

### Step 4: Compute waves

Run the same topological layering as `references/wave-scheduler.md` (or call `vibe-plan`'s helper if extracted) over `depends_on`. Embed `waves` in the output.

### Step 5: Write plan-local.json

Path: `.vibe-flow/plan-local.json`

```json
{
  "spec_title": "Imported from <project_name> (<N> issues)",
  "created_at": "<ISO-8601 UTC>",
  "project_id": "<kanban project_id>",
  "source": "vibe-import-kanban",
  "mode": "local",
  "issues": [ /* ... */ ],
  "waves": [ /* ... */ ]
}
```

Pretty-print with 2-space indent. If the file already exists:
- Ask the user: overwrite / abort. Never silently overwrite — local plan may have in-progress state.

### Step 6: Output summary

```
Imported <N> issues from project <name>.
  Source: vibe-kanban project <project_id>
  Waves: <M>
  Out-of-scope deps dropped: <K>

File: .vibe-flow/plan-local.json
Next: /vibe-flow:vibe-ship-fast to dispatch.
       /vibe-flow:vibe-export-kanban after the final PR merges (to sync results back).
```

## Idempotency

This skill is read-only against kanban, so re-running is safe for the kanban side. On the local side, re-running asks for confirmation before overwriting `plan-local.json`.

## When to stop and ask

- Imported set has a cycle (kanban allows it via two `blocks` edges in opposite directions) → surface to user, refuse to write
- `.vibe-flow/plan-local.json` exists and looks like an in-progress run (state file `state-local.json` also present with `status != completed`) → STOP, ask
- `project_id` missing in config AND not in `$ARGUMENTS`

## Remember

- Read-only against kanban — never write here
- Preserve `kanban_id` / `simple_id` on every issue — `vibe-export-kanban` depends on this
- Snapshot semantics — if kanban changes after import, the local plan does not
