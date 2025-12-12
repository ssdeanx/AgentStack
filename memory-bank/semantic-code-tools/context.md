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

### Follow-up Hardening (Session: 2025-12-12)

- **Node ESM Compatibility**: Removed `require('fs')` usage from `src/mastra/tools/semantic-utils.ts` (repo is `type: module`).
- **Process Exit Safety**: `ProjectCache` cleanup timer now calls `unref()` to avoid keeping Node alive unexpectedly.
- **Web Scraping Governance**:
  - Added domain allowlist enforcement in `src/mastra/tools/web-scraper-tool.ts` via `WEB_SCRAPER_ALLOWED_DOMAINS` (comma-separated hostnames).
  - Implemented link crawling for `web:scraper` when `followLinks` is enabled using Crawlee `enqueueLinks` with depth tracking.
  - Applied retry/delay + request headers/user-agent consistently for crawler requests.
- **Code Tools Hardening**:
  - `src/mastra/tools/code-search.tool.ts`: default ignore patterns + max file size guard + safe regex compilation.
  - `src/mastra/tools/code-analysis.tool.ts`: directory targets supported; default ignore patterns; loop refactor for readability/robustness.

### Blockers

- None.

### Open Questions

- None.
