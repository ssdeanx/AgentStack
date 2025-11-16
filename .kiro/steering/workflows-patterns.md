# Workflows Implementation Patterns

## Workflow Structure

Workflows are created using `createWorkflow()` from `@mastra/core/workflows`:

```typescript
const myWorkflow = createWorkflow({
  id: 'workflow-id',
  inputSchema: z.object({
    // Input schema
  }),
  outputSchema: z.object({
    // Output schema
  }),
})
  .then(step1)
  .then(step2)

myWorkflow.commit()
export { myWorkflow }
```

## Steps

Steps are created using `createStep()`:

```typescript
const myStep = createStep({
  id: 'step-id',
  description: 'What this step does',
  inputSchema: z.object({
    // Input schema
  }),
  outputSchema: z.object({
    // Output schema
  }),
  execute: async ({ inputData, mastra }) => {
    // Implementation
    return outputData
  },
})
```

## Key Patterns from Codebase

### Step Execution
- `inputData` contains validated input from previous step or workflow input
- `mastra` provides access to agents and other resources
- Must return data matching `outputSchema`

### Chaining Steps
- Use `.then()` to chain steps sequentially
- Output of one step becomes input to next
- Example from weather-workflow:
  ```typescript
  weatherWorkflow
    .then(fetchWeather)
    .then(planActivities)
  ```

### Accessing Agents
- Get agent from mastra: `const agent = mastra?.getAgent('agentName')`
- Call agent methods like `.stream()` for streaming responses
- Example: streaming weather activity suggestions

### Schema Validation
- Use Zod for all input/output schemas
- Schemas are validated automatically
- Define reusable schemas at module level

### Error Handling
- Throw descriptive errors in steps
- Errors propagate through workflow
- Include context in error messages

## File Naming
- Use descriptive names: `weather-workflow.ts`, `analysis-workflow.ts`
- Suffix with `-workflow.ts`

## Location
- All workflows go in `src/mastra/workflows/`
- Each workflow typically in its own file

## Execution
- Workflows are committed before export
- Can be triggered from agents or directly
- Support streaming and async execution
