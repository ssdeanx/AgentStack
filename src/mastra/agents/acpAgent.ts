import { Agent } from '@mastra/core/agent'

import { arxivTool } from '../tools/arxiv.tool'
import { csvToJsonTool } from '../tools/csv-to-json.tool'
import { libsqlChunker} from '../tools/document-chunking.tool'
import { evaluateResultTool } from '../tools/evaluateResultTool'
import { extractLearningsTool } from '../tools/extractLearningsTool'
import {
    getFileContent,
    getRepositoryInfo,
    listRepositories,
    searchCode,
} from '../tools/github'
import { jsonToCsvTool } from '../tools/json-to-csv.tool'
import type { GoogleLanguageModelOptions } from '@ai-sdk/google'
import type { RequestContext } from '@mastra/core/request-context'

import { InternalSpans } from '@mastra/core/observability'
import type { AgentRequestContext } from './request-context'
import { fetchTool } from '../tools'
import { libsqlgraphQueryTool, LibsqlMemory, libsqlQueryTool } from '../config/libsql'

export type ACPContext = AgentRequestContext<{
    userRole?: string
}>

export const acpAgent = new Agent({
    id: 'acpAgent',
    name: 'ACP Agent',
    description: 'A ACP assistant that can help manage ACP-related tasks',
    instructions: ({
        requestContext,
    }: {
        requestContext: RequestContext<ACPContext>
    }) => {
        const userId = requestContext.get('userId') ?? 'anonymous'
        const roleConstraint = requestContext.get('userRole') ?? 'user'

        return {
            role: 'system',
            content: `
# ACP Agent
User: ${userId} | Role: ${roleConstraint}

## Core Responsibilities
- **Manage Tasks**: Create, update, and track ACP-related tasks.
- **Data Ops**: Ingest (CSV, PDF, Web, Repo), transform (Excalidraw, JSON), and export data.
- **Persistence**: 

## Process
1. **Plan**: Outline 1-3 steps with tool rationale.
2. **Execute**: Small steps; validate results.
3. **Report**: Structured results; persist to 'acp_tasks' collection.

## Rules
- **Tool Efficiency**: Do NOT use the same tool repetitively or back-to-back for the same query.
- **Security**: Mask PII; no secrets in logs; confirm destructive 'execaTool' calls.
- **Validation**: Read before mutate; validate web scraping rules.
`,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        includeThoughts: true,
                        thinkingLevel: 'medium',
                    },
                    responseModalities: ['TEXT'],
                } satisfies GoogleLanguageModelOptions,
            },
        }
    },
    model: "google/gemini-3.1-flash-lite-preview",
    memory: LibsqlMemory,
    tools: {
        libsqlQueryTool,
        libsqlChunker,
        libsqlgraphQueryTool,
        fetchTool,
        evaluateResultTool,
        extractLearningsTool,
        arxivTool,
        jsonToCsvTool,
        csvToJsonTool,
        //  convertDataFormatTool,
        searchCode,
        getFileContent,
        getRepositoryInfo,
        listRepositories,
        //	...supermemoryTools(process.env.SUPERMEMORY_API_KEY ?? '', {
        //		containerTags: ['acp-agent']
        //	}),
    },
   // outputProcessors: [new TokenLimiterProcessor(128576)],
    workflows: {},
    scorers: {},
    options: {
        tracingPolicy: {
            internal: InternalSpans.AGENT,
        },
    },
 //   defaultOptions: {
//        autoResumeSuspendedTools: true,
//    },
})
