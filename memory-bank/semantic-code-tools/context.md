# Feature Context: Semantic Code Analysis Tools

## Phase: IMPLEMENTATION (Complete)

## Session: 2025-12-06

### Decisions Made
- **Library**: Using `ts-morph` as requested and already present in `package.json`.
- **Caching**: Implementing `ProjectCache` to avoid re-parsing overhead.
- **Scope**: TS/JS (via `ts-morph`) and Python (via `PythonParser`).
- **Location**:
  - Cache & Parser: `src/mastra/tools/semantic-utils.ts` (shared utility file).
  - Tools: `src/mastra/tools/find-references.tool.ts`, `src/mastra/tools/find-symbol.tool.ts`.
- **Integration**: Added tools to `codeArchitectAgent`, `codeReviewerAgent`, and `refactoringAgent` in `src/mastra/agents/codingAgents.ts`.

### Blockers
- None.

### Open Questions
- None.
