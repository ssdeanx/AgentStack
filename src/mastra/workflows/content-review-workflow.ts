import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { AISpanType } from '@mastra/core/ai-tracing';
import { logStepStart, logStepEnd, logError } from '../config/logger';

const MAX_ITERATIONS = 10;
const DEFAULT_QUALITY_THRESHOLD = 80;

const contentInputSchema = z.object({
  topic: z.string().describe('Topic to create content about'),
  contentType: z.enum(['blog', 'report', 'script', 'social']).describe('Type of content to create'),
  targetAudience: z.string().optional().describe('Target audience for the content'),
  qualityThreshold: z.number().min(0).max(100).default(DEFAULT_QUALITY_THRESHOLD),
});

const researchOutputSchema = z.object({
  topic: z.string(),
  contentType: z.string(),
  targetAudience: z.string().optional(),
  qualityThreshold: z.number(),
  research: z.object({
    summary: z.string(),
    keyPoints: z.array(z.string()),
    sources: z.array(z.string()).optional(),
    facts: z.array(z.string()).optional(),
  }),
});

const draftOutputSchema = z.object({
  topic: z.string(),
  contentType: z.string(),
  targetAudience: z.string().optional(),
  qualityThreshold: z.number(),
  research: researchOutputSchema.shape.research,
  draft: z.object({
    content: z.string(),
    wordCount: z.number(),
    structure: z.array(z.string()).optional(),
  }),
});

const reviewOutputSchema = z.object({
  topic: z.string(),
  contentType: z.string(),
  targetAudience: z.string().optional(),
  qualityThreshold: z.number(),
  research: researchOutputSchema.shape.research,
  content: z.string(),
  wordCount: z.number(),
  score: z.number(),
  feedback: z.array(z.string()),
  approved: z.boolean(),
  iteration: z.number(),
  scoreHistory: z.array(z.number()),
});

const finalOutputSchema = z.object({
  content: z.string(),
  score: z.number(),
  iterations: z.number(),
  feedback: z.array(z.string()),
  metadata: z.object({
    topic: z.string(),
    contentType: z.string(),
    targetAudience: z.string().optional(),
    wordCount: z.number(),
    qualityThreshold: z.number(),
    scoreHistory: z.array(z.number()),
    generatedAt: z.string(),
  }),
});

const researchTopicStep = createStep({
  id: 'research-topic',
  description: 'Researches the topic using researchAgent',
  inputSchema: contentInputSchema,
  outputSchema: researchOutputSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('research-topic', { topic: inputData.topic });

    await writer?.write({
      type: 'step-start',
      stepId: 'research-topic',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'research-agent-call',
      input: { topic: inputData.topic },
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: `Researching topic: ${inputData.topic}...`,
      });

      const agent = mastra?.getAgent('researchAgent');
      let research = {
        summary: `Research summary for ${inputData.topic}`,
        keyPoints: [`Key point 1 about ${inputData.topic}`, `Key point 2 about ${inputData.topic}`],
        sources: [] as string[],
        facts: [] as string[],
      };

      if (agent) {
        await writer?.write({
          type: 'progress',
          percent: 50,
          message: 'AI researching topic...',
        });

        const prompt = `Research the topic "${inputData.topic}" for a ${inputData.contentType} 
        ${inputData.targetAudience ? `targeting ${inputData.targetAudience}` : ''}.
        Provide a summary, key points, relevant sources, and interesting facts.`;

        const response = await agent.generate(prompt, {
          output: z.object({
            summary: z.string(),
            keyPoints: z.array(z.string()),
            sources: z.array(z.string()).optional(),
            facts: z.array(z.string()).optional(),
          }),
        });

        research = {
          summary: response.object.summary,
          keyPoints: response.object.keyPoints,
          sources: response.object.sources ?? [],
          facts: response.object.facts ?? [],
        };
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Research complete...',
      });

      const result: z.infer<typeof researchOutputSchema> = {
        topic: inputData.topic,
        contentType: inputData.contentType,
        targetAudience: inputData.targetAudience,
        qualityThreshold: inputData.qualityThreshold,
        research,
      };

      span?.end({
        output: { keyPointsCount: research.keyPoints.length, hasAgent: !!agent },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'research-topic',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('research-topic', { keyPointsCount: research.keyPoints.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('research-topic', error, { topic: inputData.topic });

      await writer?.write({
        type: 'step-error',
        stepId: 'research-topic',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const draftContentStep = createStep({
  id: 'draft-content',
  description: 'Creates initial content draft using copywriterAgent',
  inputSchema: researchOutputSchema,
  outputSchema: draftOutputSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('draft-content', { topic: inputData.topic, contentType: inputData.contentType });

    await writer?.write({
      type: 'step-start',
      stepId: 'draft-content',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'copywriter-agent-call',
      input: { topic: inputData.topic, contentType: inputData.contentType },
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: `Drafting ${inputData.contentType}...`,
      });

      const agent = mastra?.getAgent('copywriterAgent');
      let content = '';
      let structure: string[] = [];

      if (agent) {
        await writer?.write({
          type: 'progress',
          percent: 50,
          message: 'AI writing content draft...',
        });

        const prompt = `Write a ${inputData.contentType} about "${inputData.topic}".
        
        Research Summary: ${inputData.research.summary}
        Key Points to Cover: ${inputData.research.keyPoints.join(', ')}
        ${inputData.targetAudience ? `Target Audience: ${inputData.targetAudience}` : ''}
        
        Create engaging, well-structured content.`;

        const response = await agent.generate(prompt, {
          output: z.object({
            content: z.string(),
            structure: z.array(z.string()).optional(),
          }),
        });

        content = response.object.content;
        structure = response.object.structure ?? [];
      } else {
        content = `# ${inputData.topic}\n\n${inputData.research.summary}\n\n## Key Points\n\n${inputData.research.keyPoints.map(p => `- ${p}`).join('\n')}`;
        structure = ['Introduction', 'Key Points', 'Conclusion'];
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Draft complete...',
      });

      const wordCount = content.split(/\s+/).length;

      const result: z.infer<typeof draftOutputSchema> = {
        topic: inputData.topic,
        contentType: inputData.contentType,
        targetAudience: inputData.targetAudience,
        qualityThreshold: inputData.qualityThreshold,
        research: inputData.research,
        draft: { content, wordCount, structure },
      };

      span?.end({
        output: { wordCount, hasAgent: !!agent },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'draft-content',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('draft-content', { wordCount }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('draft-content', error, { topic: inputData.topic });

      await writer?.write({
        type: 'step-error',
        stepId: 'draft-content',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const initialReviewStep = createStep({
  id: 'initial-review',
  description: 'Performs initial review of the draft',
  inputSchema: draftOutputSchema,
  outputSchema: reviewOutputSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('initial-review', { topic: inputData.topic });

    await writer?.write({
      type: 'step-start',
      stepId: 'initial-review',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'editor-agent-review',
      input: { wordCount: inputData.draft.wordCount },
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 30,
        message: 'Evaluating content quality...',
      });

      const editorAgent = mastra?.getAgent('editorAgent');
      const evaluationAgent = mastra?.getAgent('evaluationAgent');

      let score = 70;
      let feedback: string[] = [];

      if (evaluationAgent) {
        const evalResponse = await evaluationAgent.generate(
          `Evaluate this ${inputData.contentType} about "${inputData.topic}". Rate it 0-100 and provide specific feedback.\n\nContent:\n${inputData.draft.content}`,
          {
            output: z.object({
              score: z.number().min(0).max(100),
              feedback: z.array(z.string()),
            }),
          }
        );
        score = evalResponse.object.score;
        feedback = evalResponse.object.feedback;
      } else if (editorAgent) {
        const editResponse = await editorAgent.generate(
          `Review this ${inputData.contentType}. Rate quality 0-100 and list improvements.\n\nContent:\n${inputData.draft.content}`,
          {
            output: z.object({
              score: z.number().min(0).max(100),
              feedback: z.array(z.string()),
            }),
          }
        );
        score = editResponse.object.score;
        feedback = editResponse.object.feedback;
      } else {
        feedback = ['Consider adding more detail', 'Improve transitions between sections'];
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: `Initial score: ${score}/100...`,
      });

      const approved = score >= inputData.qualityThreshold;

      const result: z.infer<typeof reviewOutputSchema> = {
        topic: inputData.topic,
        contentType: inputData.contentType,
        targetAudience: inputData.targetAudience,
        qualityThreshold: inputData.qualityThreshold,
        research: inputData.research,
        content: inputData.draft.content,
        wordCount: inputData.draft.wordCount,
        score,
        feedback,
        approved,
        iteration: 1,
        scoreHistory: [score],
      };

      span?.end({
        output: { score, approved, feedbackCount: feedback.length },
        metadata: { responseTime: Date.now() - startTime, iteration: 1 },
      });

      await writer?.write({
        type: 'iteration',
        iteration: 1,
        score,
        approved,
        message: `Iteration 1: Score ${score}/${inputData.qualityThreshold}`,
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'initial-review',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('initial-review', { score, approved, iteration: 1 }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('initial-review', error, { topic: inputData.topic });

      await writer?.write({
        type: 'step-error',
        stepId: 'initial-review',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const refineContentStep = createStep({
  id: 'refine-content',
  description: 'Refines content based on feedback and re-evaluates',
  inputSchema: reviewOutputSchema,
  outputSchema: reviewOutputSchema,
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    const nextIteration = inputData.iteration + 1;
    logStepStart('refine-content', { topic: inputData.topic, iteration: nextIteration });

    await writer?.write({
      type: 'step-start',
      stepId: 'refine-content',
      timestamp: Date.now(),
    });

    if (nextIteration > MAX_ITERATIONS) {
      const error = new Error(`Maximum iterations (${MAX_ITERATIONS}) exceeded. Final score: ${inputData.score}`);
      logError('refine-content', error, { iteration: nextIteration, score: inputData.score });
      throw error;
    }

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'content-refinement',
      input: { iteration: nextIteration, previousScore: inputData.score },
      metadata: { iteration: nextIteration },
    });

    try {
      await writer?.write({
        type: 'iteration',
        iteration: nextIteration,
        score: inputData.score,
        approved: false,
        message: `Starting iteration ${nextIteration}...`,
      });

      await writer?.write({
        type: 'progress',
        percent: 20,
        message: `Refining content (iteration ${nextIteration})...`,
      });

      const copywriterAgent = mastra?.getAgent('copywriterAgent');
      const editorAgent = mastra?.getAgent('editorAgent');
      const evaluationAgent = mastra?.getAgent('evaluationAgent');

      let refinedContent = inputData.content;

      if (copywriterAgent || editorAgent) {
        const agent = copywriterAgent ?? editorAgent;
        const refinePrompt = `Improve this ${inputData.contentType} based on feedback:

Feedback:
${inputData.feedback.map(f => `- ${f}`).join('\n')}

Current Content:
${inputData.content}

Rewrite with improvements.`;

        const response = await agent!.generate(refinePrompt);
        refinedContent = response.text;
      }

      await writer?.write({
        type: 'progress',
        percent: 60,
        message: 'Re-evaluating refined content...',
      });

      let newScore = inputData.score + 5;
      let newFeedback: string[] = [];

      if (evaluationAgent) {
        const evalResponse = await evaluationAgent.generate(
          `Re-evaluate this improved ${inputData.contentType}. Rate 0-100 and provide remaining feedback.\n\nContent:\n${refinedContent}`,
          {
            output: z.object({
              score: z.number().min(0).max(100),
              feedback: z.array(z.string()),
            }),
          }
        );
        newScore = evalResponse.object.score;
        newFeedback = evalResponse.object.feedback;
      } else if (editorAgent) {
        const editResponse = await editorAgent.generate(
          `Review this refined content. Rate 0-100.\n\nContent:\n${refinedContent}`,
          {
            output: z.object({
              score: z.number().min(0).max(100),
              feedback: z.array(z.string()),
            }),
          }
        );
        newScore = editResponse.object.score;
        newFeedback = editResponse.object.feedback;
      } else {
        newScore = Math.min(100, inputData.score + Math.floor(Math.random() * 10) + 5);
        newFeedback = newScore >= inputData.qualityThreshold ? [] : ['Minor improvements still possible'];
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: `Iteration ${nextIteration}: Score ${newScore}/100...`,
      });

      const approved = newScore >= inputData.qualityThreshold;
      const wordCount = refinedContent.split(/\s+/).length;

      const result: z.infer<typeof reviewOutputSchema> = {
        topic: inputData.topic,
        contentType: inputData.contentType,
        targetAudience: inputData.targetAudience,
        qualityThreshold: inputData.qualityThreshold,
        research: inputData.research,
        content: refinedContent,
        wordCount,
        score: newScore,
        feedback: newFeedback,
        approved,
        iteration: nextIteration,
        scoreHistory: [...inputData.scoreHistory, newScore],
      };

      span?.end({
        output: { score: newScore, approved, iteration: nextIteration, improvement: newScore - inputData.score },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'iteration',
        iteration: nextIteration,
        score: newScore,
        approved,
        message: `Iteration ${nextIteration}: Score ${newScore}/${inputData.qualityThreshold} - ${approved ? 'APPROVED' : 'needs refinement'}`,
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'refine-content',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('refine-content', { score: newScore, approved, iteration: nextIteration }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
      logError('refine-content', error, { iteration: nextIteration });

      await writer?.write({
        type: 'step-error',
        stepId: 'refine-content',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const finalizeContentStep = createStep({
  id: 'finalize-content',
  description: 'Finalizes and formats the approved content',
  inputSchema: reviewOutputSchema,
  outputSchema: finalOutputSchema,
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();
    logStepStart('finalize-content', { topic: inputData.topic, finalScore: inputData.score });

    await writer?.write({
      type: 'step-start',
      stepId: 'finalize-content',
      timestamp: Date.now(),
    });

    await writer?.write({
      type: 'progress',
      percent: 50,
      message: 'Finalizing content...',
    });

    const result: z.infer<typeof finalOutputSchema> = {
      content: inputData.content,
      score: inputData.score,
      iterations: inputData.iteration,
      feedback: inputData.feedback,
      metadata: {
        topic: inputData.topic,
        contentType: inputData.contentType,
        targetAudience: inputData.targetAudience,
        wordCount: inputData.wordCount,
        qualityThreshold: inputData.qualityThreshold,
        scoreHistory: inputData.scoreHistory,
        generatedAt: new Date().toISOString(),
      },
    };

    await writer?.write({
      type: 'step-complete',
      stepId: 'finalize-content',
      success: true,
      duration: Date.now() - startTime,
    });

    logStepEnd('finalize-content', { iterations: inputData.iteration, finalScore: inputData.score }, Date.now() - startTime);
    return result;
  },
});

export const contentReviewWorkflow = createWorkflow({
  id: 'content-review-workflow',
  description: 'Content creation workflow with iterative quality review using .dowhile() loop',
  inputSchema: contentInputSchema,
  outputSchema: finalOutputSchema,
})
  .then(researchTopicStep)
  .then(draftContentStep)
  .then(initialReviewStep)
  .dowhile(refineContentStep, async ({ inputData }) => {
    const data = inputData as z.infer<typeof reviewOutputSchema>;
    return !data.approved && data.iteration < MAX_ITERATIONS;
  })
  .then(finalizeContentStep);

contentReviewWorkflow.commit();
