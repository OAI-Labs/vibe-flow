---
id: installation
title: Installation
sidebar_position: 2
---

# Installation

## 1. Install the plugin

In Claude Code:

```bash
/plugin marketplace add OAI-Labs/vibe-flow
/plugin install vibe-flow@vibe-flow
```

Or clone and symlink for dev mode:

```bash
git clone https://github.com/OAI-Labs/vibe-flow.git
ln -s "$(pwd)/vibe-flow/plugins/vibe-flow" ~/.claude/plugins/vibe-flow
```

## 2. Wire up the vibe-kanban MCP server

vibe-flow depends on the [vibe-kanban](https://github.com/BloopAI/vibe-kanban) MCP server.

Add to `~/.claude.json` (global) or `.claude/settings.json` (project):

```json
{
  "mcpServers": {
    "vibe_kanban": {
      "command": "npx",
      "args": ["-y", "vibe-kanban@latest", "--mcp"]
    }
  }
}
```

For a self-hosted instance, point the MCP binary at your backend with `VIBE_BACKEND_URL`:

```json
{
  "mcpServers": {
    "vibe_kanban": {
      "command": "npx",
      "args": ["-y", "vibe-kanban@latest", "--mcp"],
      "env": {
        "VIBE_BACKEND_URL": "http://your-server:PORT"
      }
    }
  }
}
```

Verify: run `/mcp` in Claude Code and confirm `vibe_kanban` shows as connected.

## 3. Run `vibe-init` in your repo

```
/vibe-flow:vibe-init
```

This asks you 3–4 quick questions:

1. **Project** — picks from `list_projects` on vibe-kanban. No pasting UUIDs.
2. **Concurrency + budget** — `max_parallel`, `cost_budget_usd`, wave barrier
   strategy. Defaults work for most teams.
3. **Notifications** (optional) — Slack/Discord webhook for standups.
4. **`ready_to_merge` column** (optional) — if your board has a dedicated
   approved-but-not-merged column, its name goes in `statuses.ready_to_merge`.

Outputs:

- `.vibe-flow.yaml` — per-repo config (commit this)
- `.vibe-flow/state.json` — run state (consider gitignoring)

## 4. First run

```
/vibe-flow:vibe-flow "Add a dark mode toggle to the settings page"
```

This runs the full loop: plan → ship → link → review → merge → standup.

Or invoke sub-skills individually:

- `/vibe-flow:vibe-plan <spec>` — just planning, no dispatch
- `/vibe-flow:vibe-ship` — dispatch existing issues
- `/vibe-flow:vibe-status` — snapshot of active runs
