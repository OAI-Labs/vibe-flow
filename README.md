# vibe-flow

Orchestration skills for Vibe Kanban. Turn a spec into merged code using multi-agent waves: **plan → ship → link → review → merge**, with autonomous fix loops.

## Install

```bash
claude --plugin-dir ./vibe-flow
```

Or install globally by symlinking into `~/.claude/plugins/`.

Requires the `vibe-kanban` MCP server configured (see [MCP setup](#mcp-setup)).

## Skills

| Skill | Purpose |
|---|---|
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

Create `.vibe-flow.yaml` at repo root:

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
```

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

Requires `vibe-kanban` MCP server. Example wrapper for remote vibe-kanban via SSH tunnel:

```bash
#!/bin/bash
# ~/.claude/vibe-kanban-mcp.sh
TUNNEL_PORT=9998
SSH_HOST="aws-t3.large"
REMOTE_PORT=9999
MCP_BIN="/c/Users/admin/.vibe-kanban/bin/v0.1.43-.../windows-x64/vibe-kanban-mcp.exe"
PORT_FILE="/c/Users/admin/AppData/Local/Temp/vibe-kanban/vibe-kanban.port"

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
"vibe-kanban": {
  "type": "stdio",
  "command": "C:\\Program Files\\Git\\bin\\bash.exe",
  "args": ["C:/Users/admin/.claude/vibe-kanban-mcp.sh"],
  "env": {}
}
```

## State

`.vibe-flow/state.json` at repo root tracks wave progress, dispatched workspaces, cost. Auto-resume if Claude crashes mid-wave.

## License

MIT
