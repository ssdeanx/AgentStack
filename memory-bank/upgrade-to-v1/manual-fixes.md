# Manual fixes & prioritized work items

This file breaks the migration into realistic manual work items after automated codemods run. Each item contains: scope, representative files, sample before/after diffs, and acceptance criteria.

1) Tools — update createTool execute signature
   - Scope: `src/mastra/tools/**` (many tools use old execute signature)
   - Representative files: `web-scraper-tool.ts`, `csv-to-json.tool.ts`, `pg-sql-tool.ts`, `finnhub-tools.ts`, `web-scraper-tool.ts`, `data-file-manager.ts`, ...

   Before (old):

   ```diff
   - export const exampleTool = createTool({
   -   execute: async ({ context, runtimeContext, writer, tracingContext }) => { /* ... */ }
   - })

   ```

   After (v1):

   ```diff
   + export const exampleTool = createTool({
   +   execute: async (inputData, context) => { /* inputData == old context, context contains requestContext + writer + tracingContext */ }
   + })

   ```

   Acceptance
   - Tool compiles and unit tests using the tool pass
   - Tests using RuntimeContext mocks updated to RequestContext equivalents

2) Agents & Context — RuntimeContext → RequestContext
   - Scope: `src/mastra/workflows/**`, `src/mastra/tools/**`, `src/mastra/agents/**`, `tests/**`
   - Representative files: `repo-ingestion-workflow.ts`, `spec-generation-workflow.ts`, many tests

   Change: replace imports and types

   Acceptance
   - No unresolved RuntimeContext import usages remain
   - Tests updated and passing

3) Memory — query/rememberMessages → recall, types
   - Scope: memory call sites, helper utilities, tests
   - Representative files: `src/mastra/config/upstashMemory.ts`, `lib/hooks/*`

   Before:

   ```diff
   - const { uiMessages } = await memory.query({ threadId, vectorMessageSearch: 'query' })

   ```

   After:

   ```diff
   + const { messages } = await memory.recall({ threadId, vectorSearchString: 'query', page: 0, perPage: 20 })
   + const uiMessages = toAISdkV5Messages(messages)
   ```

   Acceptance
   - All `memory.query()` and `rememberMessages()` replaced
   - All code uses `MastraDBMessage` as storage format or converts to UI formats via helper

4) Workflows — createRunAsync → createRun
   - Scope: all call sites in app and tests
   - Representative file: `app/dashboard/workflows/page.tsx`

   Acceptance
   - Dashboard and any callers updated and verified in tests

5) Storage/Vectors — get/list pattern and pagination
   - Files: `src/mastra/config/vector/*`, `lib/hooks/*`
   - Change offsets to page/perPage where applicable and update method names to list*.

6) Tracing/Observability
   - Replace telemetry config with `observability` and rename `processors` usage to new names

7) Tests — mass updates
   - Tests referencing RuntimeContext, memory query outputs, messagesV2/uiMessages, or old tool signatures must be updated.

8) CI & release
   - Update CI Node versions and run full suite. Split work into per-area PRs, validate in CI.

How to work

- Create per-area branches: `migration/v1/tools`, `migration/v1/memory`, `migration/v1/workflows`, etc.
- For each PR: run codemod → commit → run tests → manually fix failures → update PR description with list of files changed and tests updated.

Test migration examples (common patterns)

1) Replace RuntimeContext in tests

Before:

```ts
// tests/foo.test.ts
import { RuntimeContext } from '@mastra/core/runtime-context'

it('calls the tool', async () => {
   const runtimeContext = new RuntimeContext()
   // test passes runtimeContext into tool
})
```

After:

```ts
import { RequestContext } from '@mastra/core/request-context'

it('calls the tool', async () => {
   const requestContext = new RequestContext()
   // ensure requestContext conforms to helper factory if needed
})
```

## Update memory tests expecting uiMessages

Before:

```ts
const { uiMessages } = await memory.query({ threadId })
expect(uiMessages[0].text).toContain('hello')
```

After:

```ts
const { messages } = await memory.recall({ threadId, page: 0, perPage: 20 })
const uiMessages = toAISdkV5Messages(messages)
expect(uiMessages[0].text).toContain('hello')
```

PR template (copy into PR description):

```text
Title: [migration/v1/<area>] Short summary

Description:
- Codemods run (which ones):
- Files changed (n):
- Tests updated (n):

Checklist:
- [ ] Ran linters and type checks locally
- [ ] All unit tests for changed files pass
- [ ] CI passing on PR
- [ ] Updated manual-fixes.md / scan-results.md
- [ ] Added codemod report to `memory-bank/upgrade-to-v1/codemod-reports/`
```

Recommended commit message examples

- migration(v1/tools): apply createTool execute signature codemod
- migration(v1/memory): replace memory.query -> memory.recall + tests
- migration(v1/tests): update RuntimeContext -> RequestContext mocks

Small code diff example (tools change)

Before:

```diff
- export const csvToJsonTool = createTool({
-   execute: async ({ context, runtimeContext }) => {
-     const { csv } = context
-   }
- })
```

After:

```diff
+ export const csvToJsonTool = createTool({
+   execute: async (inputData, ctx) => {
+     const { csv } = inputData
+     const requestContext = ctx.requestContext
+   }
+ })
```

