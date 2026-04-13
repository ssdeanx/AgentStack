import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import type { ChunkType } from '@mastra/core/stream'
import type { MastraModelOutput } from '@mastra/core/stream'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { contentStrategistAgent } from '../agents/contentStrategistAgent'
import { editorAgent } from '../agents/editorAgent'
import { evaluationAgent } from '../agents/evaluationAgent'
import { learningExtractionAgent } from '../agents/learningExtractionAgent'
import { researchAgent } from '../agents/researchAgent'
import { scriptWriterAgent } from '../agents/scriptWriterAgent'
import { logStepEnd, logStepStart } from '../config/logger'

// --- Schemas ---

const researchAgentOutputSchema = z.object({
    summary: z.string(),
    data: z.string(),
    sources: z
        .array(z.object({ url: z.string(), title: z.string() }))
        .optional(),
})

const researchStepOutputSchema = z.object({
    topic: z.string(),
    researchData: researchAgentOutputSchema,
})

const evaluationAgentOutputSchema = z.object({
    isRelevant: z.boolean(),
    reason: z.string(),
})

const evaluationStepOutputSchema = researchStepOutputSchema.extend({
    evaluation: evaluationAgentOutputSchema,
})

const learningAgentOutputSchema = z.object({
    learning: z.string(),
    followUpQuestion: z.string(),
})

const learningStepOutputSchema = evaluationStepOutputSchema.extend({
    learning: learningAgentOutputSchema,
})

const strategyInputSchema = learningStepOutputSchema

const strategyOutputSchema = z.object({
    plan: z.object({
        title: z.string(),
        targetAudience: z.string(),
        angle: z.string(),
        keyPoints: z.array(z.string()),
    }),
})

const hookInputSchema = z.object({
    plan: strategyOutputSchema.shape.plan,
})

const hookOutputSchema = z.object({
    hooks: z.array(z.string()),
    plan: strategyOutputSchema.shape.plan,
})

const bodyInputSchema = z.object({
    plan: strategyOutputSchema.shape.plan,
    hooks: z.array(z.string()),
})

const bodyOutputSchema = z.object({
    bodyScript: z.string(),
    plan: strategyOutputSchema.shape.plan,
    hooks: z.array(z.string()),
})

const reviewInputSchema = z.object({
    hooks: z.array(z.string()),
    bodyScript: z.string(),
    plan: strategyOutputSchema.shape.plan,
})

const reviewOutputSchema = z.object({
    score: z.number(),
    feedback: z.string(),
    approved: z.boolean(),
    finalScript: z.string(),
})

type WorkflowChunk<Output> = ChunkType<Output>

const refineInputSchema = z.object({
    finalScript: z.string(),
    feedback: z.string(),
    score: z.number(),
    approved: z.boolean(),
})

const refineOutputSchema = reviewOutputSchema

// --- Steps ---

const researchStep = createStep({
    id: 'research-step',
    inputSchema: z.object({ topic: z.string() }),
    outputSchema: researchStepOutputSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'research-step',
            input: inputData,
            metadata: {
                'workflow.step': 'research-step',
                'content.topic': inputData.topic,
            },
            requestContext,
            mastra,
        })
        const start = Date.now()
        logStepStart('research-step', inputData)
        try {
            // Emit workflow step start
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Starting research phase for topic: ${inputData.topic}...`,
                    stage: 'research-step',
                },
                id: 'research-step',
            })

            const prompt = `Research the topic: "${inputData.topic}".
Focus on finding unique angles, trending discussions, and key facts.
Return JSON with summary, data, and sources.`

            const stream: MastraModelOutput<
                z.infer<typeof researchAgentOutputSchema>
            > = await researchAgent.stream(prompt, {
                structuredOutput: {
                    schema: researchAgentOutputSchema,
                },
            })

            if (writer !== undefined && writer !== null) {
                for await (const chunk of stream.fullStream as AsyncIterable<WorkflowChunk<z.infer<typeof researchAgentOutputSchema>>>) {
                    await writer.write(chunk)
                }
            }

            let researchData: z.infer<typeof researchAgentOutputSchema> = {
                summary: '',
                data: '',
            }
            try {
                researchData = await stream.object
            } catch {
                // If object resolution fails, keep the default empty object.
            }

            const output = { topic: inputData.topic, researchData }
            // Emit workflow step complete
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Research phase completed for topic: ${inputData.topic}`,
                    stage: 'research-step',
                },
                id: 'research-step',
            })

            logStepEnd('research-step', output, Date.now() - start)

            span?.update({ output })
            span?.end()

            return output
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

const evaluationStep = createStep({
    id: 'evaluation-step',
    inputSchema: researchStepOutputSchema,
    outputSchema: evaluationStepOutputSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'evaluation-step',
            input: inputData,
            metadata: {
                'workflow.step': 'evaluation-step',
            },
            requestContext,
            mastra,
        })
        const start = Date.now()
        logStepStart('evaluation-step', inputData)
        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Starting evaluation phase for topic: ${inputData.topic}...`,
                    stage: 'evaluation-step',
                },
                id: 'evaluation-step',
            })
            const prompt = `Evaluate the relevance of this research to the topic "${inputData.topic}".
Research Summary: ${inputData.researchData.summary}
Return JSON with isRelevant and reason.`

            const stream: MastraModelOutput<
                z.infer<typeof evaluationAgentOutputSchema>
            > = await evaluationAgent.stream(prompt, {
                structuredOutput: {
                    schema: evaluationAgentOutputSchema,
                },
            })

            if (writer !== undefined && writer !== null) {
                for await (const chunk of stream.fullStream as AsyncIterable<WorkflowChunk<z.infer<typeof evaluationAgentOutputSchema>>>) {
                    await writer.write(chunk)
                }
            }

            let evaluation: z.infer<typeof evaluationAgentOutputSchema> = {
                isRelevant: false,
                reason: '',
            }

            try {
                evaluation = await stream.object
            } catch {
                // Keep the default evaluation object.
            }

            const output = { ...inputData, evaluation }
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Evaluation phase completed for topic: ${inputData.topic}`,
                    stage: 'evaluation-step',
                },
                id: 'evaluation-step',
            })

            logStepEnd('evaluation-step', output, Date.now() - start)

            span?.update({ output })
            span?.end()

            return output
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

const learningStep = createStep({
    id: 'learning-step',
    inputSchema: evaluationStepOutputSchema,
    outputSchema: learningStepOutputSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'learning-step',
            input: inputData,
            metadata: {
                'workflow.step': 'learning-step',
            },
            requestContext,
            mastra,
        })
        const start = Date.now()
        logStepStart('learning-step', inputData)
        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Starting learning extraction phase for topic: ${inputData.topic}...`,
                    stage: 'learning-step',
                },
                id: 'learning-step',
            })
            const prompt = `Extract the single most important learning from this research data:
${inputData.researchData.data}
Return JSON with learning and followUpQuestion.`

            const stream: MastraModelOutput<
                z.infer<typeof learningAgentOutputSchema>
            > = await learningExtractionAgent.stream(prompt, {
                structuredOutput: {
                    schema: learningAgentOutputSchema,
                },
            })

            if (writer !== undefined && writer !== null) {
                for await (const chunk of stream.fullStream as AsyncIterable<WorkflowChunk<z.infer<typeof learningAgentOutputSchema>>>) {
                    await writer.write(chunk)
                }
            }

            let learning: z.infer<typeof learningAgentOutputSchema> = {
                learning: '',
                followUpQuestion: '',
            }
            try {
                learning = await stream.object
            } catch {
                // Keep default learning object on error.
            }

            const output = { ...inputData, learning }
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Learning extraction phase completed for topic: ${inputData.topic}`,
                    stage: 'learning-step',
                },
                id: 'learning-step',
            })

            logStepEnd('learning-step', output, Date.now() - start)

            span?.update({ output })
            span?.end()

            return output
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

const strategyStep = createStep({
    id: 'strategy-step',
    inputSchema: strategyInputSchema,
    outputSchema: strategyOutputSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'strategy-step',
            input: inputData,
            metadata: {
                'workflow.step': 'strategy-step',
            },
            requestContext,
            mastra,
        })
        const start = Date.now()
        logStepStart('strategy-step', inputData)
        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Starting content strategy phase for topic: ${inputData.topic}...`,
                    stage: 'strategy-step',
                },
                id: 'strategy-step',
            })

            const researchContext = `
    Research Summary: ${inputData.researchData.summary}
    Key Data: ${inputData.researchData.data}
    Relevance Check: ${inputData.evaluation.isRelevant ? 'Relevant' : 'Not Relevant'} (${inputData.evaluation.reason})
    Key Learning: ${inputData.learning.learning}
    Follow-up Question: ${inputData.learning.followUpQuestion}
    `

            const prompt = `Create a content plan for topic: "${inputData.topic}".
Use the following research context to inform your strategy:
${researchContext}

Return JSON with title, targetAudience, angle, and keyPoints.`

            const stream: MastraModelOutput<
                z.infer<typeof strategyOutputSchema>['plan']
            > = await contentStrategistAgent.stream(prompt, {
                structuredOutput: {
                    schema: strategyOutputSchema.shape.plan,
                },
            })
            if (writer !== undefined && writer !== null) {
                for await (const chunk of stream.fullStream as AsyncIterable<WorkflowChunk<z.infer<typeof strategyOutputSchema>['plan']>>) {
                    await writer.write(chunk)
                }
            }

            const defaultPlan: z.infer<typeof strategyOutputSchema>['plan'] = {
                title: '',
                targetAudience: '',
                angle: '',
                keyPoints: [],
            }

            let plan: z.infer<typeof strategyOutputSchema>['plan'] = defaultPlan
            try {
                plan = await stream.object
            } catch {
                // Keep defaultPlan on error.
            }

            const output = { plan }
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Content strategy phase completed for topic: ${inputData.topic}`,
                    stage: 'strategy-step',
                },
                id: 'strategy-step',
            })

            logStepEnd('strategy-step', output, Date.now() - start)

            span?.update({ output })
            span?.end()

            return output
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

const hookStep = createStep({
    id: 'hook-step',
    inputSchema: hookInputSchema,
    outputSchema: hookOutputSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'hook-step',
            input: inputData,
            metadata: {
                'workflow.step': 'hook-step',
            },
            requestContext,
            mastra,
        })
        const start = Date.now()
        logStepStart('hook-step', inputData)
        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Starting hook creation phase for topic: ${inputData.plan.title}...`,
                    stage: 'hook-step',
                },
                id: 'hook-step',
            })

            const prompt = `Write 3 distinct hooks for this plan: ${JSON.stringify(
                inputData.plan
            )}.
  Return JSON with an array of strings named 'hooks'.`

            const stream: MastraModelOutput<{ hooks: string[] }> =
                await scriptWriterAgent.stream(prompt, {
                    structuredOutput: {
                        schema: z.object({ hooks: z.array(z.string()) }),
                    },
                })
            if (writer !== undefined && writer !== null) {
                for await (const chunk of stream.fullStream as AsyncIterable<WorkflowChunk<{ hooks: string[] }>>) {
                    await writer.write(chunk)
                }
            }

            let hooks: string[] = []
            try {
                const parsed = await stream.object
                hooks = parsed.hooks
            } catch {
                // Keep hooks as empty array on error.
            }

            const output = { hooks, plan: inputData.plan }
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Hook creation phase completed for topic: ${inputData.plan.title}`,
                    stage: 'hook-step',
                },
                id: 'hook-step',
            })

            logStepEnd('hook-step', output, Date.now() - start)

            span?.update({ output })
            span?.end()

            return output
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

const bodyStep = createStep({
    id: 'body-step',
    inputSchema: bodyInputSchema,
    outputSchema: bodyOutputSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'body-step',
            input: inputData,
            metadata: {
                'workflow.step': 'body-step',
            },
            requestContext,
            mastra,
        })
        const start = Date.now()
        logStepStart('body-step', inputData)
        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Starting body script creation phase for topic: ${inputData.plan.title}...`,
                    stage: 'body-step',
                },
                id: 'body-step',
            })

            const prompt = `Write the main body script for this plan: ${JSON.stringify(inputData.plan)}.
    Do not include hooks. Return JSON with 'bodyScript'.`
            const stream: MastraModelOutput<{ bodyScript: string }> =
                await scriptWriterAgent.stream(prompt, {
                    structuredOutput: {
                        schema: z.object({ bodyScript: z.string() }),
                    },
                })
            if (writer !== undefined && writer !== null) {
                for await (const chunk of stream.fullStream as AsyncIterable<WorkflowChunk<{ bodyScript: string }>>) {
                    await writer.write(chunk)
                }
            }

            let bodyResult: z.infer<typeof bodyOutputSchema> | null = null
            try {
                const parsed = await stream.object
                bodyResult = {
                    bodyScript: parsed.bodyScript,
                    plan: inputData.plan,
                    hooks: inputData.hooks,
                }
            } catch {
                bodyResult = null
            }
            const output = {
                bodyScript: bodyResult?.bodyScript ?? '',
                plan: inputData.plan,
                hooks: inputData.hooks,
            }
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Body script creation phase completed for topic: ${inputData.plan.title}`,
                    stage: 'body-step',
                },
                id: 'body-step',
            })

            logStepEnd('body-step', output, Date.now() - start)

            span?.update({ output })
            span?.end()

            return output
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

const reviewStep = createStep({
    id: 'review-step',
    inputSchema: reviewInputSchema,
    outputSchema: reviewOutputSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'review-step',
            input: inputData,
            metadata: {
                'workflow.step': 'review-step',
            },
            requestContext,
            mastra,
        })
        const start = Date.now()
        logStepStart('review-step', inputData)
        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Starting review phase for topic: ${inputData.plan.title}...`,
                    stage: 'review-step',
                },
                id: 'review-step',
            })

            const fullScript = `HOOKS:\n${inputData.hooks.join('\n---\n')}\n\nBODY:\n${inputData.bodyScript}`

            const prompt = `Review this script based on the plan: ${JSON.stringify(
                inputData.plan
            )}.
Rate 0-100. If < 80, give feedback.
Return JSON with score, feedback, approved, and finalScript (which is just the input script for now).`

            const stream: MastraModelOutput<{ score: number; feedback: string }> =
                await editorAgent.stream(prompt, {
                    structuredOutput: {
                        schema: z.object({
                            score: z.number(),
                            feedback: z.string(),
                        }),
                    },
                })
            if (writer !== undefined && writer !== null) {
                for await (const chunk of stream.fullStream as AsyncIterable<WorkflowChunk<{ score: number; feedback: string }>>) {
                    await writer.write(chunk)
                }
            }

            const defaultReview: z.infer<typeof reviewOutputSchema> = {
                score: 0,
                feedback: '',
                approved: false,
                finalScript: fullScript,
            }

            let review: z.infer<typeof reviewOutputSchema> = defaultReview
            try {
                const parsed = await stream.object
                review = reviewOutputSchema.parse({
                    score: parsed.score,
                    feedback: parsed.feedback,
                    approved: parsed.score >= 80,
                    finalScript: fullScript,
                })
            } catch {
                // Keep the default review on error.
            }

            // Ensure the finalScript always contains the full script
            review.finalScript = fullScript
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Review phase completed for topic: ${inputData.plan.title}`,
                    stage: 'review-step',
                },
                id: 'review-step',
            })

            logStepEnd('review-step', review, Date.now() - start)

            span?.update({ output: review })
            span?.end()

            return review
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

const refineStep = createStep({
    id: 'refine-step',
    inputSchema: refineInputSchema,
    outputSchema: refineOutputSchema,
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'refine-step',
            input: inputData,
            metadata: {
                'workflow.step': 'refine-step',
            },
            requestContext,
            mastra,
        })
        const start = Date.now()
        logStepStart('refine-step', inputData)
        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Starting refinement phase for topic: ${inputData.finalScript.split('\n')[0].slice(0, 50)}...`,
                    stage: 'refine-step',
                },
                id: 'refine-step',
            })

            // 1. Refine the script based on feedback
            const refinePrompt = `Refine this script based on feedback: "${inputData.feedback}".
Script: ${inputData.finalScript}`
            const refineStream = await scriptWriterAgent.stream(refinePrompt)
            if (writer !== undefined && writer !== null) {
                for await (const chunk of refineStream.fullStream as AsyncIterable<WorkflowChunk<undefined>>) {
                    await writer.write(chunk)
                }
            }
            const refinedScript = await refineStream.text

            if (!refinedScript) {
                throw new Error(
                    'scriptWriterAgent.stream returned an empty text for refine-step'
                )
            }

            // 2. Re‑evaluate the refined script
            const evalPrompt = `Evaluate this refined script. Rate 0-100.
Script: ${refinedScript}`
            const evalStream: MastraModelOutput<{
                score: number
                feedback: string
                approved: boolean
                finalScript: string
            }> = await editorAgent.stream(evalPrompt, {
                structuredOutput: {
                    schema: reviewOutputSchema,
                },
            })
            if (writer !== undefined && writer !== null) {
                for await (const chunk of evalStream.fullStream as AsyncIterable<WorkflowChunk<z.infer<typeof reviewOutputSchema>>>) {
                    await writer.write(chunk)
                }
            }

            // Default review values that satisfy the schema
            const defaultReview: z.infer<typeof reviewOutputSchema> = {
                score: 0,
                feedback: '',
                approved: false,
                finalScript: refinedScript,
            }

            let review: z.infer<typeof reviewOutputSchema> = defaultReview
            try {
                review = await evalStream.object
            } catch {
                review = defaultReview
            }

            // Ensure the finalScript is always the refined version
            review.finalScript = refinedScript
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Refinement phase completed for topic: ${inputData.finalScript.split('\n')[0].slice(0, 50)}...`,
                    stage: 'refine-step',
                },
                id: 'refine-step',
            })

            logStepEnd('refine-step', review, Date.now() - start)

            span?.update({ output: review })
            span?.end()

            return review
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

// --- Workflow ---

export const contentStudioWorkflow = createWorkflow({
    id: 'contentStudioWorkflow',
    inputSchema: z.object({
        topic: z.string(),
    }),
    outputSchema: reviewOutputSchema,
})
    .then(researchStep)
    .then(evaluationStep)
    .then(learningStep)
    .then(strategyStep)
    .then(hookStep)
    .then(bodyStep)
    .then(reviewStep)
    .dowhile(refineStep, async ({ inputData }) => {
        // Continue looping if score is less than 80
        const result = inputData
        return (result?.score ?? 0) < 80
    })
    .commit()
