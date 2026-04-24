---
id: tiers
title: Executor tiers
---

# Executor tiers (T0–T4)

Every issue gets a tier during planning. The tier picks the executor + model
variant. Cheapest model that can actually do the job.

| Tier | Executor | Typical work | Est. cost |
|---|---|---|---|
| **T0** | Gemini flash | Typo, copy tweak, hide a column | cents |
| **T1** | Codex mini / Claude sonnet medium | Simple CRUD, `<150 LoC` | low |
| **T2** | Claude sonnet high | Multi-file, moderate complexity | moderate |
| **T3** | Claude opus | Architecture, migration, cross-cutting | high |
| **T4** | Claude opus + brainstorm phase | Research, RFC, ambiguous spec | highest |

## Routing rules

vibe-plan estimates tier from:

- **Scope**: LoC estimate, # of files, # of repos
- **Novelty**: exists-in-codebase pattern vs. new architecture
- **Ambiguity**: is the spec crisp? If not → T4 with brainstorm

Overrides in `.vibe-flow.yaml`:

```yaml
tier_overrides:
  "ISSUE-42": T3
  "ISSUE-17": T0
```

## Fallback chain

If an executor fails (rate-limit, timeout, unrecoverable error), vibe-ship
falls back down the chain:

```yaml
fallback_chain:
  - opus-4.6
  - sonnet-4.6-high
  - sonnet-4.6-medium
```

Never falls back below the issue&rsquo;s original tier for review —
`max(tier, T2)` is used as reviewer model regardless.

## Cost budget

```yaml
cost_budget_usd: 50
max_opus_per_wave: 2
```

Before starting a wave, vibe-flow sums estimated cost. If it exceeds budget, it
asks you to confirm, suggest downgrades, or abort.
