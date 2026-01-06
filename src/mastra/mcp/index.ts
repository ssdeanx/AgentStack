import { MCPServer } from '@mastra/mcp'
import { a2aCoordinatorAgent } from '../a2a/a2aCoordinatorAgent'
import { codingA2ACoordinator } from '../a2a/codingA2ACoordinator'
import { knowledgeIndexingAgent } from '../agents/knowledgeIndexingAgent'
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
  {
    name: 'coding-feature-development',
    description: 'Full feature development: architecture → implementation → review → testing',
    version: '1.0.0',
  },
  {
    name: 'safe-refactoring',
    description: 'Safe code modernization with sandbox verification',
    version: '1.0.0',
  },
  {
    name: 'knowledge-indexing',
    description: 'Process documents or codebases into vector store for RAG',
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
    codingCoordinator: codingA2ACoordinator,
    knowledgeIndexing: knowledgeIndexingAgent,
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
        'coding-feature-development': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute full feature development for "${args?.feature ?? 'new API endpoint'}": Design the architecture, implement the changes, perform a security review, and generate verified tests in a sandbox.`,
            },
          },
        ],
        'safe-refactoring': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Perform safe refactoring of "${args?.path ?? 'src/services/user.service.ts'}": Identify code smells, propose improvements, verify behavior in an E2B sandbox, and apply changes locally.`,
            },
          },
        ],
        'knowledge-indexing': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Index the files in directory "${args?.directory ?? 'src'}": Read files, chunk content using recursive strategy, generate embeddings, and store in PgVector index "${args?.index ?? 'coding_context'}".`,
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

// Coding A2A Coordinator MCP Server
const codingPrompts = [
  {
    name: 'full-feature-development',
    description: 'Complete feature development: architecture → implementation → review → testing',
    version: '1.0.0',
  },
  {
    name: 'comprehensive-code-review',
    description: 'Multi-agent code review: architecture + quality + security + testing',
    version: '1.0.0',
  },
  {
    name: 'safe-refactoring-with-tests',
    description: 'Refactor code safely with sandbox verification and test generation',
    version: '1.0.0',
  },
  {
    name: 'sandbox-code-execution',
    description: 'Execute and test code in isolated E2B sandbox environment',
    version: '1.0.0',
  },
  {
    name: 'parallel-coding-analysis',
    description: 'Quick parallel analysis of code structure and issues',
    version: '1.0.0',
  },
]

export const codingA2AMcpServer = new MCPServer({
  id: 'coding-a2a-mcp',
  name: 'Coding A2A MCP Server',
  version: '1.0.0',
  description: 'Exposes the Coding A2A Coordinator for multi-agent coding workflows via MCP and A2A protocols',
  releaseDate: '2025-10-18',
  isLatest: true,
  packageCanonical: 'npm',
  packages: [],
  tools: {}, // Tools are auto-generated from agents

  agents: {
    codingA2ACoordinator,
  },
  prompts: {
    listPrompts: async () => codingPrompts,
    getPromptMessages: async ({ name, version, args }) => {
      let prompt = codingPrompts.find((p) => p.name === name && p.version === version)
      prompt ??= codingPrompts.find((p) => p.name === name);

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
        'full-feature-development': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute complete feature development for "${args?.feature ?? 'user authentication'}": Design architecture, implement changes, perform security review, and generate verified tests in sandbox.`,
            },
          },
        ],
        'comprehensive-code-review': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Perform comprehensive code review of "${args?.path ?? 'src/components/UserProfile.tsx'}": Analyze architecture, code quality, security, and generate test coverage recommendations.`,
            },
          },
        ],
        'safe-refactoring-with-tests': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute safe refactoring of "${args?.path ?? 'src/services/api.ts'}": Identify improvements, verify behavior in E2B sandbox, generate tests, and apply changes locally.`,
            },
          },
        ],
        'sandbox-code-execution': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Execute code in isolated sandbox: Create E2B environment, run "${args?.code ?? 'console.log("Hello World")'}", and verify output.`,
            },
          },
        ],
        'parallel-coding-analysis': [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Perform parallel coding analysis of "${args?.path ?? 'src'}": Analyze architecture, identify issues, and provide improvement recommendations.`,
            },
          },
        ],
      }

      if (Object.prototype.hasOwnProperty.call(promptMessages, name)) {
        return promptMessages[name]
      }

      return [
        {
          role: 'user',
          content: { type: 'text', text: `Execute coding coordination task: ${args?.task ?? 'coordinate coding agents'}` },
        },
      ]
    },
  },
})
