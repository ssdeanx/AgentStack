# Copilot Rules

Project rules, safety policies, validation requirements, and learned patterns.

---

## 🚨 Security: Never Upload Secrets

- Do NOT store API keys, `.env`, or secrets in version control
- Use `.env.example` with placeholder values only
- If a secret is leaked:
  1. Rotate credentials immediately
  2. Purge from git history (`git filter-branch` or BFG)
  3. Notify team and audit access logs
- Use GitHub Secret Scanning and pre-commit hooks

---

## 🧠 Context Management Rules

### Progressive Loading

- Do NOT read all memory bank files upfront
- ALWAYS load: `projectbrief.md`, `activeContext.md`, `copilot-rules.md`
- Load additional files based on current phase (see memory-bank-instructions.md)

### Scratchpad Usage

- Persist key decisions to `/memory-bank/<feature>/context.md`
- Record WHY, not just WHAT
- Include: decisions made, blockers, next steps, open questions

### Context Compression

- After 50+ turns or 80% context usage, compress to scratchpad
- Summarize trajectory, keep essential decisions
- Trim older tool outputs and intermediate reasoning

---

## ✅ Validation Hooks

### After Every Implementation
Run these checks before marking any task complete

1. **Lint**: `npx eslint <affected-files> --max-warnings=0`
2. **Types**: `npx tsc --noEmit`

### Validation Status Format

```bash
✅ Tests: 12/12 passing
✅ Lint: 0 warnings, 0 errors
✅ Types: No errors
```

If any fail, do NOT proceed. Fix issues first.

---

## 🎯 Decision Protocol

### For Architectural or Security Decisions

1. **Generate Alternatives**: Propose as many approaches as necessary (3-7) personas or points of view
   - All points of view
     - Many perspectives
     - Diverse pros/cons
     - Consider trade-offs
     - Balance complexity vs. benefit
     - Scalability implications
     - Long-term maintenance
     - Security impacts
     - Performance effects
2. **Evaluate**: Score each against acceptance criteria

    - Criteria examples:
      - Performance
      - Maintainability
      - Scalability
      - User experience
      - Security
3. **Select**: Choose approach with best alignment
    - Justify with pros/cons and criteria scores [0-1 using .1 increments like 0.7, 0.3 ]
4. **Document**: Record rejected alternatives with reasons
   - Save to `design.md` in ADR format (see below)

### ADR Format (in design.md)

```markdown
## Decision: [Title]

### Status: [Proposed | Accepted | Deprecated]

### Context
[Why this decision is needed]

### Options
1. [Option A]: [Pros/Cons]
  - [Details]
  -
  -
  -
2. [Option B]: [Pros/Cons]
  - [Details]
  -
  -
3. [Option C]: [Pros/Cons]
  - [Details]
  -
4...
  - [Details]
  -
5...
  - [Details]
  -
6...
  - [Details]
  -
7...
  - [Details]
  -

### Decision
[Selected option and rationale]

### Consequences
[Impact of this decision]
```

---

## 📁 AgentStack-Specific Rules

### Code Discovery

- Read `AGENTS.md` files in `src/mastra/**` before describing capabilities
- Do NOT guess at functionality—verify against actual code
- When updating memory bank, sync with real code from `src/mastra` and `README.md`

### Directory Reference

| Path | Contains |
|------|----------|
| `src/mastra/agents/` | 22+ specialized agents |
| `src/mastra/tools/` | 30+ enterprise tools with Zod schemas |
| `src/mastra/workflows/` | 10 multi-step workflows |
| `src/mastra/networks/` | 4 agent networks |
| `src/mastra/config/` | Provider clients, storage, role hierarchy |
| `src/mastra/mcp/` | Model Context Protocol server |
| `file://./src/mastra/scorers/` | Custom evaluation metrics |

---

## 🎨 UI Component Rules

### Component Locations

| Type | Path | Count |
|------|------|-------|
| AI Elements | `src/components/ai-elements/` | 30 components |
| Base shadcn/ui | `ui/` | 19 components |

### Import Conventions

```typescript
// Base components
import { Button } from '@/components/ui/button'

// AI components
import { Message } from '@/components/ai-elements/message'
```

### Styling

- Tailwind CSS 4 with CSS variables (oklch color space)
- Dark mode via `next-themes` and `.dark` class
- Use Radix UI primitives from installed components
- Do NOT add conflicting UI libraries

---

## 🧪 Testing & Safety

### Test Requirements

- Maintain or improve coverage when changing tools/agents/workflows
- Test locations: `src/mastra/tools/tests/` and per-agent test files
- Use Vitest for all tests

### Protected Areas
Never modify without explicit review:

- Observability configuration
- Security middleware (JWT, RBAC, path validation)
- HTML sanitization utilities
- Authentication flows

---

## 🔄 Workflow Compliance

### Phase Gates

- Do NOT skip phases (PRD → Design → Tasks → Implementation)
- Do NOT generate code before PHASE 3
- Do NOT assume approvals—wait for explicit `/approve` commands

### Task Isolation

- Each `/implement <TASK_ID>` focuses on ONE task only
- Do not mix changes from multiple tasks
- Complete validation before proceeding

### Recovery Protocol
After context reset:

1. Read `activeContext.md` — current state
2. Read feature `context.md` — decisions and progress
3. Read `progress.md` — completion status
4. Resume from last command

---

## 📝 Documentation Standards

### When to Update Memory Bank

| Trigger | Update |
|---------|--------|
| New pattern discovered | Add to `copilot-rules.md` |
| Task completed | Update `progress.md` |
| Decision made | Write to feature `context.md` |
| User says "update memory bank" | Review ALL files |

### Commit Message Format

```bash
[<area>] <short summary>

<area>: tools, agents, workflows, config, ui, docs
Example: [tools] Add vector search tool with PgVector
```

---

## 🚫 Anti-Patterns to Avoid

- Loading all context files upfront (token waste)
- Generating code before design approval
- Skipping validation hooks
- Making assumptions instead of asking
- Not persisting decisions to scratchpad
- Modifying security code without review

---

*Last updated: 2025-11-28*
*Version: 2.0.0*
