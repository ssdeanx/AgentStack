# Creating Child Spans

Child spans allow you to track fine-grained operations within your workflow steps or tools. They provide visibility into sub-operations like database queries, API calls, file operations, or complex calculations. This hierarchical structure helps you identify performance bottlenecks and understand the exact sequence of operations.

## Creating Child Spans

Create child spans inside a tool call or workflow step to track specific operations:

```typescript
execute: async ({ inputData, tracingContext }) => {
  // Create another child span for the main database operation
  const querySpan = tracingContext.currentSpan?.createChildSpan({
    type: "generic",
    name: "database-query",
    input: { query: inputData.query },
    metadata: { database: "production" },
  });

  try {
    const results = await db.query(inputData.query);
    querySpan?.end({
      output: results.data,
      metadata: {
        rowsReturned: results.length,
        queryTimeMs: results.executionTime,
        cacheHit: results.fromCache,
      },
    });
    return results;
  } catch (error) {
    querySpan?.error({
      error,
      metadata: { retryable: isRetryableError(error) },
    });
    throw error;
  }
};
```

Child spans automatically inherit the trace context from their parent, maintaining the relationship hierarchy in your observability platform.

## Child Span Options

When creating child spans, you can specify:

- `type`: The span type ("generic", "llm", "tool", etc.)
- `name`: A descriptive name for the operation
- `input`: Input data for the operation
- `metadata`: Additional context information
- `requestContext`: For automatic metadata extraction (optional)

## Error Handling in Child Spans

Use the `error()` method to record errors in child spans:

```typescript
querySpan?.error({
  error,
  metadata: { retryable: isRetryableError(error) },
});
```

## Ending Child Spans

Always end child spans with the `end()` method, providing output data and final metadata:

```typescript
querySpan?.end({
  output: results,
  metadata: {
    rowsReturned: results.length,
    executionTime: Date.now() - startTime,
  },
});
```