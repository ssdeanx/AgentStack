# MCP (Model Context Protocol) Patterns

## MCP Server Structure

MCP servers expose agents, tools, resources, and prompts via the Model Context Protocol:

```typescript
import { MCPServer } from '@mastra/mcp'

export const myMcpServer = new MCPServer({
  id: 'my-mcp-server',
  name: 'My MCP Server',
  version: '1.0.0',
  description: 'Server description',
  
  // Expose agents
  agents: {
    myAgent: myAgent,
  },
  
  // Define resources
  resources: {
    listResources: async () => resourceList,
    getResourceContent: async ({ uri }) => content,
    resourceTemplates: async () => templates,
  },
  
  // Define prompts
  prompts: {
    listPrompts: async () => promptList,
    getPromptMessages: async ({ name, version, args }) => messages,
  },
})
```

## Resource Patterns

Resources use URI schemes for organization:

- `file://data/{id}.txt` - File resources
- `agents://{agentId}/metadata` - Agent metadata
- `workflows/{workflowId}/schema` - Workflow schemas
- `tools/{toolId}/schema` - Tool schemas
- `protocols://{protocolId}/metadata` - Protocol metadata

## Resource Templates

Define URI templates for dynamic resources:

```typescript
const myResourceTemplates: ResourceTemplate[] = [
  {
    uriTemplate: "agents://{agentId}/metadata",
    name: "Agent Metadata",
    description: "Metadata for a specific agent",
    mimeType: "application/json",
  },
]
```

## Prompt Patterns

Prompts provide pre-defined coordination workflows:

```typescript
const coordinationPrompts = [
  {
    name: 'parallel-financial-analysis',
    description: 'Run parallel financial analysis across crypto and stock agents',
    version: '1.0.0',
  },
]

// Prompt messages with argument substitution
getPromptMessages: async ({ name, version, args }) => {
  return [{
    role: 'user',
    content: {
      type: 'text',
      text: `Execute parallel financial analysis: Analyze ${args?.ticker ?? 'AAPL'}...`,
    },
  }]
}
```

## A2A (Agent-to-Agent) Coordination

The A2A Coordinator MCP server enables multi-agent orchestration:

- Exposes coordination agent via MCP
- Provides prompts for common workflows
- Resources for agent/workflow metadata
- Supports parallel and sequential orchestration

## MCP Server Registration

Register MCP servers in main Mastra configuration:

```typescript
export const mastra = new Mastra({
  agents: { ... },
  tools: { ... },
  mcpServers: {
    a2aCoordinator: a2aCoordinatorMcpServer
  },
})
```

## Starting MCP Server

MCP servers can run via stdio or HTTP transport:

```bash
npm run mcp-server  # Starts with stdio transport
```

## MCP Client Integration

MCP servers can be used by:

- Cursor IDE
- Windsurf
- Claude Desktop
- Custom MCP clients

## Available MCP Servers

Current MCP servers in the project:

- `a2aCoordinatorMcpServer` - Multi-agent coordination via A2A protocol
