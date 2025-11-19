import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { researchAgent } from '../agents/researchAgent';
import { learningExtractionAgent } from '../agents/learningExtractionAgent';
import { evaluationAgent } from '../agents/evaluationAgent';
import { contentStrategistAgent } from '../agents/contentStrategistAgent';
import { scriptWriterAgent } from '../agents/scriptWriterAgent';
import { editorAgent } from '../agents/editorAgent';
import { logStepStart, logStepEnd } from '../config/logger';

// --- Schemas ---

const researchAgentOutputSchema = z.object({
  summary: z.string(),
  data: z.string(),
  sources: z.array(z.object({ url: z.string(), title: z.string() })).optional(),
});

const researchStepOutputSchema = z.object({
  topic: z.string(),
  researchData: researchAgentOutputSchema,
});

const evaluationAgentOutputSchema = z.object({
  isRelevant: z.boolean(),
  reason: z.string(),
});

const evaluationStepOutputSchema = researchStepOutputSchema.extend({
  evaluation: evaluationAgentOutputSchema,
});

const learningAgentOutputSchema = z.object({
  learning: z.string(),
  followUpQuestion: z.string(),
});

const learningStepOutputSchema = evaluationStepOutputSchema.extend({
  learning: learningAgentOutputSchema,
});

const strategyInputSchema = learningStepOutputSchema;

const strategyOutputSchema = z.object({
  plan: z.object({
    title: z.string(),
    targetAudience: z.string(),
    angle: z.string(),
    keyPoints: z.array(z.string()),
  }),
});

const hookInputSchema = z.object({
  plan: strategyOutputSchema.shape.plan,
});

const hookOutputSchema = z.object({
  hooks: z.array(z.string()),
  plan: strategyOutputSchema.shape.plan,
});

const bodyInputSchema = z.object({
  plan: strategyOutputSchema.shape.plan,
  hooks: z.array(z.string()),
});

const bodyOutputSchema = z.object({
  bodyScript: z.string(),
  plan: strategyOutputSchema.shape.plan,
  hooks: z.array(z.string()),
});

const reviewInputSchema = z.object({
  hooks: z.array(z.string()),
  bodyScript: z.string(),
  plan: strategyOutputSchema.shape.plan,
});

const reviewOutputSchema = z.object({
  score: z.number(),
  feedback: z.string(),
  approved: z.boolean(),
  finalScript: z.string(),
});

const refineInputSchema = z.object({
  finalScript: z.string(),
  feedback: z.string(),
  score: z.number(),
  approved: z.boolean(),
});

const refineOutputSchema = reviewOutputSchema;

// --- Steps ---

const researchStep = createStep({
  id: 'research-step',
  inputSchema: z.object({ topic: z.string() }),
  outputSchema: researchStepOutputSchema,
  execute: async ({ inputData }) => {
    const start = Date.now();
    logStepStart('research-step', inputData);

    const prompt = `Research the topic: "${inputData.topic}".
    Focus on finding unique angles, trending discussions, and key facts.
    Return JSON with summary, data, and sources.`;
    const res = await researchAgent.generate(prompt, { output: researchAgentOutputSchema });

    const output = { topic: inputData.topic, researchData: res.object };
    logStepEnd('research-step', output, Date.now() - start);
    return output;
  },
});

const evaluationStep = createStep({
  id: 'evaluation-step',
  inputSchema: researchStepOutputSchema,
  outputSchema: evaluationStepOutputSchema,
  execute: async ({ inputData }) => {
    const start = Date.now();
    logStepStart('evaluation-step', inputData);

    const prompt = `Evaluate the relevance of this research to the topic "${inputData.topic}".
    Research Summary: ${inputData.researchData.summary}
    Return JSON with isRelevant and reason.`;
    const res = await evaluationAgent.generate(prompt, { output: evaluationAgentOutputSchema });

    const output = { ...inputData, evaluation: res.object };
    logStepEnd('evaluation-step', output, Date.now() - start);
    return output;
  },
});

const learningStep = createStep({
  id: 'learning-step',
  inputSchema: evaluationStepOutputSchema,
  outputSchema: learningStepOutputSchema,
  execute: async ({ inputData }) => {
    const start = Date.now();
    logStepStart('learning-step', inputData);

    const prompt = `Extract the single most important learning from this research data:
    ${inputData.researchData.data}
    Return JSON with learning and followUpQuestion.`;
    const res = await learningExtractionAgent.generate(prompt, { output: learningAgentOutputSchema });

    const output = { ...inputData, learning: res.object };
    logStepEnd('learning-step', output, Date.now() - start);
    return output;
  },
});

const strategyStep = createStep({
  id: 'strategy-step',
  inputSchema: strategyInputSchema,
  outputSchema: strategyOutputSchema,
  execute: async ({ inputData }) => {
    const start = Date.now();
    logStepStart('strategy-step', inputData);

    const researchContext = `
    Research Summary: ${inputData.researchData.summary}
    Key Data: ${inputData.researchData.data}
    Relevance Check: ${inputData.evaluation.isRelevant ? 'Relevant' : 'Not Relevant'} (${inputData.evaluation.reason})
    Key Learning: ${inputData.learning.learning}
    Follow-up Question: ${inputData.learning.followUpQuestion}
    `;

    const prompt = `Create a content plan for topic: "${inputData.topic}".
    Use the following research context to inform your strategy:
    ${researchContext}

    Return JSON with title, targetAudience, angle, and keyPoints.`;
    const res = await contentStrategistAgent.generate(prompt, { output: strategyOutputSchema.shape.plan });

    const output = { plan: res.object };
    logStepEnd('strategy-step', output, Date.now() - start);
    return output;
  },
});

const hookStep = createStep({
  id: 'hook-step',
  inputSchema: hookInputSchema,
  outputSchema: hookOutputSchema,
  execute: async ({ inputData }) => {
    const start = Date.now();
    logStepStart('hook-step', inputData);

    const prompt = `Write 3 distinct hooks for this plan: ${JSON.stringify(inputData.plan)}.
    Return JSON with an array of strings named 'hooks'.`;
    const res = await scriptWriterAgent.generate(prompt, { output: z.object({ hooks: z.array(z.string()) }) });

    const output = { hooks: res.object.hooks, plan: inputData.plan };
    logStepEnd('hook-step', output, Date.now() - start);
    return output;
  },
});

const bodyStep = createStep({
  id: 'body-step',
  inputSchema: bodyInputSchema,
  outputSchema: bodyOutputSchema,
  execute: async ({ inputData }) => {
    const start = Date.now();
    logStepStart('body-step', inputData);

    const prompt = `Write the main body script for this plan: ${JSON.stringify(inputData.plan)}.
    Do not include hooks. Return JSON with 'bodyScript'.`;
    const res = await scriptWriterAgent.generate(prompt, { output: z.object({ bodyScript: z.string() }) });

    const output = { bodyScript: res.object.bodyScript, plan: inputData.plan, hooks: inputData.hooks };
    logStepEnd('body-step', output, Date.now() - start);
    return output;
  },
});

const reviewStep = createStep({
  id: 'review-step',
  inputSchema: reviewInputSchema,
  outputSchema: reviewOutputSchema,
  execute: async ({ inputData }) => {
    const start = Date.now();
    logStepStart('review-step', inputData);

    const fullScript = `HOOKS:\n${inputData.hooks.join('\n---\n')}\n\nBODY:\n${inputData.bodyScript}`;

    const prompt = `Review this script based on the plan: ${JSON.stringify(inputData.plan)}.
    Rate 0-100. If < 80, give feedback.
    Return JSON with score, feedback, approved, and finalScript (which is just the input script for now).`;

    const res = await editorAgent.generate(prompt, { output: reviewOutputSchema });

    const output = { ...res.object, finalScript: fullScript };
    logStepEnd('review-step', output, Date.now() - start);
    return output;
  },
});

const refineStep = createStep({
  id: 'refine-step',
  inputSchema: refineInputSchema,
  outputSchema: refineOutputSchema,
  execute: async ({ inputData }) => {
    const start = Date.now();
    logStepStart('refine-step', inputData);

    // 1. Refine
    const refinePrompt = `Refine this script based on feedback: "${inputData.feedback}".
    Script: ${inputData.finalScript}`;
    const refinedRes = await scriptWriterAgent.generate(refinePrompt);
    const refinedScript = refinedRes.text;

    // 2. Re-evaluate
    const evalPrompt = `Evaluate this refined script. Rate 0-100.
    Script: ${refinedScript}`;
    const evalRes = await editorAgent.generate(evalPrompt, { output: reviewOutputSchema });

    const output = { ...evalRes.object, finalScript: refinedScript };
    logStepEnd('refine-step', output, Date.now() - start);
    return output;
  },
});

// --- Workflow ---

export const contentStudioWorkflow = createWorkflow({
  id: 'content-studio-workflow',
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
    const result = inputData as z.infer<typeof reviewOutputSchema>;
    return (result?.score ?? 0) < 80;
  })
  .commit();
