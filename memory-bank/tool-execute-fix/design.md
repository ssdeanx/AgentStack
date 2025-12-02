# Design: Tool Execute Signature Fix

## Root Cause

The `createTool` function expects `execute` to receive a `ToolExecutionContext` object:

```typescript
execute: (context: ToolExecutionContext<TInput, TOutput, TContext>) => Promise<TOutput>
```

Where `ToolExecutionContext` has this shape:

```typescript
interface ToolExecutionContext<TInput, TOutput, TContext> {
  context: z.infer<TInput>;       // REQUIRED - the parsed input
  runtimeContext?: RuntimeContext; // OPTIONAL
  tracingContext?: TracingContext; // OPTIONAL
  writer?: StreamWriter;           // OPTIONAL
  mastra?: Mastra;                 // OPTIONAL
}
```

## The Problem

**Current (WRONG):**

```typescript
execute: async ({ context, writer, tracingContext }: {
  context: any;
  writer: any;           // <-- Treated as REQUIRED
  tracingContext: any;   // <-- Treated as REQUIRED
}) => { ... }
```

This explicit type annotation declares `writer` and `tracingContext` as required properties, conflicting with `ToolExecutionContext`.

## Solution Options

### Option A: Remove explicit type annotation (RECOMMENDED)

```typescript
execute: async ({ context, writer, tracingContext }) => {
  await writer?.write({ ... });  // Still use optional chaining
}
```

TypeScript will infer the correct types from `ToolExecutionContext`.

### Option B: Mark properties as optional in annotation

```typescript
execute: async ({ context, writer, tracingContext }: {
  context: any;
  writer?: any;           // <-- Add ?
  tracingContext?: any;   // <-- Add ?
}) => { ... }
```

### Option C: Use intermediate variable

```typescript
execute: async (execContext) => {
  const { context, writer, tracingContext } = execContext;
  await writer?.write({ ... });
}
```

## Decision

**Option A** - Remove explicit type annotations.

- Cleanest solution
- Lets TypeScript infer correct types
- Requires fewest code changes
- Already working in tools without explicit annotations
