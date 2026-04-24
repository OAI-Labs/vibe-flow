# Changelog

All notable changes to vibe-flow. Follows [Keep a Changelog](https://keepachangelog.com/)
and [Semantic Versioning](https://semver.org/).

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
