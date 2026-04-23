# Executor Routing

Maps issue complexity to executor + model variant. Load this reference when triaging any new issue for dispatch.

## Core principle

**Cheap model first, escalate on failure.** Never start with opus if sonnet-medium can do it. Escalate via `vibe-dispatch-fix` if the cheap tier fails review or CI.

## Tiers

### T0 — Trivial

- **Executor**: `GEMINI`
- **Variant**: `gemini-3-flash-preview`
- **Scope**: Typo, copy change, single-line fix, config edit, remove/hide UI element
- **Hard caps**: ≤ 1 file, ≤ 20 LoC

**Signals:**
- Issue description < 200 chars
- Exactly 1 file path mentioned
- Keywords: `typo`, `wording`, `copy`, `rename`, `hide`, `remove column`, `change text`, `update label`

### T1 — Light

- **Executor**: `CODEX` (gpt-5-mini) OR `CLAUDE_CODE` (sonnet-4.6-medium)
- **Scope**: Single feature, known pattern, ≤ 150 LoC
- **Hard caps**: ≤ 3 files

**Signals:**
- CRUD endpoint, simple React component, form validation
- Issue description 200–600 chars
- Keywords: `add endpoint`, `new form`, `create component`, `validate input`

### T2 — Medium (default)

- **Executor**: `CLAUDE_CODE`
- **Variant**: `sonnet-4.6-high`
- **Scope**: Multi-file change, moderate complexity, feature with tests
- **Hard caps**: ≤ 8 files, ≤ 500 LoC

**Signals:**
- Keywords: `refactor small`, `add feature`, `integrate with`, `wire up`
- Touches frontend + backend
- Tests required

### T3 — Heavy

- **Executor**: `CLAUDE_CODE`
- **Variant**: `opus-4.6`
- **Scope**: Architecture change, new subsystem, migration, critical path
- **Hard caps**: ≤ 20 files, ≤ 2000 LoC

**Signals:**
- Keywords: `refactor architecture`, `migrate`, `redesign`, `rewrite`, `performance-critical`
- Issue blocks > 3 downstream issues
- Touches core service / data model

### T4 — Research / Ambiguous

- **Executor**: `CLAUDE_CODE`
- **Variant**: `opus-4.6`
- **Pre-step**: Brainstorm (autonomous multi-explorer OR interactive with user)
- **Scope**: RFC, design doc, unknown problem space

**Signals:**
- Keywords: `research`, `investigate`, `explore`, `RFC`, `design`, `prototype`, `evaluate`
- No clear acceptance criteria in issue
- Multiple approaches possible

## Triage algorithm

```
1. Read issue title + description + tags
2. If tag `tier:tN` present → use that tier (manual override)
3. Else:
   a. Count keyword matches per tier
   b. Estimate file_count from file paths mentioned in description
   c. Pick tier with highest score
   d. If on critical path (blocks > N issues) → bump tier +1
4. If user has `max_opus_per_wave` limit reached → cap at T2 for non-critical
5. Return {tier, executor, variant}
```

## Fallback chain

When dispatched agent fails (CI red / review critical / stuck):

```
T0 fail → T2 (skip T1, escalate meaningfully)
T1 fail → T2
T2 fail → T3
T3 fail → T3 with interactive brainstorm sub-step
T4 fail → ask user
```

Log each escalation as a comment on the issue:
```
[vibe-flow] Escalating T1 → T2. Previous attempt failed: <reason>
```

## Cost-aware batching (per wave)

Before dispatching wave:

1. Classify all issues in wave
2. If total opus count > `max_opus_per_wave`:
   - Sort opus-tier issues by criticality (downstream dep count)
   - Keep top N on opus
   - Downgrade rest to sonnet-4.6-high (with note in issue)
3. Dispatch

## Executor variants reference

| Executor | Variants | Cost tier |
|---|---|---|
| `GEMINI` | `gemini-3-flash-preview`, `gemini-2.5-pro` | 💲 |
| `CODEX` | `gpt-5-mini`, `gpt-5` | 💲💲 |
| `CLAUDE_CODE` | `sonnet-4.6-medium`, `sonnet-4.6-high`, `opus-4.6` | 💲💲 → 💲💲💲 |
| `AMP` | default | 💲💲 |
| `OPENCODE` | default | 💲 |
| `CURSOR_AGENT` | default | 💲💲 |
| `QWEN_CODE` | default | 💲 |
| `COPILOT` | default | 💲💲 |
| `DROID` | default | 💲💲 |

## Notes

- Variants map to MCP `start_workspace` params: `executor` + `variant`
- Keep tier decisions in issue metadata/comments for audit
- User can override via `.vibe-flow.yaml` → `tier_overrides: { issue_id: t3 }`
