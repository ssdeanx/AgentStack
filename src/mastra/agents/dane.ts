import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { googleAIFlashLite, pgMemory } from '../config'
import { browserTool, googleSearch } from '../tools/browser-tool'
import { listEvents } from '../tools/calendar-tool'
import { execaTool } from '../tools/execa-tool'
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'

export const daneCommitMessage = new Agent({
  id: 'daneCommitMessage',
  name: 'Dane Commit Message',
  description: 'Generate commit messages for engineers',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, the ultimate GitHub operator.
    You help engineers generate commit messages.

    GENERATE A SCOPE FOR THE COMMIT MESSAGE IF NECESSARY.
    FIGURE OUT THE BEST TOP LEVEL SEMANTIC MATCH TO USE AS THE SCOPE.
    `,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'medium',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT', 'IMAGE'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})

export const daneIssueLabeler = new Agent({
  id: 'daneIssueLabeler',
  name: 'Dane Issue Labeler',
  description: 'Label issues based on their content',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, the ultimate GitHub operator.
    You help engineers label their issues.
    `,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'medium',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT', 'IMAGE'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})

export const daneLinkChecker = new Agent({
  id: 'daneLinkChecker',
  name: 'Dane Link Checker',
  description: 'Check links for broken links',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, the link checker for Mastra AI. You report on broken links whenever you see them.
    Make sure to include the url in the message.

    ## Style Guide
    - Use active voice
    - Keep descriptions concise but informative
    - Avoid marketing language
    - Link to relevant documentation
    `,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'low',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT', 'IMAGE'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})

export const daneChangeLog = new Agent({
  id: 'daneChangeLog',
  name: 'Dane Package Publisher',
  description: 'Publish packages to npm',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, the changelog writer for Mastra AI. Every week we need to write a changelog for the Mastra AI project.
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
            thinkingLevel: 'medium',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT', 'IMAGE'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})

export const dane = new Agent({
  id: 'dane',
  name: 'Dane',
  description: 'My personal assistant and best friend',
  instructions: ({ runtimeContext }) => {
    const userId = runtimeContext.get('userId');
    return {
      role: 'system',
      content: `
    You are Dane, my assistant and one of my best friends. We are an ace team!
    You help me with my code, write tests, and even deploy my code to the cloud!

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
    * DO NOT ATTEMPT TO USE GENERAL KNOWLEDGE. Use the 'googleSearch' tool to find the answer.
    * Don't reference tools when you communicate with the user. Do not mention what tools you are using.
    * Tell the user what you are doing.
    `,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'high',
            includeThoughts: true,
            thinkingBudget: -1,
          },
          responseModalities: ['TEXT', 'IMAGE'],
        } satisfies GoogleGenerativeAIProviderOptions,
      }
    }
  },
  model: googleAIFlashLite,
  memory: pgMemory,
  tools: {
    execaTool,
    browserTool,
    googleSearch,
    listEvents,
  },
  options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})
