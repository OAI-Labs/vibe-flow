---
id: vibe-review
title: vibe-review
---

# vibe-review

Dispatches a **fresh subagent** (isolated context — no session history) to
review the PR diff in two stages: spec compliance, then code quality. Posts the
review to GitHub as a formal approval or request-changes.

## Invoke

```
/vibe-flow:vibe-review <PR_NUMBER>
```

## Two stages

1. **Spec compliance** — does the diff solve what the issue asked for?
2. **Code quality** — correctness, readability, security, tests.

Findings are classified: **critical** / **important** / **minor**, each with
file:line refs.

## Output

```
spec_compliance: pass | fail
quality_rating: approve | approve-with-minor | request-changes | reject
```

## Board transitions

| Rating | Board status | Next action |
|---|---|---|
| approve | `ready_to_merge` if configured, else stay `in_review` | vibe-merge |
| request-changes / reject | back to `in_progress` | vibe-dispatch-fix |

## Reviewer discipline

The subagent is instructed: terse, technical, no performative praise. Never
says "Great work!". Pushes back only with technical reasoning, not aesthetic.

## Cost

Reviewer model uses `max(tier, T2)` — never weaker than the implementer.

## Full reference

[skills/vibe-review/SKILL.md on GitHub →](https://github.com/OAI-Labs/vibe-flow/blob/main/plugins/vibe-flow/skills/vibe-review/SKILL.md)
