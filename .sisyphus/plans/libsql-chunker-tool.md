# Plan: Create libsqlChunker Tool with LibSQLVector

## Context

### Original Request

Create a new document chunking tool in `document-chunking.tool.ts` that uses LibSQL (Turso) instead of PgVector for vector storage, with metadata filtering support for RAG queries.

### Constraints & Preferences

- Follow the project's AGENTS.md instructions for tool creation (createTool pattern, Zod schemas, tracing)
- Use `@mastra/libsql` package (version ^1.7.2 from package.json)
- Mirror the existing `mdocumentChunker` pattern but swap PgVector for LibSQLVector
- Include metadata filtering support similar to how PgVector query tool works in libsql.ts
- Follow existing tool patterns: lifecycle hooks (onInputStart, onInputDelta, onInputAvailable, onOutput), tracing with SpanType.TOOL_CALL

### Interview Summary

**Key Discussions**:

- Tool should use existing `libsqlvector` instance from `../config/libsql` to reuse configured Turso connection
- Same chunking logic from MDocument.chunk() - just swap storage backend
- Need metadata filter input parameter for query operations

**Research Findings**:

- LibSQLVector uses IDENTICAL filter API to PgVector (confirmed via Mastra docs)
- Filter syntax: `{ field: value }` or with operators: `{ field: { $eq: value } }`
- Supports: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$and`, `$or`, `$regex`, `$like`
- `libsqlQueryTool` in libsql.ts already uses `enableFilter: true`

### Metis Review

**Identified Gaps** (addressed):

- Filter syntax ambiguity: Resolved - LibSQLVector uses same API as PgVector
- Index creation: Need to ensure LibSQL index is created if not exists (like pgVector does)

---

## Work Objectives

### Core Objective

Create `libsqlChunker` tool that chunks documents and stores embeddings in LibSQL/Turso database with metadata filtering support.

### Concrete Deliverables

- New tool `libsqlChunker` in `src/mastra/tools/document-chunking.tool.ts`
- Exports added to tool index
- Same input/output schema as `mdocumentChunker` with additional filter support

### Definition of Done

- [ ] Tool compiles without TypeScript errors
- [ ] Uses `libsqlvector` from `../config/libsql`
- [ ] Follows same chunking logic as `mdocumentChunker`
- [ ] Includes metadata filter parameter in input schema
- [ ] All lifecycle hooks implemented (onInputStart, onInputDelta, onInputAvailable, onOutput)
- [ ] Proper tracing with SpanType.TOOL_CALL
- [ ] Exported from tool index

### Must Have

- LibSQLVector storage (not PgVector)
- Metadata filtering support for queries
- All lifecycle hooks
- Proper error handling and logging

### Must NOT Have

- Duplicate Turso/LibSQL connection (reuse existing `libsqlvector` instance)
- Breaking changes to existing tools

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES
- **User wants tests**: NO (manual verification only for this task)
- **Framework**: N/A - manual QA

### Manual Execution Verification

- [ ] TypeScript compilation: `npx tsc --noEmit` → 0 errors
- [ ] Tool can be imported: `import { libsqlChunker } from './tools/document-chunking'`
- [ ] Verify libsqlvector is used (not pgVector)

---

## Task Flow

```
1. Read existing mdocumentChunker (source pattern)
2. Read libsql.ts config (vector store reference)
3. Create libsqlChunker tool
4. Add exports
5. TypeScript verification
```

## TODOs

- [ ]   1. Read mdocumentChunker implementation for pattern reference

    **What to do**:
    - Analyze lines 496-950 of document-chunking.tool.ts
    - Identify all key differences needed for LibSQL variant

    **Must NOT do**:
    - Modify existing mdocumentChunker

    **References**:
    - `src/mastra/tools/document-chunking.tool.ts:496-950` - mdocumentChunker source pattern

- [ ]   2. Verify libsqlvector export from libsql.ts

    **What to do**:
    - Confirm `libsqlvector` is exported
    - Note index creation pattern if different from pgVector

    **References**:
    - `src/mastra/config/libsql.ts:18-28` - libsqlvector instance definition

- [ ]   3. Create libsqlChunker tool

    **What to do**:
    - Add new tool after mdocumentChunker in document-chunking.tool.ts
    - Copy mdocumentChunker structure
    - Replace `pgVector` import with `libsqlvector` from `../config/libsql`
    - Add metadata filter input parameter
    - Use same chunking logic from MDocument.chunk()

    **Must NOT do**:
    - Change existing mdocumentChunker
    - Create new LibSQLVector instance (reuse existing)

    **Pattern References**:
    - `src/mastra/tools/document-chunking.tool.ts:496-950` - Tool structure to follow
    - `src/mastra/config/libsql.ts:18-28` - Vector store to use
    - `src/mastra/config/libsql.ts:152-182` - libsqlQueryTool with enableFilter

    **Acceptance Criteria**:
    - [ ] New tool defined with createTool
    - [ ] Uses libsqlvector (not pgVector)
    - [ ] Has filter input parameter
    - [ ] All lifecycle hooks present
    - [ ] Tracing implemented

- [ ]   4. Add tool to exports

    **What to do**:
    - Add libsqlChunker to exports in index.ts or document-chunking.tool.ts

    **References**:
    - `src/mastra/tools/index.ts` - Export location

- [ ]   5. Verify TypeScript compilation

    **What to do**:
    - Run type check
    - Fix any errors

    **Manual Execution Verification**:
    - [ ] `npx tsc --noEmit` → 0 errors

---

## Commit Strategy

| After Task | Message                                                        | Files                     | Verification        |
| ---------- | -------------------------------------------------------------- | ------------------------- | ------------------- |
| 4          | `feat(tools): add libsqlChunker tool for Turso/LibSQL storage` | document-chunking.tool.ts | TypeScript compiles |

---

## Success Criteria

### Verification Commands

```bash
npx tsc --noEmit  # Expected: 0 errors
```

### Final Checklist

- [ ] libsqlChunker tool created
- [ ] Uses LibSQLVector (not PgVector)
- [ ] Metadata filter support included
- [ ] All lifecycle hooks implemented
- [ ] TypeScript compiles without errors
- [ ] Exported from tool index
