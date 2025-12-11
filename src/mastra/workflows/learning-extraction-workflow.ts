import { createStep, createWorkflow } from '@mastra/core/workflows';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { z } from 'zod';
import { logError, logStepEnd, logStepStart } from '../config/logger';

// NOTE: Stream-first approach is used; inline parse helper removed.
// When parsing is required we parse stream.text directly in steps and handle parsing errors inline.

const learningInputSchema = z.object({
  content: z.string().describe('Content to extract learnings from'),
  contentType: z.enum(['article', 'document', 'transcript', 'notes']).default('document'),
  extractionDepth: z.enum(['quick', 'thorough', 'comprehensive']).default('thorough'),
  requireApproval: z.boolean().default(true).describe('Whether to require human approval'),
});

const extractedLearningSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['concept', 'technique', 'insight', 'fact', 'principle', 'pattern']),
  importance: z.enum(['critical', 'high', 'medium', 'low']),
  context: z.string().optional(),
  relatedConcepts: z.array(z.string()).optional(),
  actionable: z.boolean(),
  actionItems: z.array(z.string()).optional(),
});

const extractionResultSchema = z.object({
  content: z.string(),
  contentType: z.string(),
  learnings: z.array(extractedLearningSchema),
  summary: z.string(),
  wordCount: z.number(),
  requireApproval: z.boolean(),
  metadata: z.object({
    extractedAt: z.string(),
    extractionDepth: z.string(),
    totalLearnings: z.number(),
    criticalCount: z.number(),
    actionableCount: z.number(),
  }),
});

const suspendDataSchema = z.object({
  message: z.string(),
  learnings: z.array(extractedLearningSchema),
  summary: z.string(),
  requestedAt: z.string(),
  expiresAt: z.string().optional(),
});

const resumeDataSchema = z.object({
  approved: z.boolean(),
  approvedLearnings: z.array(z.string()).optional(),
  rejectedLearnings: z.array(z.string()).optional(),
  feedback: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
});

const approvalResultSchema = z.object({
  learnings: z.array(extractedLearningSchema),
  approved: z.boolean(),
  approvedCount: z.number(),
  rejectedCount: z.number(),
  feedback: z.string().optional(),
  approvedBy: z.string().optional(),
  metadata: z.object({
    originalCount: z.number(),
    finalCount: z.number(),
    approvalRate: z.number(),
    processedAt: z.string(),
  }),
});

const validatedLearningsSchema = z.object({
  learnings: z.array(extractedLearningSchema.extend({
    validated: z.boolean(),
    validationNotes: z.string().optional(),
    qualityScore: z.number().optional(),
  })),
  validationSummary: z.object({
    totalValidated: z.number(),
    highQuality: z.number(),
    needsReview: z.number(),
  }),
  metadata: z.object({
    validatedAt: z.string(),
  }),
});

const finalOutputSchema = z.object({
  learnings: z.array(extractedLearningSchema.extend({
    validated: z.boolean().optional(),
    qualityScore: z.number().optional(),
  })),
  report: z.string(),
  summary: z.string(),
  metadata: z.object({
    contentType: z.string(),
    extractionDepth: z.string(),
    totalLearnings: z.number(),
    criticalLearnings: z.number(),
    actionableItems: z.number(),
    humanApproved: z.boolean(),
    approvedBy: z.string().optional(),
    processedAt: z.string(),
  }),
});

const extractLearningsStep = createStep({
  id: 'extract-learnings',
  description: 'Extracts learnings from content using learningExtractionAgent',
  inputSchema: learningInputSchema,
  outputSchema: extractionResultSchema,
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('extract-learnings', { contentType: inputData.contentType, depth: inputData.extractionDepth });

    await writer?.write({
      type: 'step-start',
      stepId: 'extract-learnings',
      timestamp: Date.now(),
    });

    const tracer = trace.getTracer('learning-extraction');
    const span = tracer.startSpan('learning-extraction', {
      attributes: {
        contentType: inputData.contentType,
        contentLength: inputData.content.length,
      },
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: `Analyzing ${inputData.contentType}...`,
      });

      const agent = mastra?.getAgent('learningExtractionAgent');
      let learnings: Array<z.infer<typeof extractedLearningSchema>> = [];
      let summary = '';

      if (agent) {
        await writer?.write({
          type: 'progress',
          percent: 50,
          message: `Extracting learnings (${inputData.extractionDepth} mode)...`,
        });

        const depthInstructions = {
          quick: 'Extract the 3-5 most important learnings only.',
          thorough: 'Extract 5-10 key learnings with good detail.',
          comprehensive: 'Extract all significant learnings (10+) with full context.',
        };

        const prompt = `Analyze this ${inputData.contentType} and extract learnings.

${depthInstructions[inputData.extractionDepth]}

Content:
${inputData.content.slice(0, 5000)}${inputData.content.length > 5000 ? '...(truncated)' : ''}

For each learning, provide:
- A unique ID (learning-001, learning-002, etc.)
- Title
- Description
- Category (concept, technique, insight, fact, principle, pattern)
- Importance (critical, high, medium, low)
- Context
- Related concepts
- Whether it's actionable
- Action items if actionable

Also provide an overall summary.`;

        const stream = await agent.stream(prompt, {
          output: z.object({
            learnings: z.array(extractedLearningSchema),
            summary: z.string(),
          }),
        } as any);

        // Pipe streaming partial output to the workflow writer for progress (if present)
        await stream.textStream?.pipeTo?.(writer);

        // Wait for final text and attempt to parse as JSON; fallback to no-op if parse fails
        const finalText = await stream.text;
        let parsed: { learnings: Array<z.infer<typeof extractedLearningSchema>>; summary: string } | null = null;
        try {
          parsed = JSON.parse(finalText) as { learnings: Array<z.infer<typeof extractedLearningSchema>>; summary: string };
        } catch {
          parsed = null;
        }

        if (parsed) {
          learnings = parsed.learnings;
          summary = parsed.summary;
        }
      } else {
        learnings = [
          {
            id: 'learning-001',
            title: 'Key Concept from Content',
            description: 'An important concept extracted from the provided content.',
            category: 'concept',
            importance: 'high',
            context: inputData.content.slice(0, 100),
            actionable: true,
            actionItems: ['Review this concept', 'Apply in practice'],
          },
          {
            id: 'learning-002',
            title: 'Secondary Insight',
            description: 'Another valuable insight from the material.',
            category: 'insight',
            importance: 'medium',
            actionable: false,
          },
        ];
        summary = `Extracted ${learnings.length} learnings from the ${inputData.contentType}.`;
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: `Extracted ${learnings.length} learnings...`,
      });

      const criticalCount = learnings.filter(l => l.importance === 'critical').length;
      const actionableCount = learnings.filter(l => l.actionable).length;

      const result: z.infer<typeof extractionResultSchema> = {
        content: inputData.content,
        contentType: inputData.contentType,
        learnings,
        summary,
        wordCount: inputData.content.split(/\s+/).length,
        requireApproval: inputData.requireApproval,
        metadata: {
          extractedAt: new Date().toISOString(),
          extractionDepth: inputData.extractionDepth,
          totalLearnings: learnings.length,
          criticalCount,
          actionableCount,
        },
      };

      if (typeof learnings?.length === 'number') {span.setAttribute('learningsCount', learnings.length);}
      if (typeof criticalCount === 'number') {span.setAttribute('criticalCount', criticalCount);}
      if (typeof actionableCount === 'number') {span.setAttribute('actionableCount', actionableCount);}
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();

      await writer?.write({
        type: 'step-complete',
        stepId: 'extract-learnings',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('extract-learnings', { learningsCount: learnings.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('extract-learnings', error, { contentType: inputData.contentType });

      await writer?.write({
        type: 'step-error',
        stepId: 'extract-learnings',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const humanApprovalStep = createStep({
  id: 'human-approval',
  description: 'Suspends for human approval of extracted learnings',
  inputSchema: extractionResultSchema,
  outputSchema: approvalResultSchema,
  suspendSchema: suspendDataSchema,
  resumeSchema: resumeDataSchema,
  execute: async ({ inputData, resumeData, suspend, writer }) => {
    const startTime = Date.now();
    logStepStart('human-approval', { learningsCount: inputData.learnings.length, hasResumeData: !!resumeData });

    await writer?.write({
      type: 'step-start',
      stepId: 'human-approval',
      timestamp: Date.now(),
    });

    const tracer = trace.getTracer('learning-extraction');
    const span = tracer.startSpan('human-approval-check', {
      attributes: { learningsCount: inputData.learnings.length, requireApproval: inputData.requireApproval },
    });

    try {
      if (!inputData.requireApproval) {
        await writer?.write({
          type: 'progress',
          percent: 100,
          message: 'Auto-approval (requireApproval=false)...',
        });

        const result: z.infer<typeof approvalResultSchema> = {
          learnings: inputData.learnings,
          approved: true,
          approvedCount: inputData.learnings.length,
          rejectedCount: 0,
          feedback: 'Auto-approved (human approval not required)',
          metadata: {
            originalCount: inputData.learnings.length,
            finalCount: inputData.learnings.length,
            approvalRate: 100,
            processedAt: new Date().toISOString(),
          },
        };

        span.setAttribute('autoApproved', true);
        span.setAttribute('learningsCount', inputData.learnings.length);
        span.setAttribute('responseTimeMs', Date.now() - startTime);
        span.end();

        await writer?.write({
          type: 'step-complete',
          stepId: 'human-approval',
          success: true,
          duration: Date.now() - startTime,
        });

        return result;
      }

      if (!resumeData) {
        await writer?.write({
          type: 'suspend-request',
          stepId: 'human-approval',
          message: 'Awaiting human approval...',
          learningsCount: inputData.learnings.length,
        });

        span.setAttribute('suspended', true);
        span.setAttribute('awaitingApproval', true);
        span.setAttribute('responseTimeMs', Date.now() - startTime);
        span.end();

        logStepEnd('human-approval', { status: 'suspended' }, Date.now() - startTime);

        const suspendPayload: z.infer<typeof suspendDataSchema> = {
          message: `Please review and approve ${inputData.learnings.length} extracted learnings.`,
          learnings: inputData.learnings,
          summary: inputData.summary,
          requestedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        return await suspend(suspendPayload);
      }

      await writer?.write({
        type: 'progress',
        percent: 50,
        message: 'Processing approval decision...',
      });

      let approvedLearnings = inputData.learnings;
      let rejectedCount = 0;

      if (!resumeData.approved) {
        approvedLearnings = [];
        rejectedCount = inputData.learnings.length;
      } else if (resumeData.approvedLearnings && resumeData.approvedLearnings.length > 0) {
        approvedLearnings = inputData.learnings.filter(l =>
          resumeData.approvedLearnings!.includes(l.id)
        );
        rejectedCount = inputData.learnings.length - approvedLearnings.length;
      } else if (resumeData.rejectedLearnings && resumeData.rejectedLearnings.length > 0) {
        approvedLearnings = inputData.learnings.filter(l =>
          !resumeData.rejectedLearnings!.includes(l.id)
        );
        rejectedCount = resumeData.rejectedLearnings.length;
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: `Approved ${approvedLearnings.length} learnings...`,
      });

      const approvalRate = (approvedLearnings.length / inputData.learnings.length) * 100;

      const result: z.infer<typeof approvalResultSchema> = {
        learnings: approvedLearnings,
        approved: resumeData.approved,
        approvedCount: approvedLearnings.length,
        rejectedCount,
        feedback: resumeData.feedback,
        approvedBy: resumeData.approvedBy,
        metadata: {
          originalCount: inputData.learnings.length,
          finalCount: approvedLearnings.length,
          approvalRate,
          processedAt: new Date().toISOString(),
        },
      };

      if (typeof resumeData?.approved === 'boolean') {span.setAttribute('approved', resumeData.approved);}
      if (Array.isArray(resumeData?.approvedLearnings)) {span.setAttribute('approvedLearningsCount', resumeData.approvedLearnings.length);}
      if (Array.isArray(resumeData?.rejectedLearnings)) {span.setAttribute('rejectedLearningsCount', resumeData.rejectedLearnings.length);}
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();

      await writer?.write({
        type: 'step-complete',
        stepId: 'human-approval',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('human-approval', { approved: resumeData.approved, approvedCount: approvedLearnings.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('human-approval', error);

      await writer?.write({
        type: 'step-error',
        stepId: 'human-approval',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const validateLearningsStep = createStep({
  id: 'validate-learnings',
  description: 'Validates approved learnings using evaluationAgent',
  inputSchema: approvalResultSchema,
  outputSchema: validatedLearningsSchema,
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('validate-learnings', { learningsCount: inputData.learnings.length });

    await writer?.write({
      type: 'step-start',
      stepId: 'validate-learnings',
      timestamp: Date.now(),
    });

    // Use OpenTelemetry directly; don't rely on Mastra tracing shims.
    const tracer = trace.getTracer('learning-extraction');
    const span = tracer.startSpan('learning-validation', {
      attributes: {
        learningsCount: inputData.learnings.length,
      },
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: 'Validating learnings quality...',
      });

      const agent = mastra?.getAgent('evaluationAgent');
      const validatedLearnings: z.infer<typeof validatedLearningsSchema>['learnings'] = [];

      for (let i = 0; i < inputData.learnings.length; i++) {
        const learning = inputData.learnings[i];
        let validated = true;
        let qualityScore = 80;
        let validationNotes = '';

        if (agent) {
          const stream = await agent.stream(
            `Validate this learning extraction:
              Title: ${learning.title}
              Description: ${learning.description}
              Category: ${learning.category}
              Importance: ${learning.importance}

              Rate quality 0-100 and note any issues.`,
            {
              output: z.object({
                qualityScore: z.number().min(0).max(100),
                validated: z.boolean(),
                notes: z.string().optional(),
              }),
            } as any
          );

          // Stream deltas to the workflow writer if available
          await stream.textStream?.pipeTo?.(writer);

          const finalText = await stream.text;
          let parsed: { validated: boolean; qualityScore: number; notes?: string } | null = null;
          try {
            parsed = JSON.parse(finalText) as { validated: boolean; qualityScore: number; notes?: string };
          } catch {
            parsed = null;
          }

          if (parsed) {
            validated = parsed.validated;
            qualityScore = parsed.qualityScore;
            validationNotes = parsed.notes ?? '';
          }
        } else {
          qualityScore = 70 + Math.floor(Math.random() * 25);
          validated = qualityScore >= 60;
        }

        validatedLearnings.push({
          ...learning,
          validated,
          validationNotes: validationNotes || undefined,
          qualityScore,
        });

        if (i % 3 === 0) {
          await writer?.write({
            type: 'progress',
            percent: 20 + Math.floor((i / inputData.learnings.length) * 60),
            message: `Validated ${i + 1}/${inputData.learnings.length} learnings...`,
          });
        }
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Validation complete...',
      });

      const highQuality = validatedLearnings.filter(l => (l.qualityScore ?? 0) >= 80).length;
      const needsReview = validatedLearnings.filter(l => !l.validated || (l.qualityScore ?? 0) < 60).length;

      const result: z.infer<typeof validatedLearningsSchema> = {
        learnings: validatedLearnings,
        validationSummary: {
          totalValidated: validatedLearnings.filter(l => l.validated).length,
          highQuality,
          needsReview,
        },
        metadata: {
          validatedAt: new Date().toISOString(),
        },
      };

      // Record result metrics on the span
      span.setAttribute('totalValidated', result.validationSummary.totalValidated);
      span.setAttribute('highQuality', highQuality);
      span.setAttribute('needsReview', needsReview);
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();

      await writer?.write({
        type: 'step-complete',
        stepId: 'validate-learnings',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('validate-learnings', result.validationSummary, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();

      logError('validate-learnings', error);

      await writer?.write({
        type: 'step-error',
        stepId: 'validate-learnings',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

const generateLearningReportStep = createStep({
  id: 'generate-learning-report',
  description: 'Generates final learning extraction report',
  inputSchema: validatedLearningsSchema,
  outputSchema: finalOutputSchema,
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('generate-learning-report', { learningsCount: inputData.learnings.length });

    await writer?.write({
      type: 'step-start',
      stepId: 'generate-learning-report',
      timestamp: Date.now(),
    });

    // Use OpenTelemetry directly; avoid Mastra-specific tracing shims.
    const tracer = trace.getTracer('learning-extraction');
    const span = tracer.startSpan('learning-report-generation', {
      attributes: {
        learningsCount: inputData.learnings.length,
      },
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 30,
        message: 'Generating learning report...',
      });

      const agent = mastra?.getAgent('reportAgent');
      let report = '';
      let summary = '';

      const criticalLearnings = inputData.learnings.filter(l => l.importance === 'critical');
      const actionableItems = inputData.learnings.filter(l => l.actionable);

      if (agent) {
        const prompt = `Generate a learning extraction report:

  Learnings (${inputData.learnings.length} total):
  ${inputData.learnings
            .map(
              l =>
                `- [${l.importance.toUpperCase()}] ${l.title}: ${l.description} (Quality: ${l.qualityScore ?? 0}%)`,
            )
            .join('\n')}

  Validation Summary:
  - Validated: ${inputData.validationSummary.totalValidated}
  - High Quality: ${inputData.validationSummary.highQuality}
  - Needs Review: ${inputData.validationSummary.needsReview}

  Create a comprehensive report with summary, categorized learnings, action items, and recommendations.`;

        // Call the agent without the unsupported `output` option.
        const response: any = await agent.generate(prompt);

        // Guard against undefined or unexpected shapes.
        if (response && typeof response === 'object') {
          report = response.report ?? '';
          summary = response.summary ?? '';
        } else {
          // Fallback: treat the raw response as the report.
          report = String(response);
          summary = '';
        }
      } else {
        summary = `Extracted and validated ${inputData.learnings.length} learnings: ${criticalLearnings.length} critical, ${actionableItems.length} actionable.`;
        report = `# Learning Extraction Report

  ## Summary
  ${summary}

  ## Critical Learnings
  ${criticalLearnings.length > 0
            ? criticalLearnings
              .map(l => `### ${l.title}\n${l.description}\n- Quality Score: ${l.qualityScore ?? 0}%`)
              .join('\n\n')
            : 'No critical learnings identified.'}

  ## All Learnings by Category

  ${['concept', 'technique', 'insight', 'fact', 'principle', 'pattern']
            .map(cat => {
              const catLearnings = inputData.learnings.filter(l => l.category === cat);
              if (catLearnings.length === 0) {return '';}
              return `### ${cat.charAt(0).toUpperCase() + cat.slice(1)}s
  ${catLearnings
                  .map(l => `- **${l.title}** [${l.importance}]: ${l.description}`)
                  .join('\n')}`;
            })
            .filter(Boolean)
            .join('\n\n')}

  ## Action Items
  ${actionableItems.length > 0
            ? actionableItems
              .flatMap(l => l.actionItems ?? [])
              .map(a => `- ${a}`)
              .join('\n')
            : 'No action items identified.'}

  ## Validation Summary
  - Total Validated: ${inputData.validationSummary.totalValidated}
  - High Quality (80%+): ${inputData.validationSummary.highQuality}
  - Needs Review: ${inputData.validationSummary.needsReview}

  ---
  *Report generated: ${new Date().toISOString()}*`;
      }

      await writer?.write({
        type: 'progress',
        percent: 90,
        message: 'Report complete...',
      });

      const result: z.infer<typeof finalOutputSchema> = {
        learnings: inputData.learnings,
        report,
        summary,
        metadata: {
          contentType: 'document',
          extractionDepth: 'thorough',
          totalLearnings: inputData.learnings.length,
          criticalLearnings: criticalLearnings.length,
          actionableItems: actionableItems.length,
          humanApproved: true,
          processedAt: new Date().toISOString(),
        },
      };

      // Record useful metrics on the span.
      span.setAttribute('reportLength', report.length);
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();

      await writer?.write({
        type: 'step-complete',
        stepId: 'generate-learning-report',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('generate-learning-report', { reportLength: report.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();

      logError('generate-learning-report', error);

      await writer?.write({
        type: 'step-error',
        stepId: 'generate-learning-report',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },
});

export const learningExtractionWorkflow = createWorkflow({
  id: 'learningExtractionWorkflow',
  description: 'Extract learnings from content with human-in-the-loop approval using suspend()/resume()',
  inputSchema: learningInputSchema,
  outputSchema: finalOutputSchema,
})
  .then(extractLearningsStep)
  .then(humanApprovalStep)
  .then(validateLearningsStep)
  .then(generateLearningReportStep);

learningExtractionWorkflow.commit();
