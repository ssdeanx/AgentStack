# CI and testing guidance for Mastra v1 migration

This document contains the commands, CI checklist, and common test migration patterns you'll need while updating the repo for Mastra v1.

Commands (recommended order)

1. Preflight and bootstrap locally

```bash
# create clean migration branch
git checkout -b migration/v1/preflight

# Update Mastra deps (example)
npm install @mastra/core@beta @mastra/memory@beta mastra@beta @mastra/mcp@beta --save

# Run tests & lint before starting codemods
npm run test
npm run lint
npm run typecheck
```

1. Run a global codemod (safe starter), commit, and run full checks

```bash
npx @mastra/codemod@beta v1 .
git add -A && git commit -m "migration(v1): run global codemod"
npm run test && npm run lint && npm run typecheck
```

1. Per-area codemods and commit per area

Examples:

```bash
npx @mastra/codemod@beta v1/tools-createTool-execute-signature .
git commit -am "migration(v1): codemod tools signature"
npm run test && npm run lint && npm run typecheck

npx @mastra/codemod@beta v1/memory-query-to-recall .
git commit -am "migration(v1): memory query->recall"
npm run test && npm run lint && npm run typecheck
```

CI checklist for each PR

- Node versions: update CI to Node >= 22.13.0 (matrix job)
- Run: npm ci && npm run test && npm run lint && npm run typecheck
- Ensure all changed tests are updated to use new shapes: RequestContext, MastraDBMessage, memory.recall
- Add/update tests that mock tools or memory which now return different shapes
- Keep PRs small and scoped (tools, memory, workflows, storage)

GitHub Actions snippet (example) — add a matrix with Node 22+ and fast-fail on lint/test failures

```yaml
name: CI - Migration
on: [pull_request]
jobs:

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --runInBand
      - run: npm run typecheck
```

Codemod dry-run tips

- Always run codemods in a disposable branch first. Save the patch output and a summary before automating commits.
- Use `git status` and `git diff` after codemod to review changes. Commit codemod runs separately to make reviews manageable.

Common test conversions & tips

- Replace `new RuntimeContext()` or RuntimeContext mocks with `new RequestContext()` or test helper factories for RequestContext shape
- When memory queries were tested against `uiMessages` / `messagesV2`, update tests to call helper converters (e.g., toAISdkV5Messages()) or assert on `messages` shape
- For tool tests that passed `execute` an object param, update to call the tool with `inputData` and appropriate `context` object
