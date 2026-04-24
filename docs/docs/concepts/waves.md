---
id: waves
title: Waves & the DAG
---

# Waves & the DAG

vibe-plan produces an issue tree with explicit dependencies. vibe-ship treats that
tree as a DAG and dispatches issues in **waves**:

- **Wave 1**: all issues with no unmet dependencies
- **Wave 2**: issues whose dependencies all landed in wave 1
- …and so on

Within a wave, all issues run in parallel, bounded by `max_parallel` from
`.vibe-flow.yaml`.

## Wave barrier

Config: `wave_barrier: merge | pr-open`

- `merge` (default, safe): wait for every issue in the wave to **merge to main**
  before advancing. Downstream waves see stable code.
- `pr-open` (fast, riskier): advance as soon as PRs are open. Downstream may
  conflict with upstream if both touch the same files.

Use `merge` unless you know your issues are file-disjoint.

## Rebasing within a wave

When one issue in a wave merges, remaining PRs in the same wave may fall behind.
vibe-ship auto-dispatches `vibe-rebase` on the laggards. Max 2 rebase attempts
per PR before escalating.

## Escalation ceiling

If more than 30% of issues in a run hit the escalation ceiling, vibe-flow stops
the run. Something systemic is probably wrong — tier too low, flaky CI,
over-ambitious plan. Human is pulled in.
