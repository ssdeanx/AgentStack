# Tasks: Fix Tool Execute Signatures

## TOOL-FIX-001: Fix web-scraper-tool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/web-scraper-tool.ts`

**Change Pattern:**

```typescript
// FROM:
execute: async ({ context, writer, tracingContext }: { context: {...}, writer?: any, tracingContext?: TracingContext }) => {

// TO:
execute: async ({ context, writer, tracingContext }) => {
```

**Acceptance:**

- GIVEN the tool file
- WHEN compiled with `tsc --noEmit`
- THEN no type errors

---

## TOOL-FIX-002: Fix alpha-vantage.tool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/alpha-vantage.tool.ts`

---

## TOOL-FIX-003: Fix arxiv.tool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/arxiv.tool.ts`

---

## TOOL-FIX-004: Fix browser-tool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/browser-tool.ts`

---

## TOOL-FIX-005: Fix copywriter-agent-tool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/copywriter-agent-tool.ts`

---

## TOOL-FIX-006: Fix data-file-manager.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/data-file-manager.ts`

---

## TOOL-FIX-007: Fix document-chunking.tool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/document-chunking.tool.ts`

---

## TOOL-FIX-008: Fix editor-agent-tool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/editor-agent-tool.ts`

---

## TOOL-FIX-009: Fix extractLearningsTool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/extractLearningsTool.ts`

---

## TOOL-FIX-010: Fix jwt-auth.tool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/jwt-auth.tool.ts`

---

## TOOL-FIX-011: Fix pdf-data-conversion.tool.ts

**Status:** Not Started
**Effort:** S
**Files:** `src/mastra/tools/pdf-data-conversion.tool.ts`

---

## TOOL-FIX-012: Validate all fixes

**Status:** Not Started
**Effort:** S
**Dependencies:** TOOL-FIX-001 through TOOL-FIX-011

**Verification:**

```bash
npx tsc --noEmit
npm test -- --grep tool
```
