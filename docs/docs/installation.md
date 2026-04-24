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

vibe-flow depends on the `vibe-kanban` MCP. If your vibe-kanban runs on a
remote host, a tunnel wrapper looks like:

```bash
#!/bin/bash
# ~/.claude/vibe-kanban-mcp.sh
TUNNEL_PORT=9998
SSH_HOST="aws-t3.large"
REMOTE_PORT=9999
MCP_BIN="/path/to/vibe-kanban-mcp"
PORT_FILE="$HOME/.tmp/vibe-kanban/vibe-kanban.port"

if ! netstat -an 2>/dev/null | grep -q "127.0.0.1:${TUNNEL_PORT}.*LISTEN"; then
  ssh -L "${TUNNEL_PORT}:127.0.0.1:${REMOTE_PORT}" "$SSH_HOST" -N -f \
    -o StrictHostKeyChecking=no -o ExitOnForwardFailure=yes
fi

mkdir -p "$(dirname "$PORT_FILE")"
echo "{\"main_port\":${TUNNEL_PORT},\"preview_proxy_port\":$((TUNNEL_PORT+1))}" > "$PORT_FILE"
exec "$MCP_BIN" "$@"
```

Register in `~/.claude.json`:

```json
{
  "mcpServers": {
    "vibe-kanban": {
      "type": "stdio",
      "command": "bash",
      "args": ["~/.claude/vibe-kanban-mcp.sh"]
    }
  }
}
```

Verify: in Claude Code, run a trivial MCP call (e.g. `list_organizations`) to
confirm the server is reachable.

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
