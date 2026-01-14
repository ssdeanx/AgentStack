import { createStep, createWorkflow } from '@mastra/core/workflows'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
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
    execute: async ({ inputData, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'campaign-planning',
            input: inputData,
            metadata: {
                'workflow.step': 'campaign-planning',
            },
            requestContext,
            mastra,
        })
        try {
            const result = {
                plan: `Campaign plan for ${inputData.topic} targeting ${inputData.targetAudience}`,
            }
            span?.update({ output: result })
            span?.end()
            return result
        } catch (error) {
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })
            throw error
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
    execute: async ({ inputData, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'content-creation',
            input: inputData,
            metadata: {
                'workflow.step': 'content-creation',
            },
            requestContext,
            mastra,
        })
        try {
            const result = {
                content: `Content based on: ${inputData.plan}`,
            }
            span?.update({ output: result })
            span?.end()
            return result
        } catch (error) {
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })
            throw error
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
