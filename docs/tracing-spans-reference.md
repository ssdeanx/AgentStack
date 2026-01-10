# Mastra Tracing Spans Reference

## BaseSpan

Base interface for all span types.

```typescript
interface BaseSpan<TType extends SpanType> {
  /** Unique span identifier */
  id: string;
  /** OpenTelemetry-compatible trace ID (32 hex chars) */
  traceId: string;
  /** Name of the span */
  name: string;
  /** Type of the span */
  type: TType;
  /** When span started */
  startTime: Date;
  /** When span ended */
  endTime?: Date;
  /** Type-specific attributes */
  attributes?: SpanTypeMap[TType];
  /** User-defined metadata */
  metadata?: Record<string, any>;
  /** Input passed at the start of the span */
  input?: any;
  /** Output generated at the end of the span */
  output?: any;
  /** Error information if span failed */
  errorInfo?: {
    message: string;
    id?: string;
    domain?: string;
    category?: string;
    details?: Record<string, any>;
  };
  /** Is an event span? (occurs at startTime, has no endTime) */
  isEvent: boolean;
}
```

## Span

Span interface, used internally for tracing. Extends BaseSpan with lifecycle methods and properties.

```typescript
interface Span<TType extends SpanType> extends BaseSpan<TType> {
  /** Is an internal span? (spans internal to the operation of mastra) */
  isInternal: boolean;
  /** Parent span reference (undefined for root spans) */
  parent?: AnySpan;
  /** Pointer to the ObservabilityInstance instance */
  observabilityInstance: ObservabilityInstance;
}
```

### Properties

```typescript
/** Returns TRUE if the span is the root span of a trace */
get isRootSpan(): boolean

/** Returns TRUE if the span is a valid span (not a NO-OP Span) */
get isValid(): boolean

/** Get the closest parent spanId that isn't an internal span */
getParentSpanId(includeInternalSpans?: boolean): string | undefined

/** Returns a lightweight span ready for export */
exportSpan(includeInternalSpans?: boolean): ExportedSpan<TType> | undefined
```

### Methods

#### end

```typescript
end(options?: EndSpanOptions<TType>): void
```

Ends the span and triggers export to configured exporters. Sets the `endTime` and optionally updates `output`, `metadata`, and `attributes`.

#### error

```typescript
error(options: ErrorSpanOptions<TType>): void
```

Records an error on the span. Sets the `errorInfo` field and can optionally end the span.

#### update

```typescript
update(options: UpdateSpanOptions<TType>): void
```

Updates span data while it's still active. Can modify `input`, `output`, `metadata`, and `attributes`.

#### createChildSpan

```typescript
createChildSpan<TChildType extends SpanType>(
  options: ChildSpanOptions<TChildType>,
): Span<TChildType>
```

Creates a child span under this span. Child spans track sub-operations and inherit the trace context.

#### createEventSpan

```typescript
createEventSpan<TChildType extends SpanType>(
  options: ChildEventOptions<TChildType>,
): Span<TChildType>
```

Creates an event span under this span. Event spans represent point-in-time occurrences with no duration.

## ExportedSpan

Exported Span interface, used for tracing exporters. A lightweight version of Span without methods or circular references.

```typescript
interface ExportedSpan<TType extends SpanType> extends BaseSpan<TType> {
  /** Parent span id reference (undefined for root spans) */
  parentSpanId?: string;
  /** TRUE if the span is the root span of a trace */
  isRootSpan: boolean;
}
```

## Span Lifecycle Events

### TracingEventType

```typescript
enum TracingEventType {
  /** Emitted when a span is created and started */
  SPAN_STARTED = "span_started",
  /** Emitted when a span is updated via update() */
  SPAN_UPDATED = "span_updated",
  /** Emitted when a span is ended via end() or error() */
  SPAN_ENDED = "span_ended",
}
```

### TracingEvent

```typescript
type TracingEvent =
  | { type: "span_started"; exportedSpan: AnyExportedSpan }
  | { type: "span_updated"; exportedSpan: AnyExportedSpan }
  | { type: "span_ended"; exportedSpan: AnyExportedSpan };
```

Exporters receive these events to process and send trace data to observability platforms.

## Union Types

### AnySpan

```typescript
type AnySpan = Span<keyof SpanTypeMap>;
```

Union type for cases that need to handle any span type.

### AnyExportedSpan

```typescript
type AnyExportedSpan = ExportedSpan<keyof SpanTypeMap>;
```

Union type for cases that need to handle any exported span type.

## Tool Call Span Example

A common pattern is to create a TOOL_CALL span to represent the execution of a tool. Tool spans are typically created as a child of the currently active span so they are correlated to the requesting operation.

```typescript
const toolSpan = tracingContext?.currentSpan?.createChildSpan({
  type: SpanType.TOOL_CALL,
  name: 'chartjs-generator',
  input: { dataCount: data.length, indicatorsCount: indicators.length },
  metadata: {
    'tool.id': 'chartjs-generator',
    'tool.input.dataCount': data.length,
    'tool.input.indicatorsCount': indicators.length,
  },
})

try {
  // perform tool work
  toolSpan?.update({ output: { configSize: labels.length }, metadata: { 'tool.output.labels': labels.length } })
  toolSpan?.end()
} catch (err) {
  toolSpan?.error({ error: err as Error, endSpan: true })
  throw err
}
```

## NO-OP Spans

When tracing is disabled (sampling returns false), NO-OP spans are returned:

### NoOpSpan

A span that performs no operations. All methods are no-ops:

- `id` returns `'no-op'`
- `traceId` returns `'no-op-trace'`
- `isValid` returns `false`
- `end()`, `error()`, `update()` do nothing
- `createChildSpan()` returns another NO-OP span