import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { contentStrategistAgent } from '../agents/contentStrategistAgent';
import { editorAgent } from '../agents/editorAgent';
import { evaluationAgent } from '../agents/evaluationAgent';
import { learningExtractionAgent } from '../agents/learningExtractionAgent';
import { researchAgent } from '../agents/researchAgent';
import { scriptWriterAgent } from '../agents/scriptWriterAgent';
import { logStepEnd, logStepStart } from '../config/logger';

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
  execute: async ({ inputData, writer }) => {
    const start = Date.now();
    logStepStart('research-step', inputData);
    // Emit workflow step start
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "in-progress",
        message: `Starting research phase for topic: ${inputData.topic}...`,
        stage: "research-step",
      },
      id: "research-step",
    });

    const prompt = `Research the topic: "${inputData.topic}".
Focus on finding unique angles, trending discussions, and key facts.
Return JSON with summary, data, and sources.`;

    const stream = await researchAgent.stream(prompt, {
      output: researchAgentOutputSchema,
    } as any);
    await stream.textStream.pipeTo(writer);
    const finalText = await stream.text;

    // Ensure we always return a valid object matching the schema
    let researchData: z.infer<typeof researchAgentOutputSchema> = {
      summary: '',
      data: '',
    };
    try {
      const parsed = JSON.parse(finalText);
      // Validate parsed data against the schema (runtime safety)
      researchData = researchAgentOutputSchema.parse(parsed);
    } catch {
      // If parsing or validation fails, keep the default empty object
    }

    const output = { topic: inputData.topic, researchData };
    // Emit workflow step complete
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "done",
        message: `Research phase completed for topic: ${inputData.topic}`,
        stage: "research-step",
      },
      id: "research-step",
    });

    logStepEnd('research-step', output, Date.now() - start);
    return output;
  },
});;

const evaluationStep = createStep({
  id: 'evaluation-step',
  inputSchema: researchStepOutputSchema,
  outputSchema: evaluationStepOutputSchema,
  execute: async ({ inputData, writer }) => {
    const start = Date.now();
    logStepStart('evaluation-step', inputData);
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "in-progress",
        message: `Starting evaluation phase for topic: ${inputData.topic}...`,
        stage: "evaluation-step",
      },
      id: "evaluation-step",
    });
    const prompt = `Evaluate the relevance of this research to the topic "${inputData.topic}".
Research Summary: ${inputData.researchData.summary}
Return JSON with isRelevant and reason.`;

    const stream = await evaluationAgent.stream(prompt, {
      output: evaluationAgentOutputSchema,
    } as any);
    await stream.textStream.pipeTo(writer);
    const finalText = await stream.text;

    // Default evaluation in case parsing/validation fails
    let evaluation: z.infer<typeof evaluationAgentOutputSchema> = {
      isRelevant: false,
      reason: '',
    };

    try {
      const parsed = JSON.parse(finalText);
      // Validate against the schema for runtime safety
      evaluation = evaluationAgentOutputSchema.parse(parsed);
    } catch {
      // Keep the default evaluation object
    }

    const output = { ...inputData, evaluation };
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "done",
        message: `Evaluation phase completed for topic: ${inputData.topic}`,
        stage: "evaluation-step",
      },
      id: "evaluation-step",
    });

    logStepEnd('evaluation-step', output, Date.now() - start);
    return output;
  },
});;

const learningStep = createStep({
  id: 'learning-step',
  inputSchema: evaluationStepOutputSchema,
  outputSchema: learningStepOutputSchema,
  execute: async ({ inputData, writer }) => {
    const start = Date.now();
    logStepStart('learning-step', inputData);
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "in-progress",
        message: `Starting learning extraction phase for topic: ${inputData.topic}...`,
        stage: "learning-step",
      },
      id: "learning-step",
    });
    const prompt = `Extract the single most important learning from this research data:
${inputData.researchData.data}
Return JSON with learning and followUpQuestion.`;

    const stream = await learningExtractionAgent.stream(prompt, {
      output: learningAgentOutputSchema,
    } as any);
    await stream.textStream.pipeTo(writer);
    const finalText = await stream.text;

    // Default learning object to satisfy schema if parsing fails
    let learning: z.infer<typeof learningAgentOutputSchema> = {
      learning: '',
      followUpQuestion: '',
    };
    try {
      const parsed = JSON.parse(finalText);
      learning = learningAgentOutputSchema.parse(parsed);
    } catch {
      // Keep default learning object on error
    }

    const output = { ...inputData, learning };
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "done",
        message: `Learning extraction phase completed for topic: ${inputData.topic}`,
        stage: "learning-step",
      },
      id: "learning-step",
    });

    logStepEnd('learning-step', output, Date.now() - start);
    return output;
  },
});;

const strategyStep = createStep({
  id: 'strategy-step',
  inputSchema: strategyInputSchema,
  outputSchema: strategyOutputSchema,
  execute: async ({ inputData, writer }) => {
    const start = Date.now();
    logStepStart('strategy-step', inputData);
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "in-progress",
        message: `Starting content strategy phase for topic: ${inputData.topic}...`,
        stage: "strategy-step",
      },
      id: "strategy-step",
    });

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

    const stream = await contentStrategistAgent.stream(prompt, {
      output: strategyOutputSchema.shape.plan,
    } as any);
    await stream.textStream.pipeTo(writer);
    const finalText = await stream.text;

    // Default plan to satisfy the schema if parsing/validation fails
    const defaultPlan: z.infer<typeof strategyOutputSchema>['plan'] = {
      title: '',
      targetAudience: '',
      angle: '',
      keyPoints: [],
    };

    let plan: z.infer<typeof strategyOutputSchema>['plan'] = defaultPlan;
    try {
      const parsed = JSON.parse(finalText);
      plan = strategyOutputSchema.shape.plan.parse(parsed);
    } catch {
      // Keep defaultPlan on error
    }

    const output = { plan };
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "done",
        message: `Content strategy phase completed for topic: ${inputData.topic}`,
        stage: "strategy-step",
      },
      id: "strategy-step",
    });

    logStepEnd('strategy-step', output, Date.now() - start);
    return output;
  },
});;

const hookStep = createStep({
  id: 'hook-step',
  inputSchema: hookInputSchema,
  outputSchema: hookOutputSchema,
  execute: async ({ inputData, writer }) => {
    const start = Date.now();
    logStepStart('hook-step', inputData);
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "in-progress",
        message: `Starting hook creation phase for topic: ${inputData.plan.title}...`,
        stage: "hook-step",
      },
      id: "hook-step",
    });

    const prompt = `Write 3 distinct hooks for this plan: ${JSON.stringify(
      inputData.plan,
    )}.
  Return JSON with an array of strings named 'hooks'.`;

    const stream = await scriptWriterAgent.stream(prompt, {
      output: z.object({ hooks: z.array(z.string()) }),
    } as any);
    await stream.textStream.pipeTo(writer);
    const finalText = await stream.text;

    // Default to an empty hooks array if parsing or validation fails
    let hooks: string[] = [];
    try {
      const parsed = JSON.parse(finalText);
      const validated = hookOutputSchema.shape.hooks.parse(parsed);
      hooks = validated;
    } catch {
      // Keep hooks as empty array on error
    }

    const output = { hooks, plan: inputData.plan };
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "done",
        message: `Hook creation phase completed for topic: ${inputData.plan.title}`,
        stage: "hook-step",
      },
      id: "hook-step",
    });

    logStepEnd('hook-step', output, Date.now() - start);
    return output;
  },
});

const bodyStep = createStep({
  id: 'body-step',
  inputSchema: bodyInputSchema,
  outputSchema: bodyOutputSchema,
  execute: async ({ inputData, writer }) => {
    const start = Date.now();
    logStepStart('body-step', inputData);
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "in-progress",
        message: `Starting body script creation phase for topic: ${inputData.plan.title}...`,
        stage: "body-step",
      },
      id: "body-step",
    });

    const prompt = `Write the main body script for this plan: ${JSON.stringify(inputData.plan)}.
    Do not include hooks. Return JSON with 'bodyScript'.`;
    const stream = await scriptWriterAgent.stream(prompt, { output: z.object({ bodyScript: z.string() }) } as any);
    await stream.textStream.pipeTo(writer);
    const finalText = await stream.text;
    let bodyResult: z.infer<typeof bodyOutputSchema> | null = null;
    try {
      bodyResult = JSON.parse(finalText) as z.infer<typeof bodyOutputSchema>;
    } catch {
      bodyResult = null;
    }
    const output = { bodyScript: bodyResult?.bodyScript ?? '', plan: inputData.plan, hooks: inputData.hooks };
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "done",
        message: `Body script creation phase completed for topic: ${inputData.plan.title}`,
        stage: "body-step",
      },
      id: "body-step",
    });

    logStepEnd('body-step', output, Date.now() - start);
    return output;
  },
});

const reviewStep = createStep({
  id: 'review-step',
  inputSchema: reviewInputSchema,
  outputSchema: reviewOutputSchema,
  execute: async ({ inputData, writer }) => {
    const start = Date.now();
    logStepStart('review-step', inputData);
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "in-progress",
        message: `Starting review phase for topic: ${inputData.plan.title}...`,
        stage: "review-step",
      },
      id: "review-step",
    });

    const fullScript = `HOOKS:\n${inputData.hooks.join('\n---\n')}\n\nBODY:\n${inputData.bodyScript}`;

    const prompt = `Review this script based on the plan: ${JSON.stringify(
      inputData.plan,
    )}.
Rate 0-100. If < 80, give feedback.
Return JSON with score, feedback, approved, and finalScript (which is just the input script for now).`;

    const stream = await editorAgent.stream(prompt, { output: reviewOutputSchema } as any);
    await stream.textStream.pipeTo(writer);
    const finalText = await stream.text;

    // Default values that satisfy the schema
    const defaultReview: z.infer<typeof reviewOutputSchema> = {
      score: 0,
      feedback: '',
      approved: false,
      finalScript: fullScript,
    };

    let review: z.infer<typeof reviewOutputSchema> = defaultReview;
    try {
      const parsed = JSON.parse(finalText);
      // Validate parsed data against the schema; will throw if invalid
      review = reviewOutputSchema.parse(parsed);
    } catch {
      // Keep defaultReview on error
    }

    // Ensure the finalScript always contains the full script
    review.finalScript = fullScript;
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "done",
        message: `Review phase completed for topic: ${inputData.plan.title}`,
        stage: "review-step",
      },
      id: "review-step",
    });

    logStepEnd('review-step', review, Date.now() - start);
    return review;
  },
});;

const refineStep = createStep({
  id: 'refine-step',
  inputSchema: refineInputSchema,
  outputSchema: refineOutputSchema,
  execute: async ({ inputData, writer }) => {
    const start = Date.now();
    logStepStart('refine-step', inputData);
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "in-progress",
        message: `Starting refinement phase for topic: ${inputData.finalScript.split('\n')[0].slice(0, 50)}...`,
        stage: "refine-step",
      },
      id: "refine-step",
    });

    // 1. Refine the script based on feedback
    const refinePrompt = `Refine this script based on feedback: "${inputData.feedback}".
Script: ${inputData.finalScript}`;
    const refineStream = await scriptWriterAgent.stream(refinePrompt);
    await refineStream.textStream.pipeTo(writer);
    const refinedScript = await refineStream.text;

    if (!refinedScript) {
      throw new Error('scriptWriterAgent.stream returned an empty text for refine-step');
    }

    // 2. Re‑evaluate the refined script
    const evalPrompt = `Evaluate this refined script. Rate 0-100.
Script: ${refinedScript}`;
    const evalStream = await editorAgent.stream(evalPrompt, {
      output: reviewOutputSchema,
    } as any);
    await evalStream.textStream.pipeTo(writer);
    const evalFinalText = await evalStream.text;

    // Default review values that satisfy the schema
    const defaultReview: z.infer<typeof reviewOutputSchema> = {
      score: 0,
      feedback: '',
      approved: false,
      finalScript: refinedScript,
    };

    let review: z.infer<typeof reviewOutputSchema>;
    try {
      const parsed = JSON.parse(evalFinalText);
      review = reviewOutputSchema.parse(parsed);
    } catch {
      review = defaultReview;
    }

    // Ensure the finalScript is always the refined version
    review.finalScript = refinedScript;
    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "done",
        message: `Refinement phase completed for topic: ${inputData.finalScript.split('\n')[0].slice(0, 50)}...`,
        stage: "refine-step",
      },
      id: "refine-step",
    });

    logStepEnd('refine-step', review, Date.now() - start);
    return review;
  },
});;

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
    const result = inputData as z.infer<typeof reviewOutputSchema>;
    return (result?.score ?? 0) < 80;
  })
  .commit();
