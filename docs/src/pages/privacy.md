---
title: Privacy Policy
---

# Privacy Policy

**Last updated: April 24, 2026**

## No data collection

vibe-flow is a Claude Code plugin that runs entirely on your local machine. It does not collect, transmit, or store any personal data.

Specifically:

- **No telemetry.** vibe-flow sends no usage data to any remote server operated by OAI-Labs.
- **No accounts.** No registration or sign-in is required.
- **Local state only.** The `.vibe-flow/state.json` file written to your repository tracks wave progress locally. It never leaves your machine unless you push it to a remote repository yourself (it is gitignored by default).

## Third-party services

vibe-flow invokes tools that connect to services you configure:

| Service | Controlled by | Privacy policy |
|---|---|---|
| **Anthropic Claude API** | Anthropic | [anthropic.com/privacy](https://www.anthropic.com/privacy) |
| **Vibe Kanban MCP** | Your own instance | Your own deployment |
| **GitHub API** (via `gh` CLI) | GitHub / Microsoft | [docs.github.com/site-policy/privacy-policies](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement) |

Any data sent to those services is governed by their respective privacy policies, not this one.

## Contact

Questions? Open an issue at [github.com/OAI-Labs/vibe-flow/issues](https://github.com/OAI-Labs/vibe-flow/issues).
