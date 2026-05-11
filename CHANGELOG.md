# Changelog

All notable changes to vibe-flow. Follows [Keep a Changelog](https://keepachangelog.com/)
and [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.5] — 2026-05-11

### Changed
- **`vibe-plan` Step 1 — single-issue short-circuit uses concrete criteria** instead of
  the old `< 300 char` proxy. Skips full planning when fewer than 2 acceptance criteria
  apply, estimated change ≤ 30 LOC, or only 1 file is touched with no cross-file
  dependencies. Char count alone misclassified medium specs as trivial and vice versa.
- **`vibe-plan` Step 4.5 (new) — coalesce micro-tasks.** After the DAG is valid, merge
  linear T0/T1 chains where the child has a single parent, no other blocking children,
  and overlapping file scope. Also flags plans whose median leaf is under 20 estimated
  LOC as likely over-decomposed and offers the user a choice (coalesce more aggressively,
  re-decompose higher, or keep as-is). Reduces per-issue orchestration overhead
  (workspace + review + CI) for specs that fan out into many tiny leaves.

## [0.2.4] — 2026-05-08

### Changed
- **`vibe-ship` Step 4c — wave barrier waits on `get_execution.is_finished`** instead of
  scanning agent output for the `<VIBE-FLOW-REPORT>` marker. VK exposes execution status
  authoritatively (`crates/db/src/models/execution_process.rs` enum
  `ExecutionProcessStatus { Running, Completed, Failed, Killed }`; MCP tool
  `get_execution` returns `is_finished: bool` derived from `status != Running`). Polling
  the boolean is more reliable: it fires on `failed` / `killed` too, which previously
  only surfaced via `workspace_timeout_minutes`. The FINAL REPORT block is now optional
  payload (used to extract branch/SHA/notes) rather than the termination signal — if the
  agent crashes before emitting it, vibe-ship still notices and routes to
  `vibe-dispatch-fix`. `wave-scheduler.md` and `prompt-templates.md §1` updated to match.
- **`vibe-link` Step 4 — dropped the `[vibe-flow] PR opened: <url>` description marker.**
  VK's `PrMonitorService` polls open PRs every 60s and auto-fills `pull_requests[]` /
  `latest_pr_url` on the issue (see `IssueDetails` in
  `crates/mcp/src/task_server/tools/remote_issues.rs`). Writing a duplicate marker into
  the issue description created two sources of truth that drifted. The `in_review` status
  transition is still required (VK does not auto-transition on PR open). Idempotency
  dedup now relies solely on `gh pr list --head <branch>` (already present in Step 2)
  and state.json.
- **`vibe-merge` Step 4C — dropped manual `update_workspace(archived=true)`.** VK
  auto-archives a workspace once all its PRs reach a terminal state (merged/closed) via
  the same PR monitor service. The manual call raced VK's writer. `delete_workspace` is
  still available for users who want immediate hard delete via
  `archive.keep_workspace_after_merge_days = 0`.

## [0.2.3] — 2026-05-08

### Fixed
- **`vibe-ship` — wave dispatch was broken in 0.2.2** (regression). The
  fix shipped in 0.2.2 passed the resolved `BASE_SHA` directly to
  `start_workspace.repositories[].branch`, but the vibe-kanban API only
  accepts branch names in that field — raw SHAs are rejected, causing
  every wave dispatch to fail at the API layer. Switching to
  `"origin/main"` does not help either: both `main` and `origin/main`
  are local refs that go stale until VK runs `git fetch`. The actual
  freshness mechanism is the Opening protocol's `git pull` inside the
  workspace; the SHA-as-branch piece in 0.2.2 added nothing and broke
  dispatch.
  - `vibe-ship` Step 4b item 4 reverted: `branch: "main"` (matches VK's
    default-target convention) instead of `branch: <BASE_SHA>`.
  - `wave-scheduler.md` Step 4 sub-step 4 reverted likewise; the
    "Why a resolved SHA" rationale rewritten to explain why the
    Opening protocol is the actual mechanism and the SHA arg was a
    dead end.
  - `prompt-templates.md` §0 Opening protocol simplified: agent's first
    action is now `git fetch origin && git checkout main &&
    git pull --ff-only origin main && git checkout -b {{BRANCH_NAME}}`,
    with hard-stop blocked report on non-fast-forward / network error.
    Dropped the `git reset --hard {{BASE_SHA}}` step (BASE_SHA is no
    longer in the prompt).
  - `wave-scheduler.md` `wave_barrier: pr-open` warning rewritten:
    Opening protocol cannot rescue this mode either (Wave N+1 dispatches
    before Wave N merges by design — there is nothing to pull yet).

### Changed
- **`waves[L].base_sha`** is now documented as **audit metadata only**
  (post-hoc cross-checking of what HEAD a wave was dispatched against),
  not a wire-level field. State.json schema unchanged.

## [0.2.2] — 2026-05-08

### Fixed
- **`vibe-ship` / `wave-scheduler`** — subsequent waves no longer dispatch
  workspaces from a stale `main`. The pre-wave `git pull` ran only in the
  orchestrator's local shell while `start_workspace` was called with
  `branch: "main"` (a floating ref), leaving a race window in which the MCP
  server-side workspace clone could resolve `main` to a SHA from before the
  previous wave's merges landed. Wave 2 tasks could end up branched off
  pre-Wave-1 `main` and re-implement work that had already merged.
  - Step 4a now captures `BASE_SHA = git rev-parse origin/main` after the
    pull and persists it to `state.json` as `waves[L].base_sha`.
  - Step 4b passes the resolved `BASE_SHA` to `start_workspace` as the
    `branch` argument instead of the literal string `"main"`.
  - The Resume protocol re-runs the pre-wave sync (and overwrites
    `waves[L].base_sha`) before re-dispatching any in-flight issue, so a
    crash during a wave does not freeze the base at a now-stale SHA.

### Added
- **`prompt-templates.md` — Opening protocol (§0)** — prepended to every
  workspace prompt as a belt-and-suspenders self-sync. The agent's first
  action is `git fetch origin && git checkout main && git reset --hard
  {{BASE_SHA}} && git checkout -b {{BRANCH_NAME}}`, with a hard-stop
  `<VIBE-FLOW-REPORT> status: blocked` if the workspace base does not
  match the recorded `BASE_SHA`.

### Changed
- **`wave-scheduler.md` — `wave_barrier: pr-open` warning** sharpened to
  spell out that SHA pinning cannot rescue this mode (Wave N+1 dispatches
  before Wave N merges by design), and that it should be used only when
  waves are guaranteed to touch disjoint files.

## [0.2.1] — 2026-05-07

### Fixed
- **`vibe-review`** — handle GitHub's *"Can not request changes on your own
  pull request"* error. Added optional `review.reviewer_token_env` config
  pointing at an env var that holds a bot account PAT (e.g.
  `vibeflow-reviewer`); when unset or empty, vibe-review falls back to
  posting the review body as a plain `gh pr comment`.
- **`vibe-merge`** — relaxed the `reviewDecision == APPROVED` gate to trust
  `state.json.status == approved` when `review.reviewer_token_env` is unset,
  so the comment-fallback path doesn't permanently block merges. When the
  bot env var IS configured, both signals must agree.

### Added
- **`.vibe-flow.example.yaml`** — `review.reviewer_token_env` field with
  setup instructions for a separate reviewer bot account.

## [0.2.0] — 2026-04-24

### Added
- **New skill: `vibe-init`** — guided first-time setup. Picks project via MCP,
  scaffolds `.vibe-flow.yaml` and `.vibe-flow/state.json`, optionally maps the
  `ready_to_merge` board column. Idempotent.
- **Board status transitions** — skills now move the vibe-kanban issue between
  columns at each phase (`in_progress` → `in_review` → `done`), resolved through
  `statuses.*` in `.vibe-flow.yaml` rather than hardcoded names.
- **Documentation site** — Docusaurus 3 in `/docs`, deployed to
  https://oai-labs.github.io/vibe-flow/ via GitHub Actions.
- **LICENSE** file (MIT).
- **CHANGELOG.md**.

### Changed
- **`vibe-link`** now transitions the issue to `in_review` when opening the PR
  (previously the issue stayed in `in_progress` until merge).
- **`vibe-review`** now transitions to `in_progress` on request-changes and
  (optionally) to `ready_to_merge` on approve if the column exists.
- **`.vibe-flow.example.yaml`** gained a `statuses.*` block for mapping
  vibe-flow roles to board column names.
- **Manifests enriched** — added `homepage`, `repository`, `author.url` to
  `plugin.json` and `marketplace.json`.

### Notes
- vibe-kanban MCP does not expose a tool to create board columns. Users who
  want a `ready_to_merge` column must add it manually in vibe-kanban UI →
  Project Settings → Statuses first, then set its name in
  `.vibe-flow.yaml → statuses.ready_to_merge`.

## [0.1.0] — 2026-04-17

### Added
- Initial plugin scaffold with 10 skills: `vibe-plan`, `vibe-ship`, `vibe-link`,
  `vibe-review`, `vibe-merge`, `vibe-dispatch-fix`, `vibe-rebase`, `vibe-status`,
  `vibe-standup`, `vibe-flow` (meta).
- Agents: `vibe-reviewer`, `vibe-explorer`.
- Marketplace manifest (`.claude-plugin/marketplace.json`).
