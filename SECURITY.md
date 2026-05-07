# Security Policy

## Supported versions

Only the latest minor release line receives security fixes. As of `0.2.x`, that
is `0.2.x`.

| Version | Supported |
|---------|-----------|
| 0.2.x   | ✅        |
| < 0.2   | ❌        |

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Please use one of:

1. [GitHub Security Advisories](https://github.com/OAI-Labs/vibe-flow/security/advisories/new)
   — preferred. Private, tracked, lets us coordinate a fix and release.
2. Email the maintainers (see repo owner contact on the GitHub profile if the
   advisories form is unavailable to you).

When reporting, please include:

- A description of the issue and its impact.
- Steps to reproduce, or a proof-of-concept.
- Affected version(s).
- Any suggested mitigation, if you have one.

We aim to acknowledge reports within 3 business days and provide a fix or a
disclosure timeline within 14 days for confirmed issues.

## Scope

vibe-flow is a Claude Code plugin: a set of markdown skill files plus a
Docusaurus docs site. Practical security concerns include:

- Skill prompts that could exfiltrate data from a user's repo or session.
- Shell snippets in skills that, if followed verbatim, could damage a user's
  system or credentials.
- Workflow files (`.github/workflows/*`) with privilege escalation or supply
  chain risks.
- Dependencies in `docs/package.json` with known CVEs.

Out of scope:

- Vulnerabilities in upstream dependencies that are already publicly tracked
  upstream — please report those to the dependency project.
- The vibe-kanban MCP server itself — report to that project.

## Disclosure

Once a fix is released, we'll publish a security advisory crediting the
reporter (unless you prefer to remain anonymous).
