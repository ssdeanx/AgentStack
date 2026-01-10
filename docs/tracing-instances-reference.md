# Mastra Tracing Instances Reference

## DefaultObservabilityInstance

Default implementation of the ObservabilityInstance interface.

### Constructor

```typescript
new DefaultObservabilityInstance(config: ObservabilityInstanceConfig)
```

Creates a new DefaultObservabilityInstance with the specified configuration.

### Properties

Inherits all properties and methods from BaseObservabilityInstance.

## BaseObservabilityInstance

Base class for custom ObservabilityInstance implementations.

### Methods

#### getConfig

```typescript
getConfig(): Readonly<Required<ObservabilityInstanceConfig>>
```

Returns the current observability configuration.

#### getExporters

```typescript
getExporters(): readonly ObservabilityExporter[]
```

Returns all configured exporters.

#### getSpanOutputProcessors

```typescript
getSpanOutputProcessors(): readonly SpanOutputProcessor[]
```

Returns all configured span output processors.

#### getLogger

```typescript
getLogger(): IMastraLogger
```

Returns the logger instance for exporters and other components.

#### startSpan

```typescript
startSpan<TType extends SpanType>(options: StartSpanOptions<TType>): Span<TType>
```

Start a new span of a specific SpanType. Creates the root span of a trace if no parent is provided.

**Example: start a root span and instrument a child TOOL_CALL span**

```typescript
const root = observability.startSpan({ type: SpanType.GENERIC, name: 'process-request' })
const toolSpan = root.createChildSpan({
  type: SpanType.TOOL_CALL,
  name: 'chartjs-generator',
  input: { dataCount: data.length },
  metadata: { 'tool.id': 'chartjs-generator' },
})

// ... run tool work ...

toolSpan.update({ output: { resultSize: labels.length } })
toolSpan.end()
root.end()
```

#### shutdown

```typescript
async shutdown(): Promise<void>
```

Shuts down all exporters and processors, cleaning up resources.

## Custom Implementation

To create a custom ObservabilityInstance implementation, extend BaseObservabilityInstance:

```typescript
class CustomObservabilityInstance extends BaseObservabilityInstance {
  constructor(config: ObservabilityInstanceConfig) {
    super(config);
    // Custom initialization
  }

  // Override methods as needed
  startSpan<TType extends SpanType>(
    options: StartSpanOptions<TType>,
  ): Span<TType> {
    // Custom span creation logic
    return super.startSpan(options);
  }
}
```