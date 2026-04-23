---
name: vibe-standup
description: Use when you want a daily or periodic summary of vibe-flow activity formatted for Slack/Discord - groups by merged/in-review/blocked/in-progress, includes cost aggregation and PR links
---

# vibe-standup

## Overview

Compose a human-readable summary of vibe-flow activity for Slack, Discord, or team update channels. Auto-detects the relevant time window.

**Core principle:** Crisp, copy-pasteable, links everywhere.

**Announce at start:** "I'm using the vibe-standup skill to compose a summary."

## When to use

- User asks for "daily report", "standup", "summary", "what got done"
- End of `vibe-ship` run (auto-invoked)
- Scheduled via `/loop` or cron for recurring updates

## The process

### Step 1: Determine time window

Default: **last 24 hours**. User can override:
- `today` → since midnight local
- `this-week` → since Monday
- `run` → this vibe-ship run (from state.json start timestamp)
- `--since YYYY-MM-DD` → arbitrary

### Step 2: Gather data

1. Load `state.json` (and any rotated `state.json.<run-id>` archives in window)
2. For each issue touched in window:
   - status transitions (dispatched → merged, etc.)
   - PR URL, commit SHA
   - Agent cost estimate
3. Query MCP `list_issues` filtered by `updated_at` for additional context
4. Query GitHub for PRs merged in window: `gh search prs --merged="<window>" --author="@me"`

### Step 3: Categorize

Bucket each issue into ONE of:
- **Merged** (done in window)
- **In review** (PR open, awaiting review or with review in progress)
- **In progress** (workspace running)
- **Blocked** (human intervention needed)
- **Abandoned** (dropped in window)

### Step 4: Compose summary

Format (Markdown, Slack/Discord-compatible):

```markdown
# vibe-flow standup — <YYYY-MM-DD>

**Window:** last 24h | **Project:** a20k-project

## ✅ Merged (3)
- [A20K-1] Remove AI Literacy column — [#42](https://github.com/.../42) — T0 flash — 2m
- [A20K-3] Add pagination to dashboard — [#43](https://github.com/.../43) — T2 sonnet-hi — 18m
- [A20K-4] Refactor login form — [#45](https://github.com/.../45) — T1 sonnet-med — 9m (escalated T1→T2)

## 🔍 In review (2)
- [A20K-5] Auth OIDC migration — [#44](https://github.com/.../44) — T2 — review by @reviewer pending
- [A20K-6] Form validation — [#46](https://github.com/.../46) — T1 — CI running

## 🏗️ In progress (1)
- [A20K-8] Wire notifications — T3 opus — workspace started 15m ago

## 🛑 Blocked (1)
- [A20K-7] Data migration — escalation limit hit (3 fix attempts). Needs human.

## 📊 Metrics
- **Cost (window):** ~$3.77
- **Merged LoC:** +412 / -89
- **Avg wall-time per merged issue:** 12m
- **Escalation rate:** 1/4 (25%)

## 🎯 Wave status
Wave 1 barrier: 2/4 merged. Waiting on A20K-5 (in review), A20K-7 (blocked).

## Next actions
- Review A20K-5 PR
- Unblock A20K-7 — design call needed
- Wave 2 will unblock once Wave 1 closes
```

### Step 5: Deliver

Options:
- **Print to chat** (default) — user copies manually
- **Send to Slack** — if `config.notify.slack` webhook configured:
  ```bash
  curl -X POST -H 'Content-Type: application/json' \
    -d "{\"text\": \"<escaped markdown>\"}" \
    $SLACK_WEBHOOK
  ```
- **Send to Discord** — similar pattern with Discord webhook
- **Write to file** — `.vibe-flow/standups/YYYY-MM-DD.md`

Ask user if multiple destinations configured.

## Variations

### `/vibe-flow:vibe-standup --costs-only`

Just the metrics section:
```
Cost this window: $3.77
By tier: T0 $0.02 / T1 $0.15 / T2 $1.20 / T3 $2.40
By issue (top 3): A20K-7 ($1.80), A20K-5 ($0.90), A20K-3 ($0.45)
```

### `/vibe-flow:vibe-standup weekly`

Grouped by day:
```
## Mon (5 merged)
## Tue (3 merged, 1 blocked)
## Wed (8 merged)
...
## Week total: 21 merged, $12.40 spent
```

## Tone

- Terse. No fluff. Copy-pasteable.
- Emoji only in category headers (signal, not decoration)
- PR links required (not just PR numbers)
- Always include cost
- Call out escalations / blocks prominently — those need action

## Remember

- Default window: last 24h
- Group by state, not by issue ID order
- Include actionable "Next actions" section
- Deliver to configured channel if present
