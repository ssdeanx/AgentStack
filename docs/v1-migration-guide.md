# Mastra v1 Migration Guide

This document combines the migration guides for Tools and Tracing from the official Mastra v1 upgrade documentation.

## Tools Migration

### Changed

#### `createTool` execute signature to `(inputData, context)` format

All `createTool` execute functions now use a new signature with separate `inputData` and `context` parameters instead of a single destructured object. This change provides clearer separation between tool inputs and execution context.

Note: This change only applies to `createTool`. If you're using `createStep` for workflows, the signature remains `async (inputData, context)` and does not need to be changed.

To migrate, update `createTool` signatures to use `inputData` as the first parameter (typed from `inputSchema`) and `context` as the second parameter.

```typescript
createTool({
  id: 'weather-tool',
  execute: async (inputData, context) => {
    const location = inputData.location;
    const userTier = context?.requestContext?.get('userTier');
    return getWeather(location, userTier);
  },
});
```

#### `createTool` context properties organization

Context properties in `createTool` are now organized into namespaces. Agent-specific properties are under `context.agent`, workflow-specific properties are under `context.workflow`, and MCP-specific properties are under `context.mcp`. This change provides better organization and clearer API surface.

For tools that are executed inside an agent, access agent-specific properties through `context.agent`.

```typescript
createTool({
  id: 'suspendable-tool',
  suspendSchema: z.object({ message: z.string() }),
  resumeSchema: z.object({ approval: z.boolean() }),
  execute: async (inputData, context) => {
    if (!context?.agent?.resumeData) {
      return await context?.agent?.suspend({
        message: 'Waiting for approval',
      });
    }
    if (context.agent.resumeData.approval) {
      return { success: true };
    }
  },
});
```

For tools that are executed inside a workflow, access workflow-specific properties through `context.workflow`.

```typescript
createTool({
  id: 'workflow-tool',
  execute: async (inputData, context) => {
    const currentState = context?.workflow?.state;
    context?.workflow?.setState({ step: 'completed' });
    return { result: 'done' };
  },
});
```

The `suspendPayload` gets validated against the `suspendSchema` when the tool is executed. If the suspendPayload doesn't match the `suspendSchema`, a warning is logged and the error is returned as tool output, but suspension continues. Also, when the tool is resumed, the `resumeData` gets validated against the `resumeSchema`. If the resumeData doesn't match the `resumeSchema`, the tool will return a `ValidationError`, preventing the tool resumption.

To skip the `suspendSchema` or `resumeSchema` validation, do not define `suspendSchema` or `resumeSchema` in the tool creation.

Note: For MCP-specific tool context changes, see the [MCP migration guide](https://mastra.ai/guides/v1/migrations/upgrade-to-v1/mcp).

#### `RuntimeContext` to `RequestContext`

The `RuntimeContext` class has been renamed to `RequestContext` throughout the tool execution context. This change provides clearer naming that better describes its purpose as request-specific data.

To migrate, update references from `runtimeContext` to `requestContext` in tool execution functions.

```typescript
createTool({
  id: 'my-tool',
  execute: async (inputData, context) => {
    const userTier = context?.requestContext?.get('userTier');
    return { result: userTier };
  },
});
```

Codemod: You can use Mastra's codemod CLI to update your imports automatically:

```bash
npx @mastra/codemod@beta v1/runtime-context .
```

This applies to all tool executions, whether called directly or through agents and workflows. The type narrowing ensures you handle validation errors appropriately and prevents runtime errors when accessing output properties.

#### Tool output validation with `outputSchema`

Tools with an `outputSchema` now validate their return values at runtime. Previously, `outputSchema` was only used for type inference - the output was never validated.

If your tool returns data that doesn't match its `outputSchema`, it will now return a `ValidationError` instead of the invalid data.

To fix validation errors, ensure the tool's output matches the schema definition:

```typescript
const getUserTool = createTool({
  id: "get-user",
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  execute: async (inputData) => {
    return { id: "123", name: "John", email: "john@example.com" };
  },
});
```

When validation fails, the tool returns a `ValidationError`:

```typescript
// Before v1 - invalid output would silently pass through
await getUserTool.execute({});
// { id: "123", name: "John" } - missing email

// After v1 - validation error returned
// {
//   error: true,
//   message: "Tool output validation failed for get-user. The tool returned invalid output:\n- email: Required\n\nReturned output: {...}",
//   validationErrors: { ... }
// }
```

#### `tool.execute` return type includes `ValidationError`

The return type of `tool.execute` now includes `ValidationError` to handle validation failures. You must narrow the result type before accessing output schema properties to satisfy TypeScript's type checking.

When calling `tool.execute`, check if the result contains an error before accessing output properties:

```typescript
const result = await getUserTool.execute({});
// Type-safe check for validation errors
if ('error' in result && result.error) {
  console.error('Validation failed:', result.message);
  console.error('Details:', result.validationErrors);
  return;
}
// TypeScript knows result is valid here
console.log(result.id, result.name, result.email);
```

Alternatively, update the `outputSchema` to match your actual output, or remove `outputSchema` entirely if you don't need validation.

## Tracing Migration

### Migration Paths

#### From OTEL-based Telemetry (0.x)

If you're using the old `telemetry:` configuration in Mastra, the system has been completely redesigned.

Before (0.x with OTEL telemetry):

```typescript
import { Mastra } from '@mastra/core';
export const mastra = new Mastra({
  telemetry: {
    serviceName: 'my-app',
    enabled: true,
    sampling: {
      type: 'always_on',
    },
    export: {
      type: 'otlp',
      endpoint: 'http://localhost:4318',
    },
  },
});
```

After (v1 with observability - quick start):

```typescript
import { Mastra } from '@mastra/core';
import { Observability } from '@mastra/observability';
export const mastra = new Mastra({
  observability: new Observability({
    default: { enabled: true },
  }),
});
```

This minimal configuration automatically includes the `DefaultExporter`, `CloudExporter`, and `SensitiveDataFilter` processor. See the [observability tracing documentation](https://mastra.ai/docs/v1/observability/tracing/overview) for full configuration options.

After (v1 with custom configuration):

If you need to configure specific exporters (like OTLP), install the exporter package and configure it:

```bash
npm install @mastra/otel-exporter@beta @opentelemetry/exporter-trace-otlp-proto
```

```typescript
import { Mastra } from '@mastra/core';
import { Observability } from '@mastra/observability';
import { OtelExporter } from '@mastra/otel-exporter';
export const mastra = new Mastra({
  observability: new Observability({
    configs: {
      production: {
        serviceName: 'my-app',
        sampling: { type: 'always' },
        exporters: [
          new OtelExporter({
            provider: {
              custom: {
                endpoint: 'http://localhost:4318/v1/traces',
                protocol: 'http/protobuf',
              },
            },
          }),
        ],
      },
    },
  }),
});
```

Key changes:

1. Install `@mastra/observability` package
2. Replace `telemetry:` with `observability: new Observability()`
3. Use `default: { enabled: true }` for quick setup, or `configs:` for custom configuration
4. Export types change from string literals (`'otlp'`) to exporter class instances (`new OtelExporter()`)

See the [exporters documentation](https://mastra.ai/docs/v1/observability/tracing/overview#exporters) for all available exporters.

#### From AI Tracing

If you already upgraded to AI tracing (the intermediate system), you only need to wrap your configuration and install the new package.

Before (AI tracing):

```typescript
import { Mastra } from '@mastra/core';
export const mastra = new Mastra({
  observability: {
    default: { enabled: true },
  },
});
```

After (v1 observability):

```typescript
import { Mastra } from '@mastra/core';
import { Observability } from '@mastra/observability';
export const mastra = new Mastra({
  observability: new Observability({
    default: { enabled: true },
  }),
});
```

Key changes:

1. Install `@mastra/observability` package
2. Import `Observability` from `@mastra/observability`
3. Wrap configuration with `new Observability()`

### Changed

#### Package import path

The observability functionality has moved to a dedicated `@mastra/observability` package.

To migrate, install the package and update your import statements:

```bash
npm install @mastra/observability@beta
```

```typescript
- import { Tracing } from '@mastra/core/observability';
+ import { Observability } from '@mastra/observability';
```

#### Registry configuration

The observability registry is now configured using an `Observability` class instance instead of a plain object.

To migrate, wrap your configuration object with `new Observability()`.

```typescript
+ import { Observability } from '@mastra/observability';

export const mastra = new Mastra({
-   observability: {
+   observability: new Observability({
    default: { enabled: true },
-   },
+   }),
});
```

#### Configuration property `processors` to `spanOutputProcessors`

The configuration property for span processors has been renamed from `processors` to `spanOutputProcessors`.

To migrate, rename the property in your configuration objects.

```typescript
+ import { SensitiveDataFilter } from '@mastra/observability';

export const mastra = new Mastra({
  observability: new Observability({
    configs: {
      production: {
        serviceName: 'my-app',
-         processors: [new SensitiveDataFilter()],
+         spanOutputProcessors: [new SensitiveDataFilter()],
        exporters: [...],
      },
    },
  }),
});
```

#### Exporter method `exportEvent` to `exportTracingEvent`

If you built custom exporters, the exporter method has been renamed from `exportEvent` to `exportTracingEvent`.

To migrate, update method implementations in custom exporters.

```typescript
export class MyExporter implements ObservabilityExporter {
-   exportEvent(event: TracingEvent): void {
+   exportTracingEvent(event: TracingEvent): void {
    // export logic
  }
}
```

### Removed

#### OTEL-based `telemetry` configuration

The OTEL-based `telemetry` configuration from 0.x has been removed. The old system with `serviceName`, `sampling.type`, and `export.type` properties is no longer supported.

To migrate, follow the "From OTEL-based Telemetry" section above. For detailed configuration options, see the [observability tracing documentation](https://mastra.ai/docs/v1/observability/tracing/overview).

#### Custom instrumentation files

The automatic detection of instrumentation files in `/mastra` (with `.ts`, `.js`, or `.mjs` extensions) has been removed. Custom instrumentation is no longer supported through separate files.

To migrate, use the built-in exporter system or implement custom exporters using the `ObservabilityExporter` interface. See the [exporters documentation](https://mastra.ai/docs/v1/observability/tracing/overview#exporters) for details.

#### `instrumentation.mjs` files

If you were using `instrumentation.mjs` files to initialize OpenTelemetry instrumentation (common in deployment setups like AWS Lambda), these are no longer needed. The new observability system is configured directly in your Mastra instance.

Before (0.x):

You needed an instrumentation file:

```javascript
// instrumentation.mjs
import { NodeSDK } from '@opentelemetry/sdk-node';
// ... OTEL setup
```

And had to import it when starting your process:

```bash
node --import=./.mastra/output/instrumentation.mjs --env-file=".env" .mastra/output/index.mjs
```

After (v1):

Simply remove the `instrumentation.mjs` file and configure observability in your Mastra instance:

```typescript
// src/mastra/index.ts
import { Observability } from '@mastra/observability';
export const mastra = new Mastra({
  observability: new Observability({
    default: { enabled: true },
  }),
});
```

Start your process normally without the `--import` flag:

```bash
node --env-file=".env" .mastra/output/index.mjs
```

No separate instrumentation files or special startup flags required.

### Provider Migration Reference

If you were using OTEL-based telemetry with specific providers in 0.x, here's how to configure them in v1:

| Provider | Exporter | Guide | Reference |
|----------|----------|-------|-----------|
| Arize AX, Arize Phoenix | Arize | Guide | Reference |
| Braintrust | Braintrust | Guide | Reference |
| Langfuse | Langfuse | Guide | Reference |
| LangSmith | LangSmith | Guide | Reference |
| Dash0, Laminar, New Relic, SigNoz, Traceloop, Custom OTEL | OpenTelemetry | Guide | Reference |
| LangWatch | <coming soon> | - | - |

#### Installation

Dedicated exporters (Arize, Braintrust, Langfuse, LangSmith):

```bash
npm install @mastra/[exporter-name]-exporter
```

OpenTelemetry exporter (Dash0, Laminar, New Relic, SigNoz, Traceloop):

```bash
npm install @mastra/otel-exporter@beta
```

Plus the required protocol package for your provider (see [OTEL guide](https://mastra.ai/docs/v1/observability/tracing/exporters/otel#installation)).

## Additional Links

- [Mastra v1 Docs](https://mastra.ai/docs/v1)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [Previous: Storage Migration](https://mastra.ai/guides/v1/migrations/upgrade-to-v1/storage)
- [Next: Vectors Migration](https://mastra.ai/guides/v1/migrations/upgrade-to-v1/vectors)