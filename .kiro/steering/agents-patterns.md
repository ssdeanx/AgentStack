# Agents Implementation Patterns

## Agent Structure

Agents are created using `new Agent()` from `@mastra/core/agent`:

```typescript
export const myAgent = new Agent({
  name: 'Agent Name',
  instructions: `Clear system instructions for the agent...`,
  model: modelInstance,
  tools: { tool1, tool2 },
  scorers: {
    scorerName: {
      scorer: scorerFunction,
      sampling: { type: 'ratio', rate: 1 },
    },
  },
  memory: new Memory({ storage: storageInstance }),
})
```

## Key Patterns from Codebase

### Instructions
- Write clear, detailed system prompts
- Include specific behaviors and response formats
- Example from weather-agent:
  - Specifies how to handle location names
  - Defines response format
  - Lists tool usage guidelines

### Tools
- Pass tools as object: `tools: { weatherTool, webScraperTool }`
- Agent can call any tool in the object
- Tools must be created with `createTool()`

### Model Selection
- Import model from config: `import { googleAIFlashLite } from '../config/google'`
- Available models in `src/mastra/config/`: google, openai, openrouter, vertex, anthropic

### Scorers
- Optional evaluation functions
- Define sampling strategy (ratio-based)
- Example: toolCallAppropriateness, completeness, translation

### Memory
- Use `Memory` with storage backend
- Example: `LibSQLStore` for local SQLite storage
- Stores conversation history and context

## File Naming
- Use descriptive names: `weather-agent.ts`, `copywriter-agent.ts`
- Suffix with `-agent.ts`

## Location
- All agents go in `src/mastra/agents/`
- Each agent typically in its own file

## Usage
- Agents are called with `.stream()` or similar methods
- Pass messages array with role and content
- Stream responses for real-time output
