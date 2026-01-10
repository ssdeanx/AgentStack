# Adding Custom Metadata to Traces

## Automatic Metadata from RequestContext

Instead of manually adding metadata to each span, you can configure Mastra to automatically extract values from RequestContext and attach them as metadata to all spans in a trace.

### Configuration-Level Extraction

Define which RequestContext keys to extract in your tracing configuration:

```typescript
export const mastra = new Mastra({
  observability: new Observability({
    configs: {
      default: {
        serviceName: "my-service",
        requestContextKeys: ["userId", "environment", "tenantId"],
        exporters: [new DefaultExporter()],
      },
    },
  }),
});
```

### Per-Request Additions

You can add trace-specific keys using `tracingOptions.requestContextKeys`:

```typescript
const requestContext = new RequestContext();
requestContext.set("userId", "user-123");
requestContext.set("environment", "production");
requestContext.set("experimentId", "exp-789");

const result = await agent.generate({
  messages: [{ role: "user", content: "Hello" }],
  requestContext,
  tracingOptions: {
    requestContextKeys: ["experimentId"], // Adds to configured keys
  },
});
```

### Nested Value Extraction

Use dot notation to extract nested values from RequestContext:

```typescript
export const mastra = new Mastra({
  observability: new Observability({
    configs: {
      default: {
        requestContextKeys: ["user.id", "session.data.experimentId"],
        exporters: [new DefaultExporter()],
      },
    },
  }),
});
```

## Adding Tags to Traces

Tags are string labels that help you categorize and filter traces. Use `tracingOptions.tags`:

```typescript
const result = await agent.generate({
  messages: [{ role: "user", content: "Hello" }],
  tracingOptions: {
    tags: ["production", "experiment-v2", "user-request"],
  },
});
```

## Manual Metadata Addition

You can add metadata to any span using the tracing context:

```typescript
execute: async ({ inputData, tracingContext }) => {
  const startTime = Date.now();
  const response = await fetch(inputData.endpoint);

  // Add custom metadata to the current span
  tracingContext.currentSpan?.update({
    metadata: {
      apiStatusCode: response.status,
      endpoint: inputData.endpoint,
      responseTimeMs: Date.now() - startTime,
      userTier: inputData.userTier,
      region: process.env.AWS_REGION,
    },
  });

  return await response.json();
};
```

## Child Spans and Metadata Extraction

When creating child spans within tools or workflow steps, you can pass the `requestContext` parameter to enable metadata extraction:

```typescript
execute: async ({ tracingContext, requestContext }) => {
  // Create child span WITH requestContext - gets metadata extraction
  const dbSpan = tracingContext.currentSpan?.createChildSpan({
    type: "generic",
    name: "database-query",
    requestContext, // Pass to enable metadata extraction
  });

  const results = await db.query("SELECT * FROM users");
  dbSpan?.end({ output: results });

  return results;
};
```