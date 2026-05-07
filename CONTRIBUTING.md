# Contributing to vibe-flow

Thanks for your interest. vibe-flow is a Claude Code plugin built around a small
set of opinionated skills — most contributions land in `plugins/vibe-flow/skills/`
or `docs/`.

## Ground rules

- Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Open an issue before starting non-trivial work, so we can discuss scope.
- Surgical changes: touch only what your change requires. Don't reformat or
  refactor adjacent code as part of a feature PR.
- Match existing style. The skills are written in a terse, technical voice —
  please keep it consistent.

## Repo layout

```
plugins/vibe-flow/
  .claude-plugin/plugin.json      # plugin manifest (version lives here)
  skills/<skill-name>/SKILL.md    # one folder per skill
  agents/                         # subagent definitions
  references/                     # shared prompt templates, routing tables
.claude-plugin/marketplace.json   # marketplace manifest
docs/                             # Docusaurus site (deployed to GitHub Pages)
.vibe-flow.example.yaml           # per-project config template
```

## Local dev

```bash
git clone https://github.com/OAI-Labs/vibe-flow.git
cd vibe-flow

# Symlink plugin into your Claude Code plugins dir to test live edits
ln -s "$(pwd)/plugins/vibe-flow" ~/.claude/plugins/vibe-flow

# Build docs locally (optional)
cd docs && npm install && npm run build
```

Restart your Claude Code session after editing skill files — they're loaded at
session start.

## Submitting a change

1. Fork + branch from `main` (e.g. `fix/review-self-block`, `feat/vibe-init-discord`).
2. Make the change. Keep PRs focused — one concern per PR.
3. Update `CHANGELOG.md` under an `[Unreleased]` heading if user-visible.
4. Update docs if the change affects skill behaviour or config schema.
5. Open a PR using the template. Link the issue you're addressing.

### Commit style

Imperative mood, short title, body explains *why* not *what*:

```
Handle self-review block in vibe-review with bot PAT or comment fallback

GitHub rejects addPullRequestReview when auth user is the PR author.
Add optional review.reviewer_token_env config to use a separate bot
PAT; fall back to gh pr comment otherwise.
```

### Skill changes

Skills are markdown files with strict structure (`name`, `description`, body
sections). When editing:
- Keep the `description` line ≤ ~280 chars — it shows in the skill picker.
- Don't break the `## When to use` / `## The process` shape — other skills cross-reference it.
- If you add config fields, also update `.vibe-flow.example.yaml` and the docs
  page under `docs/docs/skills/<skill>.md`.

## Releasing (maintainers)

1. Bump `plugins/vibe-flow/.claude-plugin/plugin.json` → `version`.
2. Bump `.claude-plugin/marketplace.json` (both top-level and `plugins[0]`).
3. Add a `CHANGELOG.md` section dated today.
4. Commit `Release X.Y.Z`, push to `main`.
5. Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
6. Create GitHub Release from the tag, paste the changelog section as the body.

The docs hero version reads from `plugin.json` at build time — no separate edit
needed.

## Reporting bugs / asking questions

- Bugs: open an issue using the **Bug report** template.
- Feature ideas: open an issue using the **Feature request** template.
- Security issues: see [SECURITY.md](SECURITY.md) — do **not** open a public issue.
