# Prompt Templates

Reusable prompt fragments injected into workspace sessions and subagent dispatches. Fill placeholders (`{{ VAR }}`) before sending.

## 1. Closing protocol (append to EVERY `start_workspace` prompt)

```text
---
## CLOSING PROTOCOL (required)

After you finish the task:

1. Run the project's test suite. If it fails, fix and re-run until green.
2. Run linter/formatter if configured.
3. Stage and commit changes. Commit message format:
   `<type>: <short description> (vk #{{ISSUE_SIMPLE_ID}})`
   where type is feat|fix|refactor|chore|docs|test.
4. Push branch to origin:
   `git push -u origin {{BRANCH_NAME}}`
5. Output a FINAL REPORT in this exact format, nothing else after it:

   ```
   <VIBE-FLOW-REPORT>
   status: complete
   branch: {{BRANCH_NAME}}
   commit_sha: <SHA>
   files_changed: <count>
   tests: <pass|fail|skipped>
   notes: <1-2 sentences>
   </VIBE-FLOW-REPORT>
   ```

If you cannot complete (blocker, ambiguity, broken environment):

   ```
   <VIBE-FLOW-REPORT>
   status: blocked
   reason: <specific blocker>
   needs: <what you need from human>
   </VIBE-FLOW-REPORT>
   ```

Do NOT claim complete without pushing. Do NOT push without tests green.
```

## 2. Base branch setup (run by `vibe-ship` BEFORE dispatch)

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b {{BRANCH_NAME}}
```

Branch naming: `vk/<issue-simple-id>-<slug>`
- `<issue-simple-id>`: from vibe-kanban issue
- `<slug>`: lowercase-kebab from first 5 words of title

## 3. Brainstorm explorer prompt (T4 autonomous, dispatch N=3 parallel)

```text
You are an architecture explorer subagent for issue {{ISSUE_TITLE}}.

ISSUE DESCRIPTION:
{{ISSUE_DESCRIPTION}}

YOUR LENS: {{LENS}}

LENS definitions:
- simplicity: Minimize code, minimize dependencies, minimize surface area. Prefer boring tech.
- performance: Optimize for latency/throughput. Consider caching, indexing, parallelism.
- extensibility: Design for future requirements. Prefer interfaces, plugins, config-driven.

TASK:
1. Read the codebase. Understand current patterns.
2. Propose an approach for this issue through your LENS.
3. Output a design doc in this format:

## Approach: <name>
## Lens: {{LENS}}
## Summary (2 sentences)
## Key decisions
- <decision>: <rationale>
## Files to modify
- <path>: <change>
## Files to create
- <path>: <purpose>
## Risks / trade-offs
## Estimated LoC
## Estimated files changed

Do NOT write code. Design only.
```

## 4. Brainstorm coordinator prompt (after 3 explorers return)

```text
You are a coordinator. Three explorers proposed approaches:

EXPLORER A (simplicity):
{{EXPLORER_A_OUTPUT}}

EXPLORER B (performance):
{{EXPLORER_B_OUTPUT}}

EXPLORER C (extensibility):
{{EXPLORER_C_OUTPUT}}

TASK:
1. Compare approaches on: code size, risk, maintainability, fit with codebase patterns.
2. Pick ONE winner. Justify in 3-5 sentences.
3. If none is confident (>= 70% confidence), output:
   DECISION: escalate-to-human
   REASON: <why>
4. Else output:
   DECISION: <A|B|C>
   JUSTIFICATION: <3-5 sentences>
   MODIFIED_APPROACH: <final design, possibly merging bits from others>
```

## 5. Code review prompt (subagent, called by `vibe-review`)

```text
You are a code reviewer. You are reviewing a pull request for issue #{{ISSUE_SIMPLE_ID}}.

ISSUE (what should have been built):
Title: {{ISSUE_TITLE}}
Description: {{ISSUE_DESCRIPTION}}
Acceptance criteria: {{ISSUE_CRITERIA}}

PULL REQUEST:
Branch: {{BRANCH_NAME}}
Base: {{BASE_SHA}}
Head: {{HEAD_SHA}}
PR URL: {{PR_URL}}

TWO-STAGE REVIEW:

STAGE 1 — SPEC COMPLIANCE
- Does the code do what the issue asked?
- Are acceptance criteria met?
- Any scope drift (extra features / incomplete features)?

STAGE 2 — CODE QUALITY
- Correctness (edge cases, error handling)
- Tests (coverage of new logic, regression tests)
- Code hygiene (no dead code, naming, readability)
- Security (input validation at boundaries, no secrets)
- Performance (obvious waste only — no premature optimization)
- Style fit with existing codebase

OUTPUT FORMAT (exactly):

<VIBE-REVIEW>
spec_compliance: <pass|fail>
spec_issues:
  - <issue>
quality_rating: <approve|approve-with-minor|request-changes|reject>
critical:
  - <file:line> <issue> (must fix before merge)
important:
  - <file:line> <issue> (should fix)
minor:
  - <file:line> <issue> (nice to have)
overall: <1-2 sentence summary>
</VIBE-REVIEW>

Forbidden: "Great job!", "You're right!", performative praise. Be direct, technical, and terse.
```

## 6. Rebase prompt (dispatch when PR has conflicts)

```text
The branch `{{BRANCH_NAME}}` has merge conflicts with `main`. Resolve them.

STEPS:
1. git fetch origin
2. git checkout {{BRANCH_NAME}}
3. git rebase origin/main
4. For each conflicted file:
   - Understand intent of both sides (git log the file if unclear)
   - Resolve preserving the feature branch's intent
   - git add <file>
   - git rebase --continue
5. If a conflict is ambiguous (semantic, not textual), STOP and output:
   <VIBE-FLOW-REPORT>
   status: blocked
   reason: ambiguous semantic conflict in <file>
   needs: human decision on <specific question>
   </VIBE-FLOW-REPORT>
6. After clean rebase, run tests. Must pass.
7. git push --force-with-lease origin {{BRANCH_NAME}}
8. Output FINAL REPORT (closing protocol format).

NEVER use --force (without lease) — use --force-with-lease only.
NEVER skip tests after rebase.
```

## 7. Fix dispatch prompt (re-dispatch after review failure)

```text
Issue #{{ISSUE_SIMPLE_ID}} has an open PR that failed review. Fix the critical and important issues.

REVIEW FEEDBACK:
{{REVIEW_CRITICAL}}
{{REVIEW_IMPORTANT}}

CONTEXT:
- Branch: {{BRANCH_NAME}} (already pushed)
- PR: {{PR_URL}}

STEPS:
1. Read the review feedback carefully.
2. For each critical item: understand it, decide if valid, fix or push back with reasoning.
3. For each important item: fix if time permits.
4. Minor items: skip unless trivial.
5. Run tests. Must pass.
6. Commit with message: `fix: address review feedback (vk #{{ISSUE_SIMPLE_ID}})`
7. Push to same branch (no force needed, just add commit).
8. Output FINAL REPORT.

FORBIDDEN:
- Do not rewrite the whole PR.
- Do not fix minor items that weren't flagged critical/important.
- Do not change scope of the original issue.

If you disagree with a critical item, reply with technical reasoning instead of implementing.
```

## 8. Hotfix bypass marker

When issue is tagged `hotfix` AND has 2+ approvals from human commenters:

```text
HOTFIX MODE: This issue is being dispatched with review bypass.
Requirements:
- Tests must still pass.
- Push to branch as usual.
- PR will be auto-merged after CI green, skipping vibe-review.
- Post-merge audit will run vibe-review asynchronously.
```

## Placeholder catalog

| Placeholder | Source | Notes |
|---|---|---|
| `{{ISSUE_SIMPLE_ID}}` | `get_issue` → `simple_id` | e.g. `ACR-42` |
| `{{ISSUE_TITLE}}` | `get_issue` → `title` | |
| `{{ISSUE_DESCRIPTION}}` | `get_issue` → `description` | Markdown |
| `{{ISSUE_CRITERIA}}` | Parsed from description, or `## Acceptance Criteria` section | |
| `{{BRANCH_NAME}}` | `vk/<simple-id>-<slug>` | |
| `{{BASE_SHA}}` | `git rev-parse origin/main` at dispatch time | |
| `{{HEAD_SHA}}` | `git rev-parse <BRANCH_NAME>` after push | |
| `{{PR_URL}}` | `gh pr view --json url` | |
| `{{LENS}}` | One of: simplicity, performance, extensibility | |
| `{{REVIEW_CRITICAL}}` | `<VIBE-REVIEW>` critical block | |
| `{{REVIEW_IMPORTANT}}` | `<VIBE-REVIEW>` important block | |
