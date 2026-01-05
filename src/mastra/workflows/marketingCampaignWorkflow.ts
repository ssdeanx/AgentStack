import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

const planningStep = createStep({
    id: 'campaign-planning',
    description: 'Plan the marketing campaign strategy',
    inputSchema: z.object({
        topic: z.string().describe('Campaign topic'),
        targetAudience: z.string().describe('Target audience'),
    }),
    outputSchema: z.object({
        plan: z.string(),
    }),
    execute: async ({ inputData }) => {
        return {
            plan: `Campaign plan for ${inputData.topic} targeting ${inputData.targetAudience}`,
        }
    },
})

const contentStep = createStep({
    id: 'content-creation',
    description: 'Create campaign content',
    inputSchema: z.object({
        plan: z.string(),
    }),
    outputSchema: z.object({
        content: z.string(),
    }),
    execute: async ({ inputData }) => {
        return {
            content: `Content based on: ${inputData.plan}`,
        }
    },
})

export const marketingCampaignWorkflow = createWorkflow({
    id: 'marketing-campaign-workflow',
    description: 'Simple marketing campaign workflow',
    inputSchema: z.object({
        topic: z.string().describe('Campaign topic'),
        targetAudience: z.string().describe('Target audience'),
    }),
    outputSchema: z.object({
        content: z.string(),
    }),
})
    .then(planningStep)
    .then(contentStep)

marketingCampaignWorkflow.commit()
