# OpenTelemetry Semantic Conventions

## Span Naming

• LLM Operations: `chat {model}`
• Tool Execution: `execute_tool {tool_name}`
• Agent Runs: `invoke_agent {agent_id}`
• Workflow Runs: `invoke_workflow {workflow_id}`

## Key Attributes

• `gen_ai.operation.name` - Operation type (chat, tool.execute, etc.)
• `gen_ai.provider.name` - AI provider (openai, anthropic, etc.)
• `gen_ai.request.model` - Model identifier
• `gen_ai.input.messages` - Chat history provided to the model
• `gen_ai.output.messages` - Messages returned by the model
• `gen_ai.usage.input_tokens` - Number of input tokens
• `gen_ai.usage.output_tokens` - Number of output tokens
• `gen_ai.request.temperature` - Sampling temperature
• `gen_ai.response.finish_reasons` - Completion reasons

### Tool-specific attributes (recommended)

When instrumenting tool execution (SpanType.TOOL_CALL), include the following attributes to make traces actionable and measurable:

• `tool.id` - Tool identifier (e.g., `chartjs-generator`)
• `tool.input.dataCount` - Numeric size of the input (rows, points, documents)
• `tool.input.indicatorsCount` - Example: number of indicators requested for chart tool
• `tool.output.labels` - Example: number of labels produced (visualization size)
• `tool.output.datasetCount` - Number of datasets produced
• `tool.duration_ms` - Duration of the tool execution (ms)
• `tool.success` - boolean (true/false)
• `tool.error` - Error message or code when `tool.success` is false

These attributes should be added to the TOOL_CALL span's `metadata` or `attributes` so they appear in trace exporters and dashboards.

The exporter follows [OpenTelemetry Semantic Conventions for GenAI v1.38.0](https://github.com/open-telemetry/semantic-conventions/tree/v1.38.0/docs/gen-ai), ensuring compatibility with observability platforms.