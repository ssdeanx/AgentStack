Adding Custom Metadata
Custom metadata allows you to attach additional context to your traces, making it easier to debug issues and understand system behavior in production. Metadata can include business logic details, performance metrics, user context, or any information that helps you understand what happened during execution.

You can add metadata to any span using the tracing context:

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


Metadata set here will be shown in all configured exporters.

Automatic Metadata from RequestContext
Instead of manually adding metadata to each span, you can configure Mastra to automatically extract values from RequestContext and attach them as metadata to all spans in a trace. This is useful for consistently tracking user identifiers, environment information, feature flags, or any request-scoped data across your entire trace.

Configuration-Level Extraction
Define which RequestContext keys to extract in your tracing configuration. These keys will be automatically included as metadata for all spans created with this configuration:

src/mastra/index.ts
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


Now when you execute agents or workflows with a RequestContext, these values are automatically extracted:

const requestContext = new RequestContext();
requestContext.set("userId", "user-123");
requestContext.set("environment", "production");
requestContext.set("tenantId", "tenant-456");

// All spans in this trace automatically get userId, environment, and tenantId metadata
const result = await agent.generate({
  messages: [{ role: "user", content: "Hello" }],
  requestContext,
});


Per-Request Additions
You can add trace-specific keys using tracingOptions.requestContextKeys. These are merged with the configuration-level keys:

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

// All spans now have: userId, environment, AND experimentId


Nested Value Extraction
Use dot notation to extract nested values from RequestContext:

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

const requestContext = new RequestContext();
requestContext.set("user", { id: "user-456", name: "John Doe" });
requestContext.set("session", { data: { experimentId: "exp-999" } });

// Metadata will include: { user: { id: 'user-456' }, session: { data: { experimentId: 'exp-999' } } }


How It Works
TraceState Computation: At the start of a trace (root span creation), Mastra computes which keys to extract by merging configuration-level and per-request keys
Automatic Extraction: Root spans (agent runs, workflow executions) automatically extract metadata from RequestContext
Child Span Extraction: Child spans can also extract metadata if you pass requestContext when creating them
Metadata Precedence: Explicit metadata passed to span options always takes precedence over extracted metadata
Adding Tags to Traces
Tags are string labels that help you categorize and filter traces. Unlike metadata (which contains structured key-value data), tags are simple strings designed for quick filtering and organization.

Use tracingOptions.tags to add tags when executing agents or workflows:

// With agents
const result = await agent.generate({
  messages: [{ role: "user", content: "Hello" }],
  tracingOptions: {
    tags: ["production", "experiment-v2", "user-request"],
  },
});

// With workflows
const run = await mastra.getWorkflow("myWorkflow").createRun();
const result = await run.start({
  inputData: { data: "process this" },
  tracingOptions: {
    tags: ["batch-processing", "priority-high"],
  },
});


How Tags Work
Root span only: Tags are applied only to the root span of a trace (the agent run or workflow run span)
Widely supported: Tags are supported by most exporters for filtering and searching traces:
Braintrust - Native tags field
Langfuse - Native tags field on traces
ArizeExporter - tag.tags OpenInference attribute
OtelExporter - mastra.tags span attribute
OtelBridge - mastra.tags span attribute
Combinable with metadata: You can use both tags and metadata in the same tracingOptions
const result = await agent.generate({
  messages: [{ role: "user", content: "Analyze this" }],
  tracingOptions: {
    tags: ["production", "analytics"],
    metadata: { userId: "user-123", experimentId: "exp-456" },
  },
});


Common Tag Patterns
Environment: "production", "staging", "development"
Feature flags: "feature-x-enabled", "beta-user"
Request types: "user-request", "batch-job", "scheduled-task"
Priority levels: "priority-high", "priority-low"
Experiments: "experiment-v1", "control-group", "treatment-a"
Child Spans and Metadata Extraction
When creating child spans within tools or workflow steps, you can pass the requestContext parameter to enable metadata extraction:

execute: async ({ tracingContext, requestContext }) => {
  // Create child span WITH requestContext - gets metadata extraction
  const dbSpan = tracingContext.currentSpan?.createChildSpan({
    type: "generic",
    name: "database-query",
    requestContext, // Pass to enable metadata extraction
  });

  const results = await db.query("SELECT * FROM users");
  dbSpan?.end({ output: results });

  // Or create child span WITHOUT requestContext - no metadata extraction
  const cacheSpan = tracingContext.currentSpan?.createChildSpan({
    type: "generic",
    name: "cache-check",
    // No requestContext - won't extract metadata
  });

  return results;
};


This gives you fine-grained control over which child spans include RequestContext metadata. Root spans (agent/workflow executions) always extract metadata automatically, while child spans only extract when you explicitly pass requestContext.

Creating Child Spans
Child spans allow you to track fine-grained operations within your workflow steps or tools. They provide visibility into sub-operations like database queries, API calls, file operations, or complex calculations. This hierarchical structure helps you identify performance bottlenecks and understand the exact sequence of operations.

Create child spans inside a tool call or workflow step to track specific operations:

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


Child spans automatically inherit the trace context from their parent, maintaining the relationship hierarchy in your observability platform.

Span Processors
Span processors allow you to transform, filter, or enrich trace data before it's exported. They act as a pipeline between span creation and export, enabling you to modify spans for security, compliance, or debugging purposes. Mastra includes built-in processors and supports custom implementations.

Built-in Processors
Sensitive Data Filter redacts sensitive information. It is enabled in the default observability config.
Creating Custom Processors
You can create custom span processors by implementing the SpanOutputProcessor interface. Here's a simple example that converts all input text in spans to lowercase:

src/processors/lowercase-input-processor.ts
import type { SpanOutputProcessor, AnySpan } from "@mastra/observability";

export class LowercaseInputProcessor implements SpanOutputProcessor {
  name = "lowercase-processor";

  process(span: AnySpan): AnySpan {
    span.input = `${span.input}`.toLowerCase();
    return span;
  }

  async shutdown(): Promise<void> {
    // Cleanup if needed
  }
}

// Use the custom processor
export const mastra = new Mastra({
  observability: new Observability({
    configs: {
      development: {
        spanOutputProcessors: [new LowercaseInputProcessor(), new SensitiveDataFilter()],
        exporters: [new DefaultExporter()],
      },
    },
  }),
});


Processors are executed in the order they're defined, allowing you to chain multiple transformations. Common use cases for custom processors include:

Adding environment-specific metadata
Filtering out spans based on criteria
Normalizing data formats
Sampling high-volume traces
Enriching spans with business context
Retrieving Trace IDs
When you execute agents or workflows with tracing enabled, the response includes a traceId that you can use to look up the full trace in your observability platform. This is useful for debugging, customer support, or correlating traces with other events in your system.

Agent Trace IDs
Both generate and stream methods return the trace ID in their response:

// Using generate
const result = await agent.generate({
  messages: [{ role: "user", content: "Hello" }],
});

console.log("Trace ID:", result.traceId);

// Using stream
const streamResult = await agent.stream({
  messages: [{ role: "user", content: "Tell me a story" }],
});

console.log("Trace ID:", streamResult.traceId);


Workflow Trace IDs
Workflow executions also return trace IDs:

// Create a workflow run
const run = await mastra.getWorkflow("myWorkflow").createRun();

// Start the workflow
const result = await run.start({
  inputData: { data: "process this" },
});

console.log("Trace ID:", result.traceId);

// Or stream the workflow
const { stream, getWorkflowState } = run.stream({
  inputData: { data: "process this" },
});

// Get the final state which includes the trace ID
const finalState = await getWorkflowState();
console.log("Trace ID:", finalState.traceId);


Using Trace IDs
Once you have a trace ID, you can:

Look up traces in Studio: Navigate to the traces view and search by ID
Query traces in external platforms: Use the ID in Langfuse, Braintrust, MLflow, or your observability platform
Correlate with logs: Include the trace ID in your application logs for cross-referencing
Share for debugging: Provide trace IDs to support teams or developers for investigation
The trace ID is only available when tracing is enabled. If tracing is disabled or sampling excludes the request, traceId will be undefined.

Integrating with External Tracing Systems
When running Mastra agents or workflows within applications that have existing distributed tracing (OpenTelemetry, Datadog, etc.), you can connect Mastra traces to your parent trace context. This creates a unified view of your entire request flow, making it easier to understand how Mastra operations fit into the broader system.

Passing External Trace IDs
Use the tracingOptions parameter to specify the trace context from your parent system:

// Get trace context from your existing tracing system
const parentTraceId = getCurrentTraceId(); // Your tracing system
const parentSpanId = getCurrentSpanId(); // Your tracing system

// Execute Mastra operations as part of the parent trace
const result = await agent.generate("Analyze this data", {
  tracingOptions: {
    traceId: parentTraceId,
    parentSpanId: parentSpanId,
  },
});

// The Mastra trace will now appear as a child in your distributed trace


OpenTelemetry Integration
Integration with OpenTelemetry allows Mastra traces to appear seamlessly in your existing observability platform:

import { trace } from "@opentelemetry/api";

// Get the current OpenTelemetry span
const currentSpan = trace.getActiveSpan();
const spanContext = currentSpan?.spanContext();

if (spanContext) {
  const result = await agent.generate(userMessage, {
    tracingOptions: {
      traceId: spanContext.traceId,
      parentSpanId: spanContext.spanId,
    },
  });
}


Workflow Integration
Workflows support the same pattern for trace propagation:

const workflow = mastra.getWorkflow("data-pipeline");
const run = await workflow.createRun();

const result = await run.start({
  inputData: { data: "..." },
  tracingOptions: {
    traceId: externalTraceId,
    parentSpanId: externalSpanId,
  },
});


ID Format Requirements
Mastra validates trace and span IDs to ensure compatibility:

Trace IDs: 1-32 hexadecimal characters (OpenTelemetry uses 32)
Span IDs: 1-16 hexadecimal characters (OpenTelemetry uses 16)
Invalid IDs are handled gracefully — Mastra logs an error and continues:

Invalid trace ID → generates a new trace ID
Invalid parent span ID → ignores the parent relationship
This ensures tracing never crashes your application, even with malformed input.

Example: Express Middleware
Here's a complete example showing trace propagation in an Express application:

import { trace } from "@opentelemetry/api";
import express from "express";

const app = express();

app.post("/api/analyze", async (req, res) => {
  // Get current OpenTelemetry context
  const currentSpan = trace.getActiveSpan();
  const spanContext = currentSpan?.spanContext();

  const result = await agent.generate(req.body.message, {
    tracingOptions: spanContext
      ? {
          traceId: spanContext.traceId,
          parentSpanId: spanContext.spanId,
        }
      : undefined,
  });

  res.json(result);
});


This creates a single distributed trace that includes both the HTTP request handling and the Mastra agent execution, viewable in your observability platform of choice.

What Gets Traced
Mastra automatically creates spans for:

Agent Operations
Agent runs - Complete execution with instructions and tools
LLM calls - Model interactions with tokens and parameters
Tool executions - Function calls with inputs and outputs
Memory operations - Thread and semantic recall
Workflow Operations
Workflow runs - Full execution from start to finish
Individual steps - Step processing with inputs/outputs
Control flow - Conditionals, loops, parallel execution
Wait operations - Delays and event waiting