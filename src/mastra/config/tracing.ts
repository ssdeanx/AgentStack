import {
    AISpanType,
    AITracingEventType,
    SamplingStrategyType,
    InternalSpans,
    omitKeys,
    selectFields,
    getNestedValue,
    setNestedValue,
    getValidTraceId,
    getOrCreateSpan,
    SensitiveDataFilter,
    BaseAISpan,
    DefaultAISpan,
    NoOpAISpan,
} from '@mastra/core/ai-tracing'
import type {
    AITracingExporter,
    AITracingEvent,
    AnyExportedAISpan,
    AnyAISpan,
    AISpan,
    AITracing,
    AISpanProcessor,
    AISpanTypeMap,
    AnyAISpanAttributes,
    AIBaseAttributes,
    ModelGenerationAttributes,
    AgentRunAttributes,
    ToolCallAttributes,
    MCPToolCallAttributes,
    ProcessorRunAttributes,
    WorkflowRunAttributes,
    WorkflowStepAttributes,
    WorkflowConditionalAttributes,
    WorkflowConditionalEvalAttributes,
    WorkflowParallelAttributes,
    WorkflowLoopAttributes,
    WorkflowSleepAttributes,
    WorkflowWaitEventAttributes,
    ModelStepAttributes,
    ModelChunkAttributes,
    UsageStats,
    TracingConfig,
    TracingOptions,
    TracingContext,
    TracingPolicy,
    TracingProperties,
    TraceState,
    SamplingStrategy,
    CustomSamplerOptions,
    ConfigSelector,
    ConfigSelectorOptions,
    ObservabilityRegistryConfig,
    ExportedAISpan,
    StartSpanOptions,
    CreateSpanOptions,
    ChildSpanOptions,
    ChildEventOptions,
    EndSpanOptions,
    UpdateSpanOptions,
    ErrorSpanOptions,
} from '@mastra/core/ai-tracing'
import { InstrumentClass } from "@mastra/core";
import { ConsoleLogger } from '@mastra/core/logger'
import { RuntimeContext } from '@mastra/core/runtime-context'
import { LangfuseExporter as BaseLangfuseExporter } from '@mastra/langfuse'
import type { LangfuseExporterConfig } from '@mastra/langfuse'
import { SpanKind } from '@opentelemetry/api';


@InstrumentClass({ prefix: 'lf', spanKind: SpanKind.INTERNAL})
export class LangfuseExporter extends BaseLangfuseExporter {
    private readonly customLogger: ConsoleLogger
    private readonly tracingConfig: TracingConfig
    private readonly tracingOptions: TracingOptions
    private readonly tracingPolicy: TracingPolicy
    private readonly samplingStrategy: SamplingStrategy
    private readonly configSelector: ConfigSelector
    private readonly sensitiveDataFilter: SensitiveDataFilter
    private traceState: TraceState
    private tracingContext: TracingContext
    private tracingProperties: TracingProperties
    private registryConfig: ObservabilityRegistryConfig | null = null
    private processors: AISpanProcessor[] = []
    private spanTypeMap: AISpanTypeMap = {} as AISpanTypeMap
    private spans: Map<string, BaseAISpan<AISpanType>> = new Map()

    constructor(config: LangfuseExporterConfig = {}) {
        super(config)
        this.customLogger = new ConsoleLogger({ level: config.logLevel ?? 'warn' })
        this.sensitiveDataFilter = new SensitiveDataFilter()
        
        this.tracingConfig = {
            name: 'ai',
            serviceName: 'langfuse-exporter',
            includeInternalSpans: true,
            sampling: { type: SamplingStrategyType.ALWAYS },
            // exporters expects an array of AITracingExporter instances.
            // Use the current instance as the exporter for proper typing.
            exporters: [this] as AITracingExporter[],
            // Start with no processors by default. The exporter itself doesn't
            // implement AISpanProcessor, so avoid assigning `this` here.
            processors: [this.sensitiveDataFilter] as AISpanProcessor[],
            // runtimeContextKeys expects an array of strings.
            runtimeContextKeys: ['requestId', 'userId', 'sessionId', 'correlationId', 'transactionId', 'traceSource', 'environment', 'region', 'applicationVersion', 'deploymentId', 'hostName', 'instanceId', 'containerId', 'orchestrationId', 'clusterId', 'podId', 'serviceId', 'functionName', 'functionVersion', 'functionRegion', 'functionMemorySize', 'functionTimeout', 'functionRuntime', 'functionTrigger', 'functionInvocationId', 'functionColdStart', 'functionExecutionDuration', 'functionBillingDuration', 'functionMaxMemoryUsed', 'functionLogGroupName', 'functionLogStreamName', 'functionAwsRequestId', 'functionXRayTraceId', 'functionClientContext', 'functionIdentity'],
        } as TracingConfig

        this.tracingOptions = {
            metadata: {},
            runtimeContextKeys: ['requestId', 'userId', 'sessionId', 'correlationId', 'transactionId', 'traceSource', 'environment', 'region', 'applicationVersion', 'deploymentId', 'hostName', 'instanceId', 'containerId', 'orchestrationId', 'clusterId', 'podId', 'serviceId', 'functionName', 'functionVersion', 'functionRegion', 'functionMemorySize', 'functionTimeout', 'functionRuntime', 'functionTrigger', 'functionInvocationId', 'functionColdStart', 'functionExecutionDuration', 'functionBillingDuration', 'functionMaxMemoryUsed', 'functionLogGroupName', 'functionLogStreamName', 'functionAwsRequestId', 'functionXRayTraceId', 'functionClientContext', 'functionIdentity'],
            parentSpanId: '',
            traceId: '',
        } as TracingOptions

        this.tracingPolicy = {
            internal: InternalSpans.ALL
        } as TracingPolicy

        this.samplingStrategy = {
            type: SamplingStrategyType.ALWAYS,
        } as SamplingStrategy

        this.configSelector = ((options: ConfigSelectorOptions, availableConfigs: ReadonlyMap<string, AITracing>): string | undefined => {
            this.customLogger.debug('Config selector called', { options })
            return availableConfigs.keys().next().value
        }) as ConfigSelector

        this.traceState = { runtimeContextKeys: this.tracingConfig.runtimeContextKeys ?? [] } as TraceState
        // Initialize tracingContext with an empty object; will be populated by runtime
        this.tracingContext = {} as TracingContext
        this.tracingProperties = {traceId: 'trace'} as TracingProperties
        this.spans = new Map<string, BaseAISpan<AISpanType>>()
        this.spanTypeMap = {} as AISpanTypeMap
        // Use the sensitiveDataFilter as the initial processor. Do not cast `this` unless it
        // actually implements AISpanProcessor.
        this.processors = [this.sensitiveDataFilter] as AISpanProcessor[]
        this.tracingPolicy = { internal: InternalSpans.ALL}
    }

    override init(): void {
        super.init?.()
        this.customLogger.debug('LangfuseExporter initialized', {
            config: this.tracingConfig,
            options: this.tracingOptions,
        })
    }

    setRegistryConfig(config: ObservabilityRegistryConfig): void {
        this.registryConfig = config
    }

    addProcessor(processor: AISpanProcessor): void {
        this.processors.push(processor)
    }

    updateTraceState(state: Partial<TraceState>): void {
        this.traceState = { ...this.traceState, ...state }
    }

    updateTracingContext(context: Partial<TracingContext>): void {
        this.tracingContext = { ...this.tracingContext, ...context }
    }

    updateTracingProperties(props: Partial<TracingProperties>): void {
        this.tracingProperties = { ...this.tracingProperties, ...props }
    }

    getSamplingStrategy(): SamplingStrategy {
        return this.samplingStrategy
    }

    getConfigSelector(): ConfigSelector {
        return this.configSelector
    }

    applyCustomSampler(options: CustomSamplerOptions): boolean {
        this.customLogger.debug('Applying custom sampler', options)
        return true
    }

    applyConfigSelectorOptions(options: ConfigSelectorOptions): void {
        this.customLogger.debug('Applying config selector options', options)
    }

    createSpan(options: CreateSpanOptions<AISpanType>): AnyAISpan {
        this.customLogger.debug('Creating span', options)
        return {} as AnyAISpan
    }

    startSpan(options: StartSpanOptions<AISpanType>): AISpan<AISpanType> {
        this.customLogger.debug('Starting span', options)
        return {} as AISpan<AISpanType>
    }

    createChildSpan(options: ChildSpanOptions<AISpanType>): AnyAISpan {
        this.customLogger.debug('Creating child span', options)
        return {} as AnyAISpan
    }

    createChildEvent(options: ChildEventOptions<AISpanType>): void {
        this.customLogger.debug('Creating child event', options)
    }

    endSpan(options: EndSpanOptions<AISpanType>): void {
        this.customLogger.debug('Ending span', options)
    }

    updateSpan(options: UpdateSpanOptions<AISpanType>): void {
        this.customLogger.debug('Updating span', options)
    }

    handleSpanError(options: ErrorSpanOptions<AISpanType>): void {
        this.customLogger.debug('Handling span error', options)
    }

    exportSpan(span: ExportedAISpan<AISpanType>): void {
        this.customLogger.debug('Exporting span', { spanId: span.id })
    }

    getTracing(): AITracing | null {
        return null
    }

    getUsageStats(span: AnyExportedAISpan): UsageStats | undefined {
        const attrs = span.attributes as AIBaseAttributes | undefined
        return attrs ? ({} as UsageStats) : undefined
    }

    filterSensitiveData<T extends Record<string, unknown>>(data: T, keysToOmit: string[]): Partial<T> {
        return omitKeys(data, keysToOmit)
    }

    selectSpanFields<T extends Record<string, unknown>>(data: T, fields: string[]): Partial<T> {
        return selectFields(data, fields)
    }

    getSpanNestedValue<T>(obj: Record<string, unknown>, path: string): T | undefined {
        return getNestedValue(obj, path)
    }

    setSpanNestedValue<T>(obj: Record<string, unknown>, path: string, value: T): void {
        setNestedValue(obj, path, value)
    }

    resolveTraceId(parentSpan?: AnyAISpan): string | undefined {
        return getValidTraceId(parentSpan)
    }

    getOrCreateActiveSpan(options: CreateSpanOptions<AISpanType>): AnyAISpan | undefined {
        const spanKey = `${options.type}-${options.name}`
        const existing = this.spans.get(spanKey)
        if (existing) {
            return existing as AnyAISpan
        }
        return getOrCreateSpan(options)
    }

    createDefaultSpan(type: AISpanType, name: string, tracing: AITracing): DefaultAISpan<AISpanType> {
        const span = new DefaultAISpan({ type, name }, tracing)
        this.spans.set(span.id, span)
        return span
    }

    createNoOpSpan(type: AISpanType, name: string, tracing: AITracing): NoOpAISpan {
        return new NoOpAISpan({ type, name }, tracing)
    }

    processSpanAttributes(attrs: AnyAISpanAttributes): AnyAISpanAttributes {
        const filter = this.sensitiveDataFilter
        this.customLogger.debug('Processing span attributes', { filter: filter.constructor.name })
        return attrs
    }

    /**
     * Ensures a trace exists in the parent exporter's traceMap before child spans are exported.
     * The base LangfuseExporter only creates traces when root spans arrive, causing warnings
     * when child spans (like MODEL_STEP) are exported first due to async timing.
     */
    private ensureTraceExists(span: AnyExportedAISpan): void {
        // Access the parent's traceMap via the inherited property
        // @ts-expect-error - traceMap is protected in base class but we need to check it
        const traceMap = this.traceMap as Map<string, unknown> | undefined
        if (!traceMap || !span.traceId) return

        if (!traceMap.has(span.traceId)) {
            this.customLogger.debug('Creating synthetic trace for orphan span', {
                traceId: span.traceId,
                spanId: span.id,
                spanName: span.name,
                spanType: span.type,
                parentSpanId: span.parentSpanId,
            })
            
            // Create a synthetic root span to initialize the trace
            // Use the original span's traceId and derive a meaningful name
            const syntheticRootSpan = {
                ...span,
                id: `synthetic-root-${span.traceId.slice(0, 8)}`,
                isRootSpan: true,
                parentSpanId: undefined,
                name: this.deriveSyntheticTraceName(span),
            }
            
            // @ts-expect-error - initTrace is protected but we need to call it
            this.initTrace?.(syntheticRootSpan)
        }
    }

    /**
     * Derives a meaningful trace name from an orphan child span.
     */
    private deriveSyntheticTraceName(span: AnyExportedAISpan): string {
        // Try to extract a meaningful prefix from the span name
        if (span.name.includes(':')) {
            return span.name.split(':')[0].trim()
        }
        // Use span type to create a descriptive name
        const typeNames: Record<string, string> = {
            [AISpanType.MODEL_STEP]: 'model-generation',
            [AISpanType.MODEL_CHUNK]: 'model-generation',
            [AISpanType.MODEL_GENERATION]: 'model-generation',
            [AISpanType.AGENT_RUN]: 'agent-run',
            [AISpanType.TOOL_CALL]: 'tool-execution',
            [AISpanType.MCP_TOOL_CALL]: 'mcp-tool',
            [AISpanType.WORKFLOW_RUN]: 'workflow',
            [AISpanType.WORKFLOW_STEP]: 'workflow',
        }
        return typeNames[span.type] ?? `trace-${span.traceId.slice(0, 8)}`
    }

    protected override async _exportEvent(event: AITracingEvent): Promise<void> {
        const span = event.exportedSpan

        // Ensure trace exists before processing child spans to prevent "No trace data found" warnings
        // This handles cases where child spans arrive before or without their root span due to async timing
        if (!span.isRootSpan) {
            this.ensureTraceExists(span)
        }

        this.customLogger.debug('Exporting event', { 
            type: event.type, 
            spanId: span.id,
            traceId: span.traceId,
            spanType: span.type,
            spanName: span.name,
            isRootSpan: span.isRootSpan,
            isEvent: span.isEvent,
            parentSpanId: span.parentSpanId,
            startTime: span.startTime,
            endTime: span.endTime,
            input: span.input,
            output: span.output,
            metadata: span.metadata,
            errorInfo: span.errorInfo,
        })

        switch (event.type) {
            case AITracingEventType.SPAN_STARTED:
                this.customLogger.debug('Span started', { spanName: span.name })
                break
            case AITracingEventType.SPAN_ENDED:
                this.customLogger.debug('Span ended', { spanName: span.name })
                break
            case AITracingEventType.SPAN_UPDATED:
                this.customLogger.debug('Span updated', { spanName: span.name })
                break
        }

        switch (span.type) {
            case AISpanType.AGENT_RUN: {
                const attrs = span.attributes as AgentRunAttributes | undefined
                this.customLogger.debug('Agent run', { 
                    agentId: attrs?.agentId,
                    instructions: attrs?.instructions,
                    prompt: attrs?.prompt,
                    maxSteps: attrs?.maxSteps,
                    availableTools: attrs?.availableTools,
                })
                break
            }
            case AISpanType.MODEL_GENERATION: {
                const attrs = span.attributes as ModelGenerationAttributes | undefined
                this.customLogger.debug('Model generation', { 
                    model: attrs?.model,
                    provider: attrs?.provider,
                    resultType: attrs?.resultType,
                    usage: attrs?.usage,
                    parameters: attrs?.parameters,
                    streaming: attrs?.streaming,
                    finishReason: attrs?.finishReason,
                })
                break
            }
            case AISpanType.MODEL_STEP: {
                const attrs = span.attributes as ModelStepAttributes | undefined
                this.customLogger.debug('Model step', { 
                    stepIndex: attrs?.stepIndex,
                    usage: attrs?.usage,
                    finishReason: attrs?.finishReason,
                    isContinued: attrs?.isContinued,
                    warnings: attrs?.warnings,
                })
                break
            }
            case AISpanType.MODEL_CHUNK: {
                const attrs = span.attributes as ModelChunkAttributes | undefined
                this.customLogger.debug('Model chunk', { 
                    chunkType: attrs?.chunkType,
                    sequenceNumber: attrs?.sequenceNumber,
                })
                break
            }
            case AISpanType.TOOL_CALL: {
                const attrs = span.attributes as ToolCallAttributes | undefined
                this.customLogger.debug('Tool call', { 
                    toolId: attrs?.toolId,
                    toolType: attrs?.toolType,
                    toolDescription: attrs?.toolDescription,
                    success: attrs?.success,
                })
                break
            }
            case AISpanType.MCP_TOOL_CALL: {
                const attrs = span.attributes as MCPToolCallAttributes | undefined
                this.customLogger.debug('MCP tool call', { 
                    toolId: attrs?.toolId,
                    mcpServer: attrs?.mcpServer,
                    serverVersion: attrs?.serverVersion,
                    success: attrs?.success,
                })
                break
            }
            case AISpanType.PROCESSOR_RUN: {
                const attrs = span.attributes as ProcessorRunAttributes | undefined
                this.customLogger.debug('Processor run', { 
                    processorName: attrs?.processorName,
                    processorType: attrs?.processorType,
                    processorIndex: attrs?.processorIndex,
                })
                break
            }
            case AISpanType.WORKFLOW_RUN: {
                const attrs = span.attributes as WorkflowRunAttributes | undefined
                this.customLogger.debug('Workflow run', { 
                    workflowId: attrs?.workflowId,
                    status: attrs?.status,
                })
                break
            }
            case AISpanType.WORKFLOW_STEP: {
                const attrs = span.attributes as WorkflowStepAttributes | undefined
                this.customLogger.debug('Workflow step', { 
                    stepId: attrs?.stepId,
                    status: attrs?.status,
                })
                break
            }
            case AISpanType.WORKFLOW_CONDITIONAL: {
                const attrs = span.attributes as WorkflowConditionalAttributes | undefined
                this.customLogger.debug('Workflow conditional', { 
                    conditionCount: attrs?.conditionCount,
                    truthyIndexes: attrs?.truthyIndexes,
                    selectedSteps: attrs?.selectedSteps,
                })
                break
            }
            case AISpanType.WORKFLOW_CONDITIONAL_EVAL: {
                const attrs = span.attributes as WorkflowConditionalEvalAttributes | undefined
                this.customLogger.debug('Workflow conditional eval', { 
                    conditionIndex: attrs?.conditionIndex,
                    result: attrs?.result,
                })
                break
            }
            case AISpanType.WORKFLOW_PARALLEL: {
                const attrs = span.attributes as WorkflowParallelAttributes | undefined
                this.customLogger.debug('Workflow parallel', { 
                    branchCount: attrs?.branchCount,
                    parallelSteps: attrs?.parallelSteps,
                })
                break
            }
            case AISpanType.WORKFLOW_LOOP: {
                const attrs = span.attributes as WorkflowLoopAttributes | undefined
                this.customLogger.debug('Workflow loop', { 
                    loopType: attrs?.loopType,
                    iteration: attrs?.iteration,
                    totalIterations: attrs?.totalIterations,
                    concurrency: attrs?.concurrency,
                })
                break
            }
            case AISpanType.WORKFLOW_SLEEP: {
                const attrs = span.attributes as WorkflowSleepAttributes | undefined
                this.customLogger.debug('Workflow sleep', { 
                    durationMs: attrs?.durationMs,
                    untilDate: attrs?.untilDate,
                    sleepType: attrs?.sleepType,
                })
                break
            }
            case AISpanType.WORKFLOW_WAIT_EVENT: {
                const attrs = span.attributes as WorkflowWaitEventAttributes | undefined
                this.customLogger.debug('Workflow wait event', { 
                    eventName: attrs?.eventName,
                    timeoutMs: attrs?.timeoutMs,
                    eventReceived: attrs?.eventReceived,
                    waitDurationMs: attrs?.waitDurationMs,
                })
                break
            }
            case AISpanType.GENERIC:
            default:
                break
        }

        return super._exportEvent(event)
    }
}

