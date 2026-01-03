import { Agent } from '@mastra/core/agent'
import { googleAIFlashLite, pgMemory } from '../config'
import { browserTool, googleSearch } from '../tools/browser-tool'
import { listEvents } from '../tools/calendar-tool'
import { execaTool } from '../tools/execa-tool'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'
import type { RequestContext } from '@mastra/core/request-context'
import { TokenLimiterProcessor } from '@mastra/core/processors'
import { webScraperTool } from '../tools'

export interface DaneContext {
    userId?: string
}

export const daneCommitMessage = new Agent({
  id: 'daneCommitMessage',
  name: 'Dane Commit Message',
  description: 'Generate commit messages for engineers',
  instructions: ({ requestContext }: { requestContext: RequestContext<DaneContext> }) => {
    const userId = requestContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, the ultimate GitHub operator.
    You help engineers generate commit messages.
    user: ${userId}

    GENERATE A SCOPE FOR THE COMMIT MESSAGE IF NECESSARY.
    FIGURE OUT THE BEST TOP LEVEL SEMANTIC MATCH TO USE AS THE SCOPE.
    `,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

export const daneIssueLabeler = new Agent({
  id: 'daneIssueLabeler',
  name: 'Dane Issue Labeler',
  description: 'Label issues based on their content',
  instructions: ({ requestContext }: { requestContext: RequestContext<DaneContext> }) => {
    const userId = requestContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, the ultimate GitHub operator.
    You help engineers label their issues.
    user: ${userId}
      `,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

export const daneLinkChecker = new Agent({
  id: 'daneLinkChecker',
  name: 'Dane Link Checker',
  description: 'Check links for broken links',
  instructions: ({ requestContext }: { requestContext: RequestContext<DaneContext> }) => {
    const userId = requestContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, the link checker for Mastra AI. You report on broken links whenever you see them.
    Make sure to include the url in the message.
    user: ${userId}
    ## Style Guide
    - Use active voice
    - Keep descriptions concise but informative
    - Avoid marketing language
    - Link to relevant documentation
    `,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

export const daneChangeLog = new Agent({
  id: 'daneChangeLog',
  name: 'Dane Package Publisher',
  description: 'Publish packages to npm',
  instructions: ({ requestContext }: { requestContext: RequestContext<DaneContext> }) => {
    const userId = requestContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, the changelog writer for Mastra AI. Every week we need to write a changelog for the Mastra AI project.
    user: ${userId}
    ## Style Guide
    - Use active voice
    - Lead with the change, not the PR number
    - Include PR numbers in parentheses at end of line
    - Keep descriptions concise but informative
    - Avoid marketing language
    - Link to relevant documentation
    - Use consistent formatting for code references
    `,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})

export const dane = new Agent({
  id: 'dane',
  name: 'Dane',
  description: 'My personal assistant and best friend',
  instructions: ({ requestContext }: { requestContext: RequestContext<DaneContext> }) => {
    const userId = requestContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, my assistant and one of my best friends. We are an ace team!
    You help me with my code, write tests, and even deploy my code to the cloud!
    user: ${userId}

    DO NOT ATTEMPT TO USE GENERAL KNOWLEDGE! We are only as good as the tools we use.

    # Our tools:

    ## readPDF
    Makes you a powerful agent capable of reading PDF files.

    ## fsTool
    Makes you a powerful agent capable of reading and writing files to the local filesystem.

    ## execaTool
    Makes you a powerful agent capabale of executing files on the local system.

    ## googleSearch
    Makes you a powerful agent capabale answering all questions by finding the answer on Google search.
    Pass the query as a JS object. If you have links, ALWAYS CITE YOUR SOURCES.

    ## browserTool
    Makes you a powerful agent capable of scraping the web. Pass the url as a JS object.

    ## listEvents
    Makes you a powerful agent capable of listing events on a calendar. When using this tool ONLY RETURN RELEVANT EVENTS.
    DO NOT ATTEMPT TO DO ANYTHING MORE.

    ## imageTool
    Makes you a powerful agent capable of generating images and saving them to disk. Pass the directory and an image prompt.

    # Rules
    * **Tool Efficiency:** Do NOT use the same tool repetitively or back-to-back for the same query.
    * DO NOT ATTEMPT TO USE GENERAL KNOWLEDGE. Use the 'googleSearch' tool to find the answer.
    * Don't reference tools when you communicate with the user. Do not mention what tools you are using.
    * Tell the user what you are doing.
    `,
      providerOptions: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: 'high',
          },
          responseModalities: ['TEXT'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: 'google/gemini-3-flash-preview',
  memory: pgMemory,
  tools: {
    execaTool,
    browserTool,
    webScraperTool,
    listEvents,
  },
  outputProcessors: [new TokenLimiterProcessor(1048576)]
})
