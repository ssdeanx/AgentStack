import { MCPServer } from '@mastra/mcp'
import { a2aCoordinatorAgent } from '../a2a/a2aCoordinatorAgent'
import type {
  MCPServerResourceContent,
  MCPServerResources,
  Resource,
  ResourceTemplate,
} from "@mastra/mcp";
//import http from "http";
import { log } from '../config/logger';

/**
 * A2A Coordinator MCP Server
 * Represents an MCP server exposing the A2A Coordinator Agent for multi-agent orchestration.
 */
// Resources/resource templates will generally be dynamically fetched.
// FIXME: Use the actual resources needed for the MCP server.
// Configured here as placeholders. @Copilot
// Could be used for workflow definitions, agent metadata, etc. with proper URIs. using json, also agent cards. but this is just an example. we can expand later. with prompts.


/**
 * A2A Coordinator MCP Server
 *
 * Exposes the a2aCoordinatorAgent as an MCP server with:
 * - Agent card for A2A discovery
 * - Prompts for common coordination tasks
 * - Resources for workflow and agent metadata
 */

// Prompts for common coordination workflows
const coordinationPrompts = [
  {
    name: 'parallel-financial-analysis',
    description: 'Run parallel financial analysis across crypto and stock agents',
    version: '1.0.0',
  },
  {
    name: 'content-pipeline',
    description: 'Content creation pipeline: research → write → edit → evaluate',
    version: '1.0.0',
  },
  {
    name: 'rag-query',
    description: 'Execute RAG query: retrieve → rerank → answer → verify',
    version: '1.0.0',
  },
  {
    name: 'multi-agent-research',
    description: 'Coordinate multi-agent research with knowledge extraction',
    version: '1.0.0',
  },
]

// Resources for agent and workflow metadata
const agentResources = [
  {
    uri: 'agents://a2aCoordinator/metadata',
    name: 'A2A Coordinator Agent Metadata',
    mimeType: 'application/json',
    description: 'Metadata about the A2A Coordinator Agent including capabilities',
  },
  {
    uri: 'workflows://available',
    name: 'Available Workflows',
    mimeType: 'application/json',
    description: 'List of all available workflows for coordination',
  },
  {
    uri: 'agents://available',
    name: 'Available Agents',
    mimeType: 'application/json',
    description: 'List of all available agents for coordination',
  },
]
//const httpServer = http.createServer(async (req, res) => {
//  await a2aCoordinatorMcpServer.startHTTP({
//    url: new URL(req.url ?? '', `http://localhost:6969`),
//    httpPath: `/mcp`,
//    req,
//    res,
//    options: {
//      sessionIdGenerator:  () => `session-${Date.now()}`,
//      enableJsonResponse: true,
//      allowedHosts: ['*'],
//      allowedOrigins: ['http://localhost:3000', 'http://localhost:4111', '*'],
//    },
//  });
//});

//httpServer.listen(6969, () => {
//  log.info(`HTTP server listening on http://localhost:6969`);
//});

export const a2aCoordinatorMcpServer = new MCPServer({
  id: 'a2a-coordinator-mcp',
  name: 'A2A Coordinator MCP Server',
  version: '1.0.0',
  description: 'Exposes the A2A Coordinator Agent for multi-agent orchestration via MCP and A2A protocols',
//  repository: {url: 'https://github.com/ssdeanx/secure-rag-multi-agent', source: 'github', id: 'secure-rag-multi-agent'},
  releaseDate: '2025-10-18',
  isLatest: true,
  packageCanonical: 'npm',
  packages: [],
//  remotes: [{url:'http://localhost:6969', transport_type: 'http'}],
  tools: {}, // Tools are auto-generated from agents

  agents: {
    a2aCoordinator: a2aCoordinatorAgent,
  },
//  resources: {},
  prompts: {
    listPrompts: async () => coordinationPrompts,
    getPromptMessages: async ({ name, version, args }) => {
      let prompt = coordinationPrompts.find((p) => p.name === name && p.version === version)

      prompt ??= coordinationPrompts.find((p) => p.name === name);

      if (!prompt) {
        throw new Error(`Prompt "${name}" not found`)
      }

      const promptMessages: Record<
        string,
        Array<{
          role: 'user' | 'assistant'
          content: { type: 'text'; text: string }
        }>
      > = {
        'parallel-financial-analysis': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute parallel financial analysis: Analyze ${args?.ticker ?? 'AAPL'} stock and Bitcoin cryptocurrency in parallel, then synthesize results into a comprehensive report.`,
            },
          },
        ],
        'content-pipeline': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute content pipeline for topic "${args?.topic ?? 'AI Agents'}": Research the topic, create engaging content, edit for quality, and evaluate completeness.`,
            },
          },
        ],
        'rag-query': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute RAG query: "${args?.query ?? 'What are agent capabilities?'}". Retrieve documents, rerank by relevance, generate answer, and verify accuracy.`,
            },
          },
        ],
        'multi-agent-research': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Coordinate multi-agent research on "${args?.topic ?? 'emerging technologies'}": Research comprehensively, extract key learnings, and generate a detailed report.`,
            },
          },
        ],
      }

      // Use hasOwnProperty to check presence because the index signature types
      // promptMessages[name] as an array (which would be truthy), so a direct
      // boolean check is unreliable for existence.
      if (Object.prototype.hasOwnProperty.call(promptMessages, name)) {
        return promptMessages[name]
      }

      return [
        {
          role: 'user',
          content: { type: 'text', text: `Execute coordination task: ${args?.task ?? 'coordinate agents'}` },
        },
      ]
    },
  },
})
