# Design - Mastra v1 Migration (Full repository)

## Overview

Mastra v1 introduces breaking changes across many subsystems. This design doc provides the practical migration approach and recommended codemods to make a smooth upgrade.

High-level areas we must address:

- Core / Mastra class import reshaping and property access changes
- Tools: createTool signature & RuntimeContext → RequestContext renames
- Agents: runtime/voice API changes and property->getter conversions
- Workflows: run function renames (createRunAsync → createRun) and API cleanups
- Memory: query → recall, parameter & type renames (MastraMessageV2 → MastraDBMessage)
- Storage/Vectors: switch to list* patterns and page/perPage pagination
- Tracing/Observability: telemetry → observability & processor name changes
- Client SDKs & Evals: type and method renames
- Voice packages: package name changes and API updates

## Proposed approach

1. Add migration docs in repo and update memory-bank notes (this feature)
2. Run Mastra codemods where available to convert method names and types
   - Run the bulk codemod to start: `npx @mastra/codemod@beta v1 .`
   - Use targeted codemods for specific areas as needed (examples below)
3. Manually inspect and update call sites that can't be safely codemodded (custom param shapes, adapters)
4. Add bridging unit tests that exercise the memory layer and ensure recall() returns expected formats
5. Update docs and internal helper conversion utilities to use `MastraDBMessage` where applicable

## Example code changes

### Tools (execute signature changes)

Before (old execute signature):

```ts
export const myTool = createTool({
   id: 'example',
   execute: async ({ context, runtimeContext, writer, tracingContext }) => {
      // implementation
   }
})
```

After (v1 execute signature):

```ts
export const myTool = createTool({
   id: 'example',
   execute: async (inputData, context) => {
      // inputData is the tool input payload
      // context contains requestContext (renamed) + writer + tracingContext
   }
})
```

### RuntimeContext → RequestContext (Agents & Tools)

Before:

```ts
import { RuntimeContext } from '@mastra/core/runtime-context'
// code that does runtimeContext.get('foo')
```

After:

```ts
import { RequestContext } from '@mastra/core/request-context'
// code that does requestContext.get('foo')
```

---

### Memory (query() → recall())

```ts
const result = await memory.query({ threadId: 't-123', vectorMessageSearch: 'notes' })
// used: result.messagesV2 or result.uiMessages
```

After (v1):

```ts
const result = await memory.recall({ threadId: 't-123', vectorSearchString: 'notes', page: 0, perPage: 20 })
const messages = result.messages // MastraDBMessage[]
// Convert to UI format with @mastra/ai-sdk/ui converters when required
```

## Testing and validation

- Add unit tests mocking Memory.recall and verifying param translation and return shape
- Add integration tests for major flows that depend on memory recall behavior (chat threads, search)
- Use codemods and validate by running `npx vitest` and `npx eslint` after each codemod pass

## Recommended codemods and commands

- Global starter (recommended):

```sh
npx @mastra/codemod@beta v1 .
```

- Per-area codemods (examples):

```sh
npx @mastra/codemod@beta v1/memory-query-to-recall .
npx @mastra/codemod@beta v1/memory-vector-search-param .
npx @mastra/codemod@beta v1/memory-message-v2-type .
npx @mastra/codemod@beta v1/tools-createTool-execute-signature .
npx @mastra/codemod@beta v1/agent-runtimecontext-to-requestcontext .
npx @mastra/codemod@beta v1/workflows-createRunAsync-to-createRun .
npx @mastra/codemod@beta v1/storage-get-to-list .
```

Run codemods in a clean git working tree, and commit each codemod run as a separate change for easier review.

## Per-area checklist (practical)

- Tools

- Find: `createTool(`, `execute: async ({ context`\) — replace execute param shape
- Codemod: `v1/tools-createTool-execute-signature`
- Manual: update tests and any call sites that rely on old shapes

- Memory

- Find: `.query(`, `.rememberMessages(`, `MastraMessageV2`, `vectorMessageSearch`
- Codemods: `v1/memory-query-to-recall`, `v1/memory-vector-search-param`, `v1/memory-message-v2-type`
- Manual: update adapters and UI conversion helpers

- Agents & RuntimeContext

- Find: `RuntimeContext` imports, `runtimeContext.get(` calls
- Codemod: `v1/agent-runtimecontext-to-requestcontext`
- Manual: migration of request-specific helpers and tests to RequestContext shape

- Workflows

- Find: `createRunAsync(` calls, any function renames
- Codemod: `v1/workflows-createRunAsync-to-createRun`

- Storage & Vectors

- Find: `get*`/`query()` usage; update to `list*` and new pagination
- Codemod: `v1/storage-get-to-list` (plus manual checks per vector provider)

- Tracing & Observability

- Find: `telemetry` and `processors` config; move to `observability` and new names
- Manual: update exporters initialization and config in CI

## Common codemod failures & troubleshooting

Most codemods automate safe renames, but there are common failure modes you'll hit and how to resolve them:

- Typed execute parameters in tools
   - Symptom: TypeScript errors where the execute param is annotated with optional props (writer, tracingContext, runtimeContext).
   - Fix: Change the execute function shape and update its type annotations OR use a lightweight wrapper that adapts the old signature to the new one while you refactor tests.

- Memory return shape changes
   - Symptom: Code expects result.uiMessages or messagesV2 and destructures them; codemod renames method but can't handle custom destructuring.
   - Fix: Replace destructuring with canonical result.messages and convert using toAISdkV5Messages(messages) where UI shapes are needed.

- RuntimeContext → RequestContext mismatches in tests
   - Symptom: Tests creating new RuntimeContext cause type errors or missing methods.
   - Fix: Create test helpers to produce a RequestContext-like mock with the same API as `requestContext.get()` and update tests incrementally.

- Vector store provider differences
   - Symptom: The store's `query()` method is provider-specific and codemod cannot unambiguously rename to `list()`.
   - Fix: Inspect each provider (qdrant, pinecone, chroma, lance) and update the call site to the new store method signature and parameter format.

## PR checklist (per-area PR)

Add this checklist to PR descriptions for reviewers:

- [ ] Runs codemod and lists files changed in PR description
- [ ] All unit tests passing for changed files
- [ ] Type checks (tsc --noEmit) pass
- [ ] ESLint / Prettier checks pass
- [ ] Updated tests include new shapes & data converters (if applicable)
- [ ] Migration notes updated in `memory-bank/upgrade-to-v1/manual-fixes.md` (files fixed -> moved)

## Quick repo search commands (to discover likely files to fix)

Run these locally to get a review list:

```bash
# Tools with old execute signature
rg "execute:\s*async\s*\(\{[^}]*runtimeContext" src/mastra/tools -n

# RuntimeContext usages
rg "RuntimeContext" src -n

# Memory/query usages
rg "\.query\(" src -n | rg "memory|Memory|upstash" -n

# Vector store query usages
rg "\.query\(" src/mastra/config/vector -n

```

## Codemod reporting

When you run a codemod, save the output and a short summary file into `memory-bank/upgrade-to-v1/codemod-reports/` with the command used, the number of files touched, and the first 10 patch snippets. This gives reviewers an audit trail and helps triage manual edits.

Example report format (create file `codemod-reports/tools-signature-2025-12-06.md`):

```yaml
command: npx @mastra/codemod@beta v1/tools-createTool-execute-signature .
files_changed: 78
sample_patches:
   - src/mastra/tools/example.tool.ts: 'execute: async ({ context })' -> 'execute: async (inputData, context)'
   - ...
notes: 10 files required manual fixes after codemod because of custom execute shapes
```



## Rollback plan

If the migration causes regressions we will:

1. Revert the change on the PR
2. Re-run codemods with additional manual adjustments
3. Add more tests to isolate the failing surface
