# Tool Lifecycle Hooks

Tools support lifecycle hooks that allow you to monitor and react to different stages of tool execution. These hooks are particularly useful for logging, analytics, validation, and real-time updates during streaming.

## Available Hooks

### onInputStart

Called when tool call input streaming begins, before any input data is received.

```typescript
export const tool = createTool({
    id: 'example-tool',
    description: 'Example tool with hooks',
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        console.log(`Tool ${toolCallId} input streaming started`)
    },
})
```

### onInputDelta

Called for each incremental chunk of input text as it streams in. Useful for showing real-time progress or parsing partial JSON.

```typescript
export const tool = createTool({
    id: 'example-tool',
    description: 'Example tool with hooks',
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        console.log(`Received input chunk: ${inputTextDelta}`)
    },
})
```

### onInputAvailable

Called when the complete tool input is available and has been parsed and validated against the inputSchema.

```typescript
export const tool = createTool({
    id: 'example-tool',
    description: 'Example tool with hooks',
    inputSchema: z.object({
        city: z.string(),
    }),
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        console.log(`Tool received complete input:`, input)
        // input is fully typed based on inputSchema
    },
})
```

### onOutput

Called after the tool has successfully executed and returned output. Useful for logging results, triggering follow-up actions, or analytics.

```typescript
export const tool = createTool({
    id: 'example-tool',
    description: 'Example tool with hooks',
    outputSchema: z.object({
        result: z.string(),
    }),
    execute: async (input) => {
        return { result: 'Success' }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        console.log(`${toolName} execution completed:`, output)
        // output is fully typed based on outputSchema
    },
})
```

## Hook Execution Order

For a typical streaming tool call, the hooks are invoked in this order:

1. onInputStart - Input streaming begins
2. onInputDelta - Called multiple times as chunks arrive
3. onInputAvailable - Complete input is parsed and validated
4. Tool's execute function runs
5. onOutput - Tool has completed successfully

## Hook Parameters

All hooks receive a parameter object with these common properties:

toolCallId (string): Unique identifier for this specific tool call
abortSignal (AbortSignal): Signal for detecting if the operation should be cancelled
Additionally:

- onInputStart, onInputDelta, and onInputAvailable receive messages (array): The conversation messages at the time of the tool call
- onInputDelta receives inputTextDelta (string): The incremental text chunk
- onInputAvailable receives input: The validated input data (typed according to inputSchema)
- onOutput receives output: The tool's return value (typed according to outputSchema) and toolName (string): The name of the tool

## Error Handling

Hook errors are caught and logged automatically, but do not prevent tool execution from continuing. If a hook throws an error, it will be logged to the console but will not fail the tool call.
