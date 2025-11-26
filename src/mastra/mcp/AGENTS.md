<!-- AGENTS-META {"title":"Mastra MCP Server","version":"2.0.0","applies_to":"/src/mastra/mcp","last_updated":"2025-11-26T00:00:00Z","status":"stable"} -->

# MCP Server (`/src/mastra/mcp`)

## Persona

MCP Engineer — objective: Expose Mastra capabilities via Model Context Protocol for external AI clients.

## Purpose

This directory contains the MCP (Model Context Protocol) server that exposes A2A (Agent-to-Agent) coordination and tool access to external MCP clients like Cursor, Windsurf, or Claude Desktop.

## Key Files

| File              | Export                    | Purpose                                      |
| ----------------- | ------------------------- | -------------------------------------------- |
| `index.ts`        | `a2aCoordinatorMcpServer` | Main MCP server configuration and export     |
| `server.ts`       | `notes`                   | Notes MCP server for persistent notes        |
| `mcp-client.ts`   | MCP client utilities      | Client-side MCP connection helpers           |
| `prompts.ts`      | Prompt templates          | Reusable prompts for MCP interactions        |
| `resources.ts`    | Resource definitions      | MCP resource metadata and schemas            |

## Available MCP Tools

### `coordinate_a2a_task`
Coordinate complex tasks across multiple specialized agents using the A2A protocol.

**Parameters:**
- `task` (string): The complex task to coordinate across agents
- `taskType` (enum): Type of task - "financial", "content", "rag", "report", "coordination"
- `workflow` (enum): How to orchestrate - "sequential", "parallel", "conditional"
- `priority` (enum): Task priority - "low", "medium", "high", "urgent"

### `list_a2a_agents`
Get a list of all available agents that can be coordinated.

**Returns:** Array of 25+ agents with their names and descriptions.

### `create_a2a_workflow`
Create a custom workflow for multi-agent coordination.

**Parameters:**
- `workflowName` (string): Name for the custom workflow
- `agents` (array): List of agent names to include
- `workflowType` (enum): How agents work together
- `description` (string, optional): Workflow description

### `ask_a2aCoordinator`
Direct access to the A2A coordinator agent for complex coordination tasks.

## Starting the Server

```bash
npm run mcp-server
```

This starts the MCP server with stdio transport.

## Integration with Mastra

The MCP server is registered in `src/mastra/index.ts`:

```typescript
mcpServers: { a2aCoordinator: a2aCoordinatorMcpServer, notes }
```

## Coordinated Agents

The MCP server can coordinate:
- **Research**: researchAgent, researchPaperAgent
- **Financial**: stockAnalysisAgent
- **Content**: copywriterAgent, editorAgent, scriptWriterAgent
- **Data**: dataExportAgent, dataIngestionAgent, dataTransformationAgent
- **Document**: documentProcessingAgent, knowledgeIndexingAgent
- **Report**: reportAgent
- **Networks**: agentNetwork, dataPipelineNetwork, reportGenerationNetwork, researchPipelineNetwork

---
## Change Log

| Version | Date (UTC) | Changes                                           |
| ------- | ---------- | ------------------------------------------------- |
| 2.0.0   | 2025-11-26 | Major update: documented 25+ coordinated agents   |
| 1.0.0   | 2025-11-14 | Initial MCP server implementation                 |