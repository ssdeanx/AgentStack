# Scan results - codebase audit for memory API migration

This file documents occurrences of the old Mastra v0.x API surface and related migration touch-points discovered in a quick repository scan (2025-12-06).

This scan is a first-pass audit intended to give scoped, actionable work items for the migration. It is not exhaustive but highlights the highest-risk areas and representative files.

Summary of notable matches (high-level):

- memory.query usage (should migrate to memory.recall & pagination):
  - src/mastra/config/upstashMemory.ts (call sites that expect uiMessages and messagesV2)
  - lib/hooks/use-mastra.ts, lib/hooks/use-dashboard-queries.ts (vector.query usage in hooks)

- MastraMessageV2 type usage (replace with MastraDBMessage + conversion helpers):
  - src/mastra/config/processors.ts (type guards and helper functions reference MastraMessageV2 extensively)
  - many unit tests and utilities reference v2 types — these will need conversions or updated type imports

- Memory instances with processors configured (processors option should be moved to Agent-level after v1):
  - src/mastra/config/vector/lance.ts (Memory constructed with processors)
  - src/mastra/config/vector/cloudflare.ts
  - src/mastra/config/upstash.ts / upstashMemory.ts
  - src/mastra/config/pg-storage.ts
  - src/mastra/config/mongodb.ts

- Potential UI/format conversions to check:
  - Any code that expects result.uiMessages or messagesV2 shapes (upstashMemory.ts is a candidate)

Other high-risk areas found in the scan (representative files):

- Tools / createTool execute signature (lots of tools):
  - `src/mastra/tools/*` — many tools use the older execute payload shape (e.g. `execute: async ({ context, runtimeContext, writer, tracingContext })`). Representative files:
    - src/mastra/tools/web-scraper-tool.ts
    - src/mastra/tools/csv-to-json.tool.ts
    - src/mastra/tools/pg-sql-tool.ts
    - src/mastra/tools/finnhub-tools.ts
    - src/mastra/tools/* (dozens more) — run the tools codemod first

- RuntimeContext → RequestContext (workflows, tools, tests):
  - src/mastra/workflows/* imports RuntimeContext in several workflows
  - Many tool tests instantiate `new RuntimeContext()` or mock it — tests must change to RequestContext shapes

- Workflows: createRunAsync → createRun
  - app/dashboard/workflows/page.tsx (createRunAsync usage)

- Storage / Vectors: vector.query and store-specific query usages
  - src/mastra/config/vector/* (chroma, qdrant, pinecone, astra, s3vectors, lance)
  - lib/hooks/* (hooks using vector.query)

- Tracing / Observability config changes
  - search for `telemetry` and `processors` in config; examples in src/mastra/config/tracing.ts and other config files

Counts (rough, first-pass):

- Tools using old execute param shape: ~80+ files in `src/mastra/tools/` (search results available).
- RuntimeContext usages: ~40+ (workflows + tests + tools)
- Memory.query / upstashMemory references: several call sites; address these early
- MastraMessageV2 type uses: concentrated in `src/mastra/config/processors.ts` and tests

Next actions (short-term):

1. Run the global codemod (`npx @mastra/codemod@beta v1 .`) in a clean branch and commit results.
2. Apply targeted codemods for tools, memory, agents, workflows and capture failure reports.
3. Create manual-edit tasks per area and assign to local owners (tools, memory, agents, workflows, storage, tracing, tests).

Use this `scan-results.md` for progress tracking — move files you fix from "remaining" → "fixed" and paste small example diffs per PR.

Next recommended actions (short-term):

1. Run the codemods that were added to tasks.md to automate renames where possible.
2. Update types in `src/mastra/config/processors.ts` to MastraDBMessage (and add converter usage where appropriate).
3. Update `upstashMemory` call sites to use recall() plus pagination params and adjust code that destructures uiMessages.
4. Move Memory constructor `processors` configuration into Agent-level processor config or equivalent.

Note: This is a first-pass scan and not exhaustive. After running codemods some places will remain for manual fixes — use this file to track manual edits.

## How to add your findings (workflow)

1. Run the `rg` commands documented above to produce a list of files for your area.
2. Create a report file under `memory-bank/upgrade-to-v1/reports/area-<name>-YYYYMMDD.txt` and commit it — e.g. `reports/tools-execute-20251206.txt`.
3. For each file in the report, create a short line item in `manual-fixes.md` with the PR branch you will use to fix it and mark progress `todo -> in-progress -> fixed`.

Example `manual-fixes` entry:

```text
src/mastra/tools/web-scraper-tool.ts — migration/v1/tools/web-scraper — in-progress
```

## Final note

Treat this directory (`/memory-bank/upgrade-to-v1`) as the ground truth for migration tracking — every automated run should produce a report file and every manual PR should update `manual-fixes.md` and `scan-results.md` as files are fixed. This makes it easy for reviewers and maintainers to watch progress and merge areas safely.
