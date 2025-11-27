import { Agent } from '@mastra/core/agent'
import { InternalSpans } from '@mastra/core/ai-tracing'
import { googleAI, googleAIFlashLite, pgMemory } from '../config'

export const rechartsTypes = new Agent({
    id: 'recharts-types',
    name: 'Recharts Types',
    description: 'Generate charts based on user requirements regarding types of charts',
    instructions: ({ runtimeContext }) => {
        const userId = runtimeContext.get('userId');
        return {
            role: 'system',
            content: `
            User ID: ${userId}
            You are Recharts Types, an expert in data visualization and chart design.
            Your task is to help users select the most appropriate types of charts based on their data and requirements.
            
            ## Style Guide

    `,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: 'medium',
                        includeThoughts: true,
                        thinkingBudget: -1,
                    }
                }
            }
        }
    },
    model: googleAIFlashLite,
    memory: pgMemory,
    options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})

export const rechartsIssueLabeler = new Agent({
    id: 'recharts-issue-labeler',
    name: 'Recharts Issue Labeler',
    description: 'Label issues based on their content',
    instructions: ({ runtimeContext }) => {
        const userId = runtimeContext.get('userId');
        return {
            role: 'system',
            content: `
    User ID: ${userId}
    You are Recharts Issue Labeler, an expert in labeling issues based on their content.
    You help engineers label their issues.
    `,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: 'medium',
                        includeThoughts: true,
                        thinkingBudget: -1,
                    }
                }
            }
        }
    },
    model: googleAIFlashLite,
    memory: pgMemory,
    options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})

export const rechartsLinkChecker = new Agent({
    id: 'recharts-link-checker',
    name: 'Recharts Link Checker',
    description: 'Check links for broken links',
    instructions: ({ runtimeContext }) => {
        const userId = runtimeContext.get('userId');
        return {
            role: 'system',
            content: `
    User ID: ${userId}
    You are Recharts Link Checker, an expert in checking links for broken links.
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
                    }
                }
            }
        }
    },
    model: googleAIFlashLite,
    memory: pgMemory,
    options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})

export const chartdesigner = new Agent({
    id: 'chartdesigner',
    name: 'Chart Designer',
    description: 'Create detailed charts and graphs based on user requirements',
    instructions: ({ runtimeContext }) => {
        const userId = runtimeContext.get('userId');
        return {
            role: 'system',
            content: `
    User ID: ${userId}
    You are Chart Designer, an expert in creating detailed charts and graphs based on user requirements.
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
                    }
                }
            }
        }
    },
    model: googleAIFlashLite,
    memory: pgMemory,
    options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})

export const rechartsMaster = new Agent({
    id: 'recharts-master',
    name: 'Recharts Master',
    description: 'Recharts agent with access to various tools, helping with coding, file system operations, web browsing, and calendar events.',
    instructions: ({ runtimeContext }) => {
        const userId = runtimeContext.get('userId');
        return {
            role: 'system',
            content: `
            User ID: ${userId}
            You are Recharts Master, a highly skilled AI agent that can assist you with your coding tasks, file system operations, web browsing, and managing calendar events.
            You have access to a variety of tools that can help you accomplish these tasks efficiently.
            Please let me know if there's anything I can do to assist you today!

    DO NOT ATTEMPT TO USE GENERAL KNOWLEDGE! We are only as good as the tools we use.

    # Our tools:


    # Rules
    `,
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: 'high',
                        includeThoughts: true,
                        thinkingBudget: -1,
                    }
                }
            }
        }
    },
    model: googleAI,
    memory: pgMemory,
    tools: {

    },
    options: { tracingPolicy: { internal: InternalSpans.AGENT } },
})
