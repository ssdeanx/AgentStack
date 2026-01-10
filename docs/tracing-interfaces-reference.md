# Mastra Tracing Interfaces Reference

## Core Interfaces

### ObservabilityInstance

Primary interface for observability.

```typescript
interface ObservabilityInstance {
  /** Get current configuration */
  getConfig(): Readonly<Required<ObservabilityInstanceConfig>>;
  /** Get all exporters */
  getExporters(): readonly ObservabilityExporter[];
  /** Get all span output processors */
  getSpanOutputProcessors(): readonly SpanOutputProcessor[];
  /** Get the logger instance (for exporters and other components) */
  getLogger(): IMastraLogger;
  /** Start a new span of a specific SpanType */
  startSpan<TType extends SpanType>(
    options: StartSpanOptions<TType>,
  ): Span<TType>;
  /** Shutdown observability and clean up resources */
  shutdown(): Promise<void>;
}
```

### Span

Span interface, used internally for tracing.

```typescript
interface Span<TType extends SpanType> {
  readonly id: string;
  readonly traceId: string;
  readonly type: TType;
  readonly name: string;
  /** Is an internal span? (spans internal to the operation of mastra) */
  isInternal: boolean;
  /** Parent span reference (undefined for root spans) */
  parent?: AnySpan;
  /** Pointer to the ObservabilityInstance instance */
  observabilityInstance: ObservabilityInstance;
  attributes?: SpanTypeMap[TType];
  metadata?: Record<string, any>;
  input?: any;
  output?: any;
  errorInfo?: any;
  /** Tags for categorizing traces (only present on root spans) */
  tags?: string[];
  /** End the span */
  end(options?: EndSpanOptions<TType>): void;
  /** Record an error for the span, optionally end the span as well */
  error(options: ErrorSpanOptions<TType>): void;
  /** Update span attributes */
  update(options: UpdateSpanOptions<TType>): void;
  /** Create child span - can be any span type independent of parent */
  createChildSpan<TChildType extends SpanType>(
    options: ChildSpanOptions<TChildType>,
  ): Span<TChildType>;
  /** Create event span - can be any span type independent of parent */
  createEventSpan<TChildType extends SpanType>(
    options: ChildEventOptions<TChildType>,
  ): Span<TChildType>;
  /** Returns TRUE if the span is the root span of a trace */
  get isRootSpan(): boolean;
  /** Returns TRUE if the span is a valid span (not a NO-OP Span) */
  get isValid(): boolean;
}
```

### ObservabilityExporter

Interface for observability exporters.

```typescript
interface ObservabilityExporter {
  /** Exporter name */
  name: string;
  /** Initialize exporter with tracing configuration and/or access to Mastra */
  init?(options: InitExporterOptions): void;
  /** Export tracing events */
  exportTracingEvent(event: TracingEvent): Promise<void>;
  /** Add score to a trace (optional) */
  addScoreToTrace?({
    traceId,
    spanId,
    score,
    reason,
    scorerName,
    metadata,
  }: {
    traceId: string;
    spanId?: string;
    score: number;
    reason?: string;
    scorerName: string;
    metadata?: Record<string, any>;
  }): Promise<void>;
  /** Shutdown exporter */
  shutdown(): Promise<void>;
}
```

### SpanOutputProcessor

Interface for span output processors.

```typescript
interface SpanOutputProcessor {
  /** Processor name */
  name: string;
  /** Process span before export */
  process(span?: AnySpan): AnySpan | undefined;
  /** Shutdown processor */
  shutdown(): Promise<void>;
}
```

## Span Types

### SpanType

AI-specific span types with their associated metadata.

```typescript
enum SpanType {
  /** Agent run - root span for agent processes */
  AGENT_RUN = "agent_run",
  /** Generic span for custom operations */
  GENERIC = "generic",
  /** Model generation with model calls, token usage, prompts, completions */
  MODEL_GENERATION = "model_generation",
  /** Single model execution step within a generation (one API call) */
  MODEL_STEP = "model_step",
  /** Individual model streaming chunk/event */
  MODEL_CHUNK = "model_chunk",
  /** MCP (Model Context Protocol) tool execution */
  MCP_TOOL_CALL = "mcp_tool_call",
  /** Input or Output Processor execution */
  PROCESSOR_RUN = "processor_run",
  /** Function/tool execution with inputs, outputs, errors */
  TOOL_CALL = "tool_call",
  /** Workflow run - root span for workflow processes */
  WORKFLOW_RUN = "workflow_run",
  /** Workflow step execution with step status, data flow */
  WORKFLOW_STEP = "workflow_step",
  /** Workflow conditional execution with condition evaluation */
  WORKFLOW_CONDITIONAL = "workflow_conditional",
  /** Individual condition evaluation within conditional */
  WORKFLOW_CONDITIONAL_EVAL = "workflow_conditional_eval",
  /** Workflow parallel execution */
  WORKFLOW_PARALLEL = "workflow_parallel",
  /** Workflow loop execution */
  WORKFLOW_LOOP = "workflow_loop",
  /** Workflow sleep operation */
  WORKFLOW_SLEEP = "workflow_sleep",
  /** Workflow wait for event operation */
  WORKFLOW_WAIT_EVENT = "workflow_wait_event",
}
```

### AnySpan

Union type for cases that need to handle any span.

```typescript
type AnySpan = Span<keyof SpanTypeMap>;
```

## Key Span Attributes

### AgentRunAttributes

```typescript
interface AgentRunAttributes {
  /** Agent identifier */
  agentId: string;
  /** Agent Instructions */
  instructions?: string;
  /** Agent Prompt */
  prompt?: string;
  /** Available tools for this execution */
  availableTools?: string[];
  /** Maximum steps allowed */
  maxSteps?: number;
}
```

### ModelGenerationAttributes

```typescript
interface ModelGenerationAttributes {
  /** Model name (e.g., 'gpt-4', 'claude-3') */
  model?: string;
  /** Model provider (e.g., 'openai', 'anthropic') */
  provider?: string;
  /** Type of result/output this model call produced */
  resultType?: "tool_selection" | "response_generation" | "reasoning" | "planning";
  /** Token usage statistics */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    promptCacheHitTokens?: number;
    promptCacheMissTokens?: number;
  };
  /** Model parameters */
  parameters?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stopSequences?: string[];
    seed?: number;
    maxRetries?: number;
  };
  /** Whether this was a streaming response */
  streaming?: boolean;
  /** Reason the generation finished */
  finishReason?: string;
}
```

### ToolCallAttributes

```typescript
interface ToolCallAttributes {
  toolId?: string;
  toolType?: string;
  toolDescription?: string;
  success?: boolean;
}
```

## Options Types

### StartSpanOptions

```typescript
interface StartSpanOptions<TType extends SpanType> {
  /** Span type */
  type: TType;
  /** Span name */
  name: string;
  /** Span attributes */
  attributes?: SpanTypeMap[TType];
  /** Span metadata */
  metadata?: Record<string, any>;
  /** Input data */
  input?: any;
  /** Parent span */
  parent?: AnySpan;
  /** Policy-level tracing configuration */
  tracingPolicy?: TracingPolicy;
  /** Options passed when using a custom sampler strategy */
  customSamplerOptions?: CustomSamplerOptions;
}
```

### TracingOptions

```typescript
interface TracingOptions {
  /** Metadata to add to the root trace span */
  metadata?: Record<string, any>;
  /**
   * Additional RequestContext keys to extract as metadata for this trace.
   * These keys are added to the requestContextKeys config.
   * Supports dot notation for nested values (e.g., 'user.id', 'session.data.experimentId').
   */
  requestContextKeys?: string[];
  /**
   * Trace ID to use for this execution (1-32 hexadecimal characters).
   * If provided, this trace will be part of the specified trace rather than starting a new one.
   */
  traceId?: string;
  /**
   * Parent span ID to use for this execution (1-16 hexadecimal characters).
   * If provided, the root span will be created as a child of this span.
   */
  parentSpanId?: string;
  /**
   * Tags to apply to this trace.
   * Tags are string labels that can be used to categorize and filter traces
   * Note: Tags are only applied to the root span of a trace.
   */
  tags?: string[];
}
```

## Sampling Types

### SamplingStrategy

```typescript
type SamplingStrategy =
  | { type: "always" }
  | { type: "never" }
  | { type: "ratio"; probability: number }
  | { type: "custom"; sampler: (options?: CustomSamplerOptions) => boolean };
```