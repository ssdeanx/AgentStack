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

The exporter follows [OpenTelemetry Semantic Conventions for GenAI v1.38.0](https://github.com/open-telemetry/semantic-conventions/tree/v1.38.0/docs/gen-ai), ensuring compatibility with observability platforms.