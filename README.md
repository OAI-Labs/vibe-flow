# vibe-flow

Orchestration skills for Vibe Kanban. Turn a spec into merged code using multi-agent waves: **plan → ship → link → review → merge**, with autonomous fix loops.

**Docs:** https://oai-labs.github.io/vibe-flow/

## Install

In Claude Code:

```bash
/plugin marketplace add OAI-Labs/vibe-flow
/plugin install vibe-flow@vibe-flow
```

Then in your repo:

```bash
/vibe-flow:vibe-init
```

Dev install (clone + symlink):

```bash
git clone https://github.com/OAI-Labs/vibe-flow.git
ln -s "$(pwd)/vibe-flow/plugins/vibe-flow" ~/.claude/plugins/vibe-flow
```

Requires the `vibe-kanban` MCP server configured (see [MCP setup](#mcp-setup)).

## Skills

| Skill | Purpose |
|---|---|
| `/vibe-flow:vibe-init` | First-time setup: pick project, write `.vibe-flow.yaml`, scaffold state dir |
| `/vibe-flow:vibe-plan` | Brainstorm a spec → create issue tree (epic + sub-issues + deps) in a project |
| `/vibe-flow:vibe-ship` | Wave-based parallel dispatch with executor routing (T0 flash → T4 opus) |
| `/vibe-flow:vibe-link` | Link GitHub PRs to workspace branches, auto-open PR if missing |
| `/vibe-flow:vibe-review` | Two-stage review (spec → quality) via subagent, post to GitHub PR |
| `/vibe-flow:vibe-merge` | Safe merge: verify tests, rebase, squash merge, archive workspace |
| `/vibe-flow:vibe-dispatch-fix` | Re-dispatch agent to fix review critical / CI failures / conflicts |
| `/vibe-flow:vibe-rebase` | Resolve conflicts against updated main, force-with-lease push |
| `/vibe-flow:vibe-status` | Dashboard of active workspaces + PRs + inconsistencies |
| `/vibe-flow:vibe-standup` | Daily summary (merged / in-review / blocked / in-progress) |
| `/vibe-flow:vibe-flow` | Meta orchestrator running the full loop from spec to merged code |

## Per-project config

Run `/vibe-flow:vibe-init` for guided setup, or create `.vibe-flow.yaml` manually at repo root:

```yaml
project_id: 42d306d0-66a2-4655-9e2b-8c9819f52b94
default_executor: CLAUDE_CODE
default_variant: sonnet-4.6-high

brainstorm:
  default: autonomous
  explorers: 3

wave_barrier: merge
max_opus_per_wave: 2

fallback_chain:
  - opus-4.6
  - sonnet-4.6-high
  - sonnet-4.6-medium

archive:
  delete_branch_after_days: 7

notify:
  slack: ""
  discord: ""

# Map vibe-flow roles → actual board column names. Only set keys whose columns exist.
# statuses:
#   ready_to_merge: "ready_to_merge"
```

### Board columns

vibe-flow assumes standard columns `in_progress` / `in_review` / `done` on your board. Status transitions (on PR open → `in_review`, on rejected review → back to `in_progress`, on merge → `done`) use `update_issue` with the column names as configured in `statuses.*`.

**Optional `ready_to_merge` column:** vibe-kanban MCP does not expose a way to create columns — if you want an approved-but-not-merged column, add it manually in vibe-kanban UI → Project Settings → Statuses, then set its name in `.vibe-flow.yaml` under `statuses.ready_to_merge`. Without it, approved issues stay in `in_review` until merge.

## Complexity tiers

| Tier | Executor | When |
|---|---|---|
| T0 | GEMINI flash | Typo / copy / hide column |
| T1 | CODEX mini / CLAUDE_CODE sonnet-medium | Simple CRUD, <150 LoC |
| T2 | CLAUDE_CODE sonnet-high | Multi-file, moderate |
| T3 | CLAUDE_CODE opus | Architecture / migration |
| T4 | CLAUDE_CODE opus + brainstorm | Research / RFC |

See `references/executor-routing.md`.

## MCP setup

Requires the [vibe-kanban](https://github.com/BloopAI/vibe-kanban) MCP server.

Add to `~/.claude.json` (global) or `.claude/settings.json` (project):

```json
"mcpServers": {
  "vibe_kanban": {
    "command": "npx",
    "args": ["-y", "vibe-kanban@latest", "--mcp"]
  }
}
```

For a self-hosted instance, add `VIBE_BACKEND_URL`:

```json
"mcpServers": {
  "vibe_kanban": {
    "command": "npx",
    "args": ["-y", "vibe-kanban@latest", "--mcp"],
    "env": {
      "VIBE_BACKEND_URL": "http://your-server:PORT"
    }
  }
}
```

Verify the server is connected:

```bash
/mcp
```

## State

`.vibe-flow/state.json` at repo root tracks wave progress, dispatched workspaces, cost. Auto-resume if Claude crashes mid-wave.

## License

MIT
