---
name: vibe-plan
description: Use when you have a spec, feature request, or set of requirements that needs to be broken into vibe-kanban issues - decomposes the spec into an issue tree with dependencies, assigns priorities and tier estimates, creates all issues in the project
---

# vibe-plan

## Overview

Turn a spec into an executable issue tree in vibe-kanban. Each leaf issue is atomic, testable, and independently dispatchable. Dependencies form the wave structure.

**Core principle:** Atomic leaves + explicit dependencies = clean parallelization downstream.

**Announce at start:** "I'm using the vibe-plan skill to decompose the spec."

## When to use

- User has a spec, feature doc, or high-level requirement
- User wants multiple related tasks, not just one
- Before `vibe-ship` — you need issues to ship

Do NOT use if:
- User wants a single small change (just `create_issue` directly)
- Spec is one paragraph and clearly atomic (one issue is enough)
- User already created issues manually

## Required references

- `references/executor-routing.md` — for tier estimation
- `references/prompt-templates.md` — for T4 brainstorm prompts

## The process

### Step 1: Understand the spec

Ask user if unclear:
- What's the end goal? (outcome, not output)
- What's in scope? Out of scope?
- Any constraints (tech stack, deadline, compatibility)?
- Which repo(s) does this touch?
- Which vibe-kanban project to put issues in?

If spec is < 300 chars and trivial → short-circuit, just `create_issue` directly without full planning.

### Step 2: Decompose into atomic tasks

Apply superpowers:writing-plans principles:
- Each task = one deliverable (2-5 min for T0, scaling up)
- Each task testable independently
- Each task has clear acceptance criteria

Group into:
- **Epic** (optional, 1 issue): overarching feature
- **Stories** (1 issue each): independent pieces under the epic
- **Sub-tasks** (optional): further breakdown if a story is too big

Produce flat list with relationships noted:
```
Epic: Add user notifications system
  Story 1: Define Notification data model (no deps)
  Story 2: Add notifications table migration (depends on 1)
  Story 3: Notification service (depends on 1, 2)
  Story 4: Email adapter (depends on 3)
  Story 5: Slack adapter (depends on 3)
  Story 6: Settings UI for notification preferences (depends on 3)
  Story 7: Wire up notification triggers on events (depends on 4,5,6)
```

### Step 3: Tier estimate per issue

For each issue, apply `references/executor-routing.md` heuristics:
- Look at description, file count estimate, keywords
- Assign tentative tier: T0 / T1 / T2 / T3 / T4

Annotate:
```
Story 1: Define Notification data model [T2 — new data model, schema design]
Story 2: Add notifications table migration [T1 — boilerplate migration from model]
Story 3: Notification service [T3 — core new subsystem]
```

### Step 4: Dependency DAG check

Build the dependency graph. Validate:
- No cycles
- Deepest chain length reasonable (< 6 levels — else spec is too monolithic)
- Parallel width reasonable at each level (if 20 issues at same level, consider sub-grouping)

If spec produces a chain with > 6 levels or > 50 total issues:
- Flag to user: "This spec is large. Consider breaking into sub-specs."
- Offer to split into phases (each phase = its own vibe-plan run)

### Step 5: Ambiguity check — T4 detection

For any issue rated T4 (research/ambiguous):
- Ask user: brainstorm mode?
  - **interactive** — pause before dispatch, agent asks clarifying questions
  - **autonomous** — N explorer subagents propose approaches, coordinator picks
  - **skip** — user gives approach now, no brainstorm needed

Record decision on each T4 issue (tag or metadata).

### Step 6: Present plan for approval

```
# Plan: <Spec name>

Epic: <title> (T3)
  Dependencies: none

Story 1 — T2
  Title: <title>
  Description: <what this produces + acceptance criteria>
  Depends on: (epic)

Story 2 — T1
  ...

Summary:
- Total issues: <N>
- Waves: <M>
- Estimated cost: $<X>
- Estimated wall-time: <Y>

Proceed to create issues? (yes / modify / abort)
```

If user says "modify" → accept edits and re-present.

### Step 7: Create issues

For each issue (in dependency order, parents first):

```
create_issue(
  project_id = <PROJECT>,
  title = <title>,
  description = <full description with acceptance criteria, estimated tier, branch hint>
)
```

Capture returned `issue_id` and `simple_id`.

For dependencies:
```
create_issue_relationship(
  from_issue_id = <parent>,
  to_issue_id = <child>,
  kind = "blocks"  # or equivalent
)
```

Apply tags:
- `tier:t0` / `tier:t1` / etc.
- `brainstorm:interactive` / `brainstorm:autonomous` for T4s
- `epic` for the epic issue
- Sprint / milestone tags if user specified

### Step 8: Output plan summary

```
Plan created:
  Project: <name>
  Issues: <N> created
  Epic: <SIMPLE_ID> - <title>
  Waves: <M>

Next: /vibe-flow:vibe-ship to dispatch them.
```

Optionally write a plan summary markdown to `.vibe-flow/plans/<YYYY-MM-DD-slug>.md` for audit.

## Brainstorm coordinator mode (called recursively)

If a T4 issue in `autonomous` mode reaches `vibe-ship`:
1. `vibe-ship` detects T4 + autonomous → invokes `vibe-plan` in "explore" submode
2. `vibe-plan` dispatches N `vibe-explorer` subagents (parallel)
3. Each explorer returns an approach doc
4. `vibe-plan` coordinator (this skill, opus variant) picks winner OR escalates to user
5. Winning approach → becomes a sub-issue (or replaces the T4 issue's description)
6. Returns control to `vibe-ship` for dispatch

See `agents/vibe-explorer.md`.

## Spec quality checks

Before creating issues, validate each issue's description has:
- [ ] Clear outcome stated
- [ ] Acceptance criteria (even 1 bullet)
- [ ] Files likely touched (for tier estimation)
- [ ] Non-goals noted (to prevent scope drift)

If any issue fails this check → refine it before committing.

## Output format

Each created issue's description should follow:
```markdown
## Goal
<1-2 sentences about outcome>

## Context
<optional — why this matters, related issues>

## Acceptance criteria
- [ ] <specific criterion>
- [ ] <specific criterion>

## Non-goals
- <explicitly NOT in scope>

## Estimated tier
T2 (sonnet-4.6-high)

## Estimated files
- <likely file paths>
```

This template makes `vibe-review` more accurate later.

## Remember

- Atomic leaves — each issue independently testable
- Explicit dependencies — the wave scheduler depends on them
- Clear acceptance criteria — this is what reviewer checks later
- Don't over-engineer small specs (< 300 chars → just create_issue)
- User must approve plan before issues created
