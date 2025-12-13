import { createStep, createWorkflow } from '@mastra/core/workflows';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { z } from 'zod';

import { logError, logStepEnd, logStepStart } from '../config/logger';

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
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('research-topic', { topic: inputData.topic });

    await writer?.custom({
      type: 'data-workflow-step-start',
      data: {
        type: "workflow",
        data: "research-topic",
        id: "research-topic",
      },
      id: "research-topic",
    });

    const tracer = trace.getTracer('content-review');
    const span = tracer.startSpan('research-agent-call', {
      attributes: { topic: inputData.topic },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "in-progress",
          message: `Researching topic: ${inputData.topic}...`,
          stage: "researchAgent",
        },
        id: "research-topic",
      });

      const agent = mastra?.getAgent('researchAgent');
      const research = {
        summary: `Research summary for ${inputData.topic}`,
        keyPoints: [`Key point 1 about ${inputData.topic}`, `Key point 2 about ${inputData.topic}`],
        sources: [] as string[],
        facts: [] as string[],
      };

      if (agent) {
        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: "50%",
            message: "AI researching topic...",
          stage: "researchAgent",
          },
          id: "research-topic",

        });

        const prompt = `Research the topic "${inputData.topic}" for a ${inputData.contentType}
        ${inputData.targetAudience ? `targeting ${inputData.targetAudience}` : ''}.
        Provide a summary, key points, relevant sources, and interesting facts.`;

        const stream = await agent.stream(prompt, {
          output: z.object({
            summary: z.string(),
            keyPoints: z.array(z.string()),
            sources: z.array(z.string()).optional(),
            facts: z.array(z.string()).optional(),
          }),
        } as any);

        // Stream partial output to the workflow writer so clients see progress.
        await stream.textStream.pipeTo(writer);

        // Wait for final text and attempt to parse JSON; fall back to defaults if parse fails.
        const finalText = await stream.text;
        let parsedResearch: z.infer<typeof researchOutputSchema>['research'] | null = null;
        try {
          parsedResearch = JSON.parse(finalText) as z.infer<typeof researchOutputSchema>['research'];
        } catch {
          parsedResearch = null;
        }

        if (parsedResearch) {
          research.summary = parsedResearch.summary;
          research.keyPoints = parsedResearch.keyPoints;
          research.sources = parsedResearch.sources ?? [];
          research.facts = parsedResearch.facts ?? [];
        }
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "90%",
          message: "Research complete.",
          stage: "researchAgent",
        },
        id: "research-topic",
      });

      const result: z.infer<typeof researchOutputSchema> = {
        topic: inputData.topic,
        contentType: inputData.contentType,
        targetAudience: inputData.targetAudience,
        qualityThreshold: inputData.qualityThreshold,
        research,
      };

      span.setAttribute('keyPointsCount', research.keyPoints.length);
      span.setAttribute('hasAgent', Boolean(agent));
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();

      await writer?.custom({
        type: 'data-workflow-step-complete',
        data: {
          stepId: 'research-topic',
          success: true,
          duration: Date.now() - startTime,
      },
      id: "research-topic",
      });

      logStepEnd('research-topic', { keyPointsCount: research.keyPoints.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('research-topic', error, { topic: inputData.topic });

      await writer?.custom({
        type: 'data-workflow-step-error',
        data: {
        stepId: 'research-topic',
        error: error instanceof Error ? error.message : 'Unknown error',
        },
        id: "research-topic",
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
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('draft-content', { topic: inputData.topic, contentType: inputData.contentType });

    await writer?.custom({
      type: 'data-workflow-step-start',
      data: {
        type: "workflow",
        data: "draft-content",
        id: "draft-content",
      },
      id: "draft-content",
    });

    const tracer = trace.getTracer('content-review');
    const span = tracer.startSpan('copywriter-agent-call', {
      attributes: {
        topic: inputData.topic,
        contentType: inputData.contentType,
      },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "in-progress",
          message: "Starting content drafting",
          stage: "first",
        },
        id: "draft-content",
      });

      const agent = mastra?.getAgent('copywriterAgent');
      let content = '';
      let structure: string[] = [];

      if (agent) {
        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: "40%",
            message: "AI writing content draft...",
            stage: "second",
          },
          id: "draft-content",
        });

        const prompt = `Write a ${inputData.contentType} about "${inputData.topic}".

        Research Summary: ${inputData.research.summary}
        Key Points to Cover: ${inputData.research.keyPoints.join(', ')}
        ${inputData.targetAudience ? `Target Audience: ${inputData.targetAudience}` : ''}

        Create engaging, well-structured content.`;

        const stream = await agent.stream(prompt, {
          output: z.object({
            content: z.string(),
            structure: z.array(z.string()).optional(),
          }),
        } as any);

        await stream.textStream.pipeTo(writer);
        const finalText = await stream.text;
        let draftResult: z.infer<typeof draftOutputSchema>['draft'] | null = null;
        try {
          draftResult = JSON.parse(finalText) as z.infer<typeof draftOutputSchema>['draft'];
        } catch {
          draftResult = null;
        }
        if (draftResult) {
          content = draftResult.content;
          structure = draftResult.structure ?? [];
        }
      } else {
        content = `# ${inputData.topic}\n\n${inputData.research.summary}\n\n## Key Points\n\n${inputData.research.keyPoints.map(p => `- ${p}`).join('\n')}`;
        structure = ['Introduction', 'Key Points', 'Conclusion'];
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "90%",
          message: "Drafting complete.",
          stage: "third",
        },
        id: "draft-content",
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

      span.setAttribute('wordCount', wordCount);
      span.setAttribute('hasAgent', Boolean(agent));
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();

      await writer?.custom({
        type: 'data-workflow-step-complete',
        data: {
        stepId: 'draft-content',
        success: true,
        duration: Date.now() - startTime,
        },
        id: "draft-content",
      });

      logStepEnd('draft-content', { wordCount }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('draft-content', error, { topic: inputData.topic });

      await writer?.custom({
        type: 'data-workflow-step-error',
        data: {
          stepId: 'draft-content',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        id: "draft-content",
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
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('initial-review', { topic: inputData.topic });

    await writer?.custom({
      type: 'data-workflow-step-start',
      data: {
        type: "workflow",
        data: "initial-review",
        id: "initial-review",
      }
    });

    const tracer = trace.getTracer('content-review');
    const span = tracer.startSpan('editor-agent-review', {
      attributes: { wordCount: inputData.draft.wordCount },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "30%",
          message: 'Evaluating content quality...',
          stage: "researchAgent",
        },
        id: "initial-review",
      });

      const editorAgent = mastra?.getAgent('editorAgent');
      const evaluationAgent = mastra?.getAgent('evaluationAgent');

      let score = 70;
      let feedback: string[] = [];

      if (evaluationAgent) {
        const stream = await evaluationAgent.stream(
          `Evaluate this ${inputData.contentType} about "${inputData.topic}". Rate it 0-100 and provide specific feedback.\n\nContent:\n${inputData.draft.content}`,
          {
            output: z.object({
              score: z.number().min(0).max(100),
              feedback: z.array(z.string()),
            }),
          } as any
        );

        await stream.textStream.pipeTo(writer);
        const finalText = await stream.text;
        let parsedEval: { score: number; feedback: string[] } | null = null;
        try {
          parsedEval = JSON.parse(finalText) as { score: number; feedback: string[] };
        } catch {
          parsedEval = null;
        }
        if (parsedEval) {
          score = parsedEval.score;
          feedback = parsedEval.feedback;
        }
      } else if (editorAgent) {
        const stream = await editorAgent.stream(
          `Review this ${inputData.contentType}. Rate quality 0-100 and list improvements.\n\nContent:\n${inputData.draft.content}`,
          {
            output: z.object({
              score: z.number().min(0).max(100),
              feedback: z.array(z.string()),
            }),
          } as any
        );

        await stream.textStream.pipeTo(writer);
        const finalTextEdit = await stream.text;
        let parsedEdit: { score: number; feedback: string[] } | null = null;
        try {
          parsedEdit = JSON.parse(finalTextEdit) as { score: number; feedback: string[] };
        } catch {
          parsedEdit = null;
        }
        if (parsedEdit) {
          score = parsedEdit.score;
          feedback = parsedEdit.feedback;
        }
      } else {
        feedback = ['Consider adding more detail', 'Improve transitions between sections'];
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "90%",
          message: `Initial score: ${score}/100...`,
          stage: "researchAgent",
        },
        id: "initial-review",
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

      span.setAttribute('score', score);
      span.setAttribute('approved', approved);
      span.setAttribute('feedbackCount', feedback.length);
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "100%",
          message: `Iteration 1: Score ${score}/${inputData.qualityThreshold}`,
          stage: "researchAgent",
        },
        id: "initial-review",
      });

      
      logStepEnd('initial-review', { score, approved, iteration: 1 }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('initial-review', error, { topic: inputData.topic });

      await writer?.custom({
        type: 'data-workflow-step-error',
        data: {
          stepId: 'initial-review',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
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
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    const nextIteration = inputData.iteration + 1;
    logStepStart('refine-content', { topic: inputData.topic, iteration: nextIteration });

    await writer?.custom({
      type: 'data-workflow-step-start',
      data: {
        type: "workflow",
        data: "refine-content",
        id: "refine-content",
      },
      id: "refine-content",
    });

    if (nextIteration > MAX_ITERATIONS) {
      const error = new Error(`Maximum iterations (${MAX_ITERATIONS}) exceeded. Final score: ${inputData.score}`);
      logError('refine-content', error, { iteration: nextIteration, score: inputData.score });
      throw error;
    }

    const tracer = trace.getTracer('content-review');
    const span = tracer.startSpan('content-refinement', {
      attributes: {
        iteration: nextIteration,
        previousScore: inputData.score,
      },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "in-progress",
          message: `Starting iteration ${nextIteration}...`,
          stage: "researchAgent",
        },
        id: "refine-content",
      });

      const copywriterAgent = mastra?.getAgent('copywriterAgent');
      const editorAgent = mastra?.getAgent('editorAgent');
      const evaluationAgent = mastra?.getAgent('evaluationAgent');

      let refinedContent = inputData.content;

      if (copywriterAgent || editorAgent) {
        const agent = copywriterAgent ?? editorAgent;
        if (!agent) {
          throw new Error('No copywriter/editor agent available');
        }
        const refinePrompt = `Improve this ${inputData.contentType} based on feedback:

Feedback:
${inputData.feedback.map(f => `- ${f}`).join('\n')}

Current Content:
${inputData.content}

Rewrite with improvements.`;

        const stream = await agent.stream(refinePrompt);
        // Stream partial rewrite progress
        await stream.textStream.pipeTo(writer);
        const rewrittenText = await stream.text;
        refinedContent = rewrittenText;
      }
// FIXME: @Copilot statu
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "60%",
          message: 'Re-evaluating refined content...',
          stage: "researchAgent",
        },
        id: "refine-content",
      });

      let newScore = inputData.score + 5;
      let newFeedback: string[] = [];

      if (evaluationAgent) {
        const evalStream = await evaluationAgent.stream(
          `Re-evaluate this improved ${inputData.contentType}. Rate 0-100 and provide remaining feedback.\n\nContent:\n${refinedContent}`
        );

        await evalStream.textStream.pipeTo(writer);
        const evalFinalText = await evalStream.text;

        const parsedEval = (() => {
          try {
            return JSON.parse(evalFinalText || '');
          } catch {
            return null;
          }
        })();

        if (parsedEval && typeof parsedEval.score === 'number' && Array.isArray(parsedEval.feedback)) {
          newScore = parsedEval.score;
          newFeedback = parsedEval.feedback;
        }
      } else if (editorAgent) {
        const editStream = await editorAgent.stream(
          `Review this refined content. Rate 0-100.\n\nContent:\n${refinedContent}`
        );

        await editStream.textStream.pipeTo(writer);
        const editFinalText = await editStream.text;

        const parsedEdit = (() => {
          try {
            return JSON.parse(editFinalText || '');
          } catch {
            return null;
          }
        })();

        if (parsedEdit && typeof parsedEdit.score === 'number' && Array.isArray(parsedEdit.feedback)) {
          newScore = parsedEdit.score;
          newFeedback = parsedEdit.feedback;
        }
      } else {
        newScore = Math.min(100, inputData.score + Math.floor(Math.random() * 10) + 5);
        newFeedback = newScore >= inputData.qualityThreshold ? [] : ['Minor improvements still possible'];
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "90%",
          message: `Iteration ${nextIteration}: Score ${newScore}/100...`,
          stage: "researchAgent",
        }
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

      span.setAttribute('score', newScore);
      span.setAttribute('approved', approved);
      span.setAttribute('iteration', nextIteration);
      span.setAttribute('improvement', newScore - inputData.score);
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "100%",
          message: `Iteration ${nextIteration}: Score ${newScore}/${inputData.qualityThreshold} - ${approved ? 'APPROVED' : 'needs refinement'}`,
          stage: "researchAgent",
        }
      });

      
      logStepEnd('refine-content', { score: newScore, approved, iteration: nextIteration }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('refine-content', error, { iteration: nextIteration });

      await writer?.custom({
        type: 'data-workflow-step-error',
        data: {
          stepId: 'refine-content',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
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

    await writer?.custom({
      type: 'data-workflow-step-start',
      data: {
        type: "workflow",
        data: "finalize-content",
        id: "finalize-content",
      }
    });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "50%",
        message: 'Finalizing content...',
        stage: "researchAgent",
      }
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

    await writer?.custom({
      type: 'data-workflow-step-complete',
      data: {
        stepId: 'finalize-content',
        success: true,
        duration: Date.now() - startTime,
      }
    });

    logStepEnd('finalize-content', { iterations: inputData.iteration, finalScore: inputData.score }, Date.now() - startTime);
    return result;
  },
});

export const contentReviewWorkflow = createWorkflow({
  id: 'contentReviewWorkflow',
  description: 'Content creation workflow with iterative quality review using .dowhile() loop',
  inputSchema: contentInputSchema,
  outputSchema: finalOutputSchema,
})
  .then(researchTopicStep)
  .then(draftContentStep)
  .then(initialReviewStep)
  .dowhile(refineContentStep, async ({ inputData }: { inputData: z.infer<typeof reviewOutputSchema> }) =>
    !inputData.approved && inputData.iteration < MAX_ITERATIONS
  )
  .then(finalizeContentStep);

contentReviewWorkflow.commit();
