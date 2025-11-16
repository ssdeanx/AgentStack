<!-- AGENTS-META {"title":"Mastra Agents","version":"1.1.0","applies_to":"/src/mastra/agents","last_updated":"2025-11-16T01:50:00Z","status":"stable"} -->

# Agents (`/src/mastra/agents`)

## Persona

Agent Developer — objective: Implement higher-level behaviors by composing tools into responsible, auditable agents.

## Purpose

This directory contains agent definitions that map use-case intents to sequences of tool invocations, policies, and memory usage.

## Current Agents

| File | Export | Agent ID | Purpose | Dependencies |
|------|--------|----------|----------|--------------|
| `a2aCoordinatorAgent.ts` | `a2aCoordinatorAgent` | `a2aCoordinator` | Orchestrates and routes tasks across multiple specialized agents | Core Mastra, Agent Registry |
| `weather-agent.ts` | `weatherAgent` | - | Fetches weather data and suggests activities | `weatherTool`, Web Scraping Tools |
| `csv_to_excalidraw.ts` | `csvToExcalidrawAgent` | `csvToExcalidrawAgent` | Converts CSV data to Excalidraw diagrams | Data Processing Tools |
| `image_to_csv.ts` | `imageToCsvAgent` | `imageToCsvAgent` | Extracts tabular data from images | Image Processing, OCR Tools |
| `excalidraw_validator.ts` | `excalidrawValidatorAgent` | `excalidrawValidatorAgent` | Validates and fixes Excalidraw diagrams | Data Validation Tools |
| `reportAgent.ts` | `reportAgent` | - | Generates reports from processed data | Data Processing, Templating |
| `learningExtractionAgent.ts` | `learningExtractionAgent` | - | Extracts and processes learning data | NLP, Text Processing |
| `evaluationAgent.ts` | `evaluationAgent` | - | Evaluates and scores agent performance | Evaluation Metrics |
| `researchAgent.ts` | `researchAgent` | `research` | Conducts research using web search and analysis tools | Web Scraping, Search APIs |
| `editorAgent.ts` | `editorAgent` | - | Manages document editing workflows | Content Processing |
| `copywriterAgent.ts` | `copywriterAgent` | - | Handles content writing and generation | NLP, Content Generation |

## Agent Development

### How to Add a New Agent

1. **Create Agent File**
   - Create `src/mastra/agents/your-agent-name.ts`
   - Follow the pattern from existing agents

   ```typescript
   import { Agent } from '@mastra/core/agent'

   export const yourAgent = new Agent({
     id: 'your-agent-id',
     name: 'Your Agent Name',
     description: 'Brief description of what this agent does',
     // ... other configurations
   })
   ```

2. **Register the Agent**
   - Add your agent to `src/mastra/index.ts` in the agents object

   ```typescript
   export const mastra = new Mastra({
     agents: {
       // ... other agents
       yourAgent
     },
     // ... rest of config
   })
   ```

3. **Add Tests**
   - Create tests in `src/mastra/__tests__/agents/your-agent.test.ts`
   - Test both success and error cases

## Best Practices

- **Single Responsibility**: Each agent should have one clear purpose
- **Tool Usage**: Use existing tools from `src/mastra/tools` when possible
- **Error Handling**: Implement proper error handling and validation
- **Logging**: Use the provided logger for consistent logging
- **Testing**: Write unit tests for all agent functionality
- **Documentation**: Document your agent's purpose, inputs, and outputs

## Execution & Testing

Run tests:

```bash
# Run all agent tests
npm test src/mastra/__tests__/agents/

# Run a specific agent's tests
npm test src/mastra/__tests__/agents/your-agent.test.ts
```

## Dependencies

- `@mastra/core`: Core agent framework
- Various tools from `src/mastra/tools`
- Configuration from `src/mastra/config`

## Related Documentation

- [Tools Documentation](../tools/AGENTS.md)
- [Configuration Guide](../config/README.md)
- [Mastra Core Documentation](https://docs.mastra.ai/core/agents)

## Change Log

| Version | Date (UTC) | Changes |
|---------|------------|---------|
| 1.1.0   | 2025-11-16 | Complete reorganization of agents documentation. Added detailed sections for each agent, development guidelines, and best practices. |
| 1.0.0   | 2025-11-15 | Initial version with core agents for web scraping, data processing, and API integrations. |
