---
id: vibe-standup
title: vibe-standup
---

# vibe-standup

Periodic summary of activity — daily, end-of-run, or on-demand — formatted for
Slack, Discord, or plain markdown.

## Invoke

```
/vibe-flow:vibe-standup daily
/vibe-flow:vibe-standup run --run-id r-2026-04-24-1
/vibe-flow:vibe-standup --format markdown
```

## Sections

- **Merged** — what landed on main, with PR links
- **In review** — PRs awaiting reviewer
- **Blocked** — escalated issues, with reason + suggested next action
- **In progress** — active workspaces
- **Cost** — running total vs budget

## Channels

Configure in `.vibe-flow.yaml`:

```yaml
notify:
  slack: "https://hooks.slack.com/..."
  discord: "https://discord.com/api/webhooks/..."
```

## Scheduled

Pair with `/schedule` or a cron to run daily:

```
/schedule daily 09:00 /vibe-flow:vibe-standup daily
```

## Full reference

[skills/vibe-standup/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-standup/SKILL.md)
