# PRD: Fix Tool Execute Signature Errors

## Problem Statement

All tools in `src/mastra/tools/` have TypeScript compilation errors due to incorrect destructuring of the `execute` function parameter. The `ToolExecutionContext` type defines `writer`, `tracingContext`, `mastra`, and `runtimeContext` as **optional** properties, but the current code destructures them as required.

## Error Pattern

```
Type '({ context, writer, tracingContext }: { context: any; writer: any; tracingContext: any; })'
is not assignable to type '(context: ToolExecutionContext<...>)'
  Property 'writer' is optional in type 'ToolExecutionContext' but required in type '{ ... }'
```

## Affected Files

- `alpha-vantage.tool.ts`
- `arxiv.tool.ts`
- `browser-tool.ts`
- `copywriter-agent-tool.ts`
- `data-file-manager.ts`
- `document-chunking.tool.ts`
- `editor-agent-tool.ts`
- `extractLearningsTool.ts`
- `jwt-auth.tool.ts`
- `pdf-data-conversion.tool.ts`
- `web-scraper-tool.ts`

## Goals

1. Fix all TypeScript errors in tools folder
2. Maintain backward compatibility
3. Preserve existing functionality

## Success Criteria

- [ ] `npx tsc --noEmit` passes with no errors in `src/mastra/tools/`
- [ ] All tools execute correctly
- [ ] Optional chaining (`?.`) still works for optional properties
