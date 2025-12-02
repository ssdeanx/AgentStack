# Context: Tool Execute Signature Fix

## Phase: READY FOR IMPLEMENTATION

## Session: 2025-12-02

### Problem Summary

All `createTool()` calls with explicit type annotations on the `execute` function parameter cause TypeScript errors because they declare optional properties (`writer`, `tracingContext`, `mastra`, `runtimeContext`) as required.

### Fix Pattern

Remove explicit type annotations from `execute` function parameters:

```typescript
// BEFORE (broken):
execute: async ({ context, writer, tracingContext }: {
  context: { url: string; ... },
  writer?: any,
  tracingContext?: TracingContext
}) => {

// AFTER (fixed):
execute: async ({ context, writer, tracingContext }) => {
```

### Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Fix approach | Remove type annotations | Let TS infer from ToolExecutionContext |
| Scope | All tools with explicit annotations | Consistent fix across codebase |

### Files to Fix

- [ ] web-scraper-tool.ts (multiple tools inside)
- [ ] alpha-vantage.tool.ts
- [ ] arxiv.tool.ts
- [ ] browser-tool.ts
- [ ] copywriter-agent-tool.ts
- [ ] data-file-manager.ts
- [ ] document-chunking.tool.ts
- [ ] editor-agent-tool.ts
- [ ] extractLearningsTool.ts
- [ ] jwt-auth.tool.ts
- [ ] pdf-data-conversion.tool.ts

### Search Pattern to Find All Occurrences

```bash
grep -rn "execute: async ({ context.*}: {" src/mastra/tools/
```

### Next Steps

1. Run search to find all affected execute functions
2. Remove explicit type annotations from each
3. Run `npx tsc --noEmit` to verify
4. Run tests to confirm functionality
