---
name: vibe-init
description: Use on first-time setup in a new repo - picks the vibe-kanban project via MCP, writes a minimal .vibe-flow.yaml, creates the .vibe-flow/state.json skeleton, and adds the state dir to .gitignore. Idempotent.
---

# vibe-init

## Overview

One-shot setup for a repo that will use vibe-flow. Replaces the manual "copy `.vibe-flow.example.yaml`, hunt for project_id, create state dir" dance. Asks only what's needed — nothing else.

**Core principle:** One required answer (which project). Everything else has defaults.

**Announce at start:** "I'm using the vibe-init skill to set up vibe-flow for this repo."

## When to use

- User says "set up vibe-flow", "init vibe-flow", or runs `/vibe-flow:vibe-init`
- First time using vibe-flow in a repo (no `.vibe-flow.yaml` present)
- User wants to reconfigure (re-run to re-pick project / edit defaults)

Do NOT use if:
- `.vibe-flow.yaml` already exists AND user hasn't asked to reconfigure — skip with a note
- Not inside a git repo — bail and ask user to `git init` first
- `vibe-kanban` MCP not connected — bail and point at README "MCP setup"

## The process

### Step 1: Preflight

```bash
# Must be in a git repo
git rev-parse --show-toplevel
```

Verify MCP:
- Call `list_organizations`. If it errors → stop, tell user MCP isn't reachable, point to README.

Check idempotency:
- If `.vibe-flow.yaml` exists → ASK: "Config already present. Reconfigure, show current, or cancel?"
- If cancel → exit cleanly.

### Step 2: Ask the minimum

**Q1 (required): Project.**
Call `list_projects`. Show a numbered list of `name — project_id`. User picks one.

Do NOT ask the user to paste an ID. Always offer selection.

**Q2 (optional, one prompt): Concurrency + budget.**
Offer defaults inline; accept Enter to keep them:
```
max_parallel [5]:
cost_budget_usd [50]:
wave_barrier [merge / pr-open] (default: merge):
```

**Q3 (optional): Notifications.**
```
Slack webhook (Enter to skip):
Discord webhook (Enter to skip):
```

**Q4 (optional): `ready_to_merge` column.**

vibe-kanban ships with `todo / in_progress / in_review / done` by default but projects can add custom columns. MCP does NOT expose a way to create columns — if the user wants this one, they must add it themselves in vibe-kanban UI → Project Settings → Statuses first.

```
Does your board have a dedicated "ready to merge" column? [y/N]
```

- `N` (default) → leave `statuses.ready_to_merge` unset. `vibe-review` will keep approved issues in `in_review`.
- `y` → prompt for the exact column name as it appears on the board:
  ```
  Column name (e.g. 'ready_to_merge', 'Ready to Merge'):
  ```
  Remind the user: "Add this column in vibe-kanban UI before continuing if it doesn't exist yet."

  Best-effort verify with `list_issues(project_id=<picked>, status=<name>, limit=1)`:
  - If MCP returns without error → assume valid, save to `statuses.ready_to_merge`.
  - If MCP errors on unknown status → ask again or let user accept anyway (will fail at runtime in `vibe-review` with a warning, non-fatal).

That's it. Don't ask about fallback chains, archive policy, tier overrides — those live in `.vibe-flow.example.yaml` for users who want to tune them later.

### Step 3: Write config

Write `.vibe-flow.yaml` at repo root with ONLY the answered fields plus a header comment:

```yaml
# vibe-flow config. See .vibe-flow.example.yaml for all options and defaults.
project_id: <picked>
max_parallel: <answer or default>
cost_budget_usd: <answer or default>
wave_barrier: <answer or default>

# notify:
#   slack: "<answer>"
#   discord: "<answer>"

# statuses:
#   ready_to_merge: "<answer if Q4 = y>"
```

If Q4 answered `y`, emit the `statuses.ready_to_merge` key (uncommented). Otherwise leave the whole `statuses` block as a comment for user reference.

Only emit keys the user actually set (or accepted non-empty defaults for). Keep the file small — unset fields fall back to defaults at runtime.

### Step 4: Create state scaffold

```bash
mkdir -p .vibe-flow/runs
```

Write `.vibe-flow/state.json`:
```json
{
  "version": 1,
  "project_id": "<picked>",
  "runs": []
}
```

### Step 5: .gitignore

Ask: "Add `.vibe-flow/` to .gitignore? State may contain PR URLs and workspace IDs. [Y/n]"

- If Y (or default): append `.vibe-flow/` to `.gitignore` (create the file if missing). Skip if already ignored.
- If n: do nothing — user may want to commit state for team visibility.

Do NOT ignore `.vibe-flow.yaml` itself — that's intended to be committed.

### Step 6: Verify

```bash
test -f .vibe-flow.yaml && test -f .vibe-flow/state.json
```

Print a one-block summary (see Output).

## Idempotency

Running `vibe-init` twice is safe:
- Step 1 detects existing config and asks before overwriting
- Step 4 does not wipe `state.json` if it exists and is non-empty — merge `project_id` only if changed
- Step 5 checks `.gitignore` for an existing entry before appending

## Failure modes

| Failure | Handling |
|---|---|
| Not in git repo | Stop, tell user to `git init` |
| MCP not connected | Stop, point at README MCP setup |
| `list_projects` returns empty | Tell user to create a project in vibe-kanban first |
| User cancels at any prompt | Exit without writing anything |
| Write permission denied | Report path, exit |

## Output

```
vibe-flow initialized.
  Project:      <name> (<project_id>)
  Config:       .vibe-flow.yaml
  State:        .vibe-flow/state.json
  Gitignored:   yes | no
Next: run /vibe-flow:vibe-plan <spec> to start.
```

## Remember

- One required question (project). Everything else defaults.
- Never ask user to paste a project_id — always pick from `list_projects`.
- Idempotent: re-running doesn't clobber existing state.
- Don't bloat `.vibe-flow.yaml` with defaulted fields — keep it minimal, reference the example file.
