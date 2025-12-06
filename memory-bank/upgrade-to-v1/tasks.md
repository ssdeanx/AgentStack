# Tasks - Full Mastra v1 migration worklist (repo-wide)

## Tasks

PRE-FLIGHT (before you start)

1. Create a migration branch and preflight
   - Ensure working tree is clean (commit or stash)
   - Ensure Node >= 22.13.0 in CI/dev machines
   - Update package.json devDependencies if necessary for codemod tooling
   - Create a tracked `migration/v1` branch and open a draft PR for visibility

1. Run codemods and record results (automate as much as possible)
   - Run the bulk starter first (applies many safe renames):

       npx @mastra/codemod@beta v1 .

   - Then run per-area targeted codemods and commit after each run:

       npx @mastra/codemod@beta v1/memory-query-to-recall .
       npx @mastra/codemod@beta v1/memory-vector-search-param .
       npx @mastra/codemod@beta v1/memory-message-v2-type .
       npx @mastra/codemod@beta v1/tools-createTool-execute-signature .
       npx @mastra/codemod@beta v1/agent-runtimecontext-to-requestcontext .
       npx @mastra/codemod@beta v1/workflows-createRunAsync-to-createRun .
       npx @mastra/codemod@beta v1/storage-get-to-list .
   - Acceptance: codemods apply cleanly, or produce a clear report of manual fixes required

1. Repository scan & triage (identify manual edits)
   - Patterns to find and triage: `.query(` (memory/vec), `.rememberMessages(`, `MastraMessageV2`, `MastraMessageV3`, `vectorMessageSearch`, `threads.generateTitle` / `generateTitle`, `use: 'text-stream'`, `processors:` used inside Memory constructors or that should move to Agent

   - Record counts and create manual-edit tickets for each category (see scan-results.md)
   - Acceptance: list of matches created and tracked; plan for each manual update

## Manual replacements (prioritized order)

### A. Tools: createTool execute signature

 - Replace `execute: async ({ context, runtimeContext, writer, tracingContext })` with `execute: async (inputData, context)`
- Update tests that instantiate RuntimeContext mocks to use RequestContext or updated shapes

### B. Agents & Tools runtime context rename

 - Replace `RuntimeContext` imports and types with `RequestContext` and update usages of `runtimeContext.get()` accordingly

### C. Memory

 - Replace `.query()` / `.rememberMessages()` with `.recall()` and adjust parameter names: `vectorMessageSearch` → `vectorSearchString`, add `page`, `perPage`, `orderBy`, `filter`
- Update type usages of `MastraMessageV2` → `MastraDBMessage` and replace `messagesV2`/`uiMessages` expectations accordingly

### D. Workflows

 - Update `createRunAsync()` → `createRun()` call sites in the app and tests

### E. Storage & Vectors

 - Replace `get*` → `list*` patterns + update pagination handling (offset/limit → page/perPage)
- Update all vector store `query()` to `list()` or store-specific migration (check provider docs)

### F. Tracing/Observability

 - Switch telemetry config to `observability` and rename `processors`/`spanOutputProcessors` as needed

### G. Client SDK & Evals

 - Rename client methods and types (eg. `listWorkflows` → `getWorkflows`, `runExperiment` → `runEvals`) where necessary

### H. Voice packages

 - Update package names and any moved APIs

 - Acceptance: compile and unit tests pass for changed modules

1. Add tests & helpers
   - Add unit tests that assert recall() return shape and usage patterns
   - Add helpers that convert MastraDBMessage -> UI messages via @mastra/ai-sdk/ui
   - Acceptance: tests added and passing locally

1. Documentation & developer guidance
   - Add this memory-bank feature notes to central docs where needed
   - Add migration checklist & codemod commands to README or developer docs
   - Acceptance: docs updated and reviewers can follow checklist

1. CI & verification (pre-merge)
   - Run full test suite, linting, and type checks
   - Acceptance: CI green; Node, lint, test, and type checks pass; human-approved migration PRs for each area

Notes

- Commit strategy: run codemod → commit → run tests → fix failures → commit. Keep PRs per area for easy review.
- Branch & PR naming:
   - Branch naming: migration/v1/<area>/<short-description> e.g. migration/v1/tools/createTool-signature
   - PR title format: [migration/v1/<area>] short description
   - Required labels: migration/v1, area:<area>, needs-review, tests

Per-area PR flow (recommended, copy into PR description):

1. Checkout a branch

```bash
git checkout -b migration/v1/tools/createTool-signature
```

1. Run the codemod for the area

```bash
npx @mastra/codemod@beta v1/tools-createTool-execute-signature .
```

1. Review diffs, commit and run tests

```bash
git add -A
git commit -m "migration(v1/tools): codemod createTool signature"
npm run test -- -t "<relevant-pattern>"
npm run lint
npm run typecheck
```

1. Manually fix failures identified by codemod, add tests, and update `manual-fixes.md` within the PR

1. Add a codemod report file `memory-bank/upgrade-to-v1/codemod-reports/tools-signature-YYYYMMDD.md` and include it in your PR

1. Update `memory-bank/upgrade-to-v1/scan-results.md` (mark files processed) and `manual-fixes.md` (mark items fixed)

1. Open the PR and ask area owners for review

CI verification

- On PR success run: `npm ci && npm run test && npm run lint && npm run typecheck`
- If CI fails, revert the last commit on the branch, fix breakages locally, and re-push


