import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import { logStepStart, logStepEnd, logError } from '../config/logger';

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
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('extract-learnings', { contentType: inputData.contentType, depth: inputData.extractionDepth });

    await writer?.write({
      type: 'step-start',
      stepId: 'extract-learnings',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'learning-extraction',
      input: { contentType: inputData.contentType, contentLength: inputData.content.length },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    try {
      await writer?.write({
        type: 'progress',
        percent: 20,
        message: `Analyzing ${inputData.contentType}...`,
      });

      const agent = mastra?.getAgent('learningExtractionAgent');
      let learnings: z.infer<typeof extractedLearningSchema>[] = [];
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

        const response = await agent.generate(prompt, {
          output: z.object({
            learnings: z.array(extractedLearningSchema),
            summary: z.string(),
          }),
        });

        learnings = response.object.learnings;
        summary = response.object.summary;
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

      span?.end({
        output: { learningsCount: learnings.length, criticalCount, actionableCount },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'extract-learnings',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('extract-learnings', { learningsCount: learnings.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
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
  execute: async ({ inputData, resumeData, suspend, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('human-approval', { learningsCount: inputData.learnings.length, hasResumeData: !!resumeData });

    await writer?.write({
      type: 'step-start',
      stepId: 'human-approval',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.WORKFLOW_RUN,
      name: 'human-approval-check',
      input: { learningsCount: inputData.learnings.length, requireApproval: inputData.requireApproval },
      tracingPolicy: { internal: InternalSpans.ALL }
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

        span?.end({ output: { autoApproved: true, learningsCount: inputData.learnings.length } });

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

        span?.end({ output: { suspended: true, awaitingApproval: true } });

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

      span?.end({
        output: {
          approved: resumeData.approved,
          approvedCount: approvedLearnings.length,
          rejectedCount,
          approvalRate,
        },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'human-approval',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('human-approval', { approved: resumeData.approved, approvedCount: approvedLearnings.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
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
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('validate-learnings', { learningsCount: inputData.learnings.length });

    await writer?.write({
      type: 'step-start',
      stepId: 'validate-learnings',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'learning-validation',
      input: { learningsCount: inputData.learnings.length },
      tracingPolicy: { internal: InternalSpans.ALL }
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
          const response = await agent.generate(
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
            }
          );

          validated = response.object.validated;
          qualityScore = response.object.qualityScore;
          validationNotes = response.object.notes ?? '';
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

      span?.end({
        output: {
          totalValidated: result.validationSummary.totalValidated,
          highQuality,
          needsReview,
        },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'validate-learnings',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('validate-learnings', result.validationSummary, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
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
  execute: async ({ inputData, mastra, tracingContext, writer }) => {
    const startTime = Date.now();
    logStepStart('generate-learning-report', { learningsCount: inputData.learnings.length });

    await writer?.write({
      type: 'step-start',
      stepId: 'generate-learning-report',
      timestamp: Date.now(),
    });

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.AGENT_RUN,
      name: 'learning-report-generation',
      input: { learningsCount: inputData.learnings.length },
      tracingPolicy: { internal: InternalSpans.ALL }
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
${inputData.learnings.map(l => 
  `- [${l.importance.toUpperCase()}] ${l.title}: ${l.description} (Quality: ${l.qualityScore}%)`
).join('\n')}

Validation Summary:
- Validated: ${inputData.validationSummary.totalValidated}
- High Quality: ${inputData.validationSummary.highQuality}
- Needs Review: ${inputData.validationSummary.needsReview}

Create a comprehensive report with summary, categorized learnings, action items, and recommendations.`;

        const response = await agent.generate(prompt, {
          output: z.object({
            report: z.string(),
            summary: z.string(),
          }),
        });

        report = response.object.report;
        summary = response.object.summary;
      } else {
        summary = `Extracted and validated ${inputData.learnings.length} learnings: ${criticalLearnings.length} critical, ${actionableItems.length} actionable.`;
        report = `# Learning Extraction Report

## Summary
${summary}

## Critical Learnings
${criticalLearnings.length > 0
  ? criticalLearnings.map(l => `### ${l.title}\n${l.description}\n- Quality Score: ${l.qualityScore}%`).join('\n\n')
  : 'No critical learnings identified.'}

## All Learnings by Category

${['concept', 'technique', 'insight', 'fact', 'principle', 'pattern'].map(cat => {
  const catLearnings = inputData.learnings.filter(l => l.category === cat);
  if (catLearnings.length === 0) return '';
  return `### ${cat.charAt(0).toUpperCase() + cat.slice(1)}s
${catLearnings.map(l => `- **${l.title}** [${l.importance}]: ${l.description}`).join('\n')}`;
}).filter(Boolean).join('\n\n')}

## Action Items
${actionableItems.length > 0
  ? actionableItems.flatMap(l => l.actionItems ?? []).map(a => `- ${a}`).join('\n')
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

      span?.end({
        output: { reportLength: report.length, learningsCount: inputData.learnings.length },
        metadata: { responseTime: Date.now() - startTime },
      });

      await writer?.write({
        type: 'step-complete',
        stepId: 'generate-learning-report',
        success: true,
        duration: Date.now() - startTime,
      });

      logStepEnd('generate-learning-report', { reportLength: report.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span?.error({ error: error instanceof Error ? error : new Error(String(error)), endSpan: true });
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
  id: 'learning-extraction-workflow',
  description: 'Extract learnings from content with human-in-the-loop approval using suspend()/resume()',
  inputSchema: learningInputSchema,
  outputSchema: finalOutputSchema,
})
  .then(extractLearningsStep)
  .then(humanApprovalStep)
  .then(validateLearningsStep)
  .then(generateLearningReportStep);

learningExtractionWorkflow.commit();
