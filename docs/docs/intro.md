---
id: intro
title: Introduction
sidebar_position: 1
slug: /intro
---

# Introduction

**vibe-flow** is a plugin for Claude Code that orchestrates a multi-skill pipeline:
**plan → ship → link → review → merge**. You hand it a spec; it ships merged code.

It bridges [vibe-kanban](https://vibekanban.com) (issue tracker + workspace runtime)
with GitHub (PRs, CI, reviews). Every transition is gated — fresh verification
before anything ships.

## How it fits together

```
Spec
  ↓
vibe-plan        → decomposes into issue tree on your kanban board
  ↓
vibe-ship        → dispatches workspaces in waves, respecting the DAG
  ↓ (per issue, in parallel)
  ├─ vibe-link    → opens/links PR, moves issue to in_review
  ├─ vibe-review  → subagent does two-stage review, posts to PR
  ├─ vibe-rebase  → if base moved
  ├─ vibe-dispatch-fix → if review critical / CI fail
  └─ vibe-merge   → verify gates, squash, archive, close issue
  ↓
vibe-standup     → daily or end-of-run summary
```

## Why this shape

- **Atomic issues.** Each leaf is one deliverable, one PR, one merge. No epics
  that never land.
- **Parallel waves.** The plan has a DAG; independent leaves run in parallel.
- **Verify fresh.** No hope-based merges. CI green + review approved + mergeable
  — all three re-checked at merge time.
- **Bounded escalation.** Failures don&rsquo;t thrash. Ceiling per issue, then the
  human is pulled in.
- **Cheapest model that works.** Five tiers (T0–T4), routed automatically per
  issue complexity.

## What you need

- [Claude Code](https://code.claude.com) with plugin support
- A [vibe-kanban](https://vibekanban.com) instance + MCP server
- A git repo with `gh` CLI authenticated

Next: [installation](./installation.md).
