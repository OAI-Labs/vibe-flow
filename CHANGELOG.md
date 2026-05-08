# Changelog

All notable changes to vibe-flow. Follows [Keep a Changelog](https://keepachangelog.com/)
and [Semantic Versioning](https://semver.org/).

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
