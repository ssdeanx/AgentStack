import { createStep, createWorkflow } from '@mastra/core/workflows';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { z } from 'zod';
import { logError, logStepEnd, logStepStart } from '../config/logger';

const researchInputSchema = z.object({
  topics: z.array(z.string()).min(1).describe('List of topics to research'),
  synthesisType: z.enum(['summary', 'comparative', 'comprehensive']).default('summary'),
  maxSourcesPerTopic: z.number().default(5),
  concurrency: z.number().default(2).describe('Number of concurrent topic researches'),
});

const topicResearchSchema = z.object({
  topic: z.string(),
  summary: z.string(),
  keyFindings: z.array(z.string()),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
    relevance: z.number().optional(),
  })),
  relatedTopics: z.array(z.string()).optional(),
  confidence: z.number(),
});

const synthesizedResearchSchema = z.object({
  topics: z.array(topicResearchSchema),
  synthesis: z.object({
    overallSummary: z.string(),
    commonThemes: z.array(z.string()),
    keyInsights: z.array(z.object({
      insight: z.string(),
      relatedTopics: z.array(z.string()),
      importance: z.enum(['high', 'medium', 'low']),
    })),
    recommendations: z.array(z.string()),
    gaps: z.array(z.string()).optional(),
  }),
  metadata: z.object({
    topicsCount: z.number(),
    synthesisType: z.string(),
    totalSources: z.number(),
    averageConfidence: z.number(),
    generatedAt: z.string(),
  }),
});

const reportOutputSchema = z.object({
  report: z.string(),
  synthesis: synthesizedResearchSchema.shape.synthesis,
  topics: z.array(topicResearchSchema),
  metadata: z.object({
    topicsCount: z.number(),
    synthesisType: z.string(),
    totalSources: z.number(),
    generatedAt: z.string(),
  }),
});

const initializeResearchStep = createStep({
  id: 'initialize-research',
  description: 'Prepares topic list for foreach iteration',
  inputSchema: researchInputSchema,
  outputSchema: z.array(z.object({
    topic: z.string(),
    maxSources: z.number(),
  })),
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();
    logStepStart('initialize-research', { topicsCount: inputData.topics.length });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: "in-progress",
        message: `Researching topic: ${inputData.topics}...`,
        stage: "researchAgent",
      },
      id: 'initialize-research',
    });

    const topics = inputData.topics.map(topic => ({
      topic,
      maxSources: inputData.maxSourcesPerTopic,
    }));


    logStepEnd('initialize-research', { topicsCount: topics.length }, Date.now() - startTime);

    return topics;
  },
});

const researchTopicStep = createStep({
  id: 'research-topic-item',
  description: 'Researches a single topic using researchAgent',
  inputSchema: z.object({
    topic: z.string(),
    maxSources: z.number(),
  }),
  outputSchema: topicResearchSchema,
  retries: 2,
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('research-topic-item', { topic: inputData.topic });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Researching topic: ${inputData.topic}...`,
        stage: 'research-topic-item',
      },
      id: 'research-topic-item',
    });

    const tracer = trace.getTracer('research-synthesis');
    const span = tracer.startSpan('research-topic', {
      attributes: {
        topic: inputData.topic,
        maxSources: inputData.maxSources,
      },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: `Researching topic: ${inputData.topic}...`,
          stage: 'research-topic-item',
        },
        id: 'research-topic-item',
      });

      const agent = mastra?.getAgent('researchAgent');
      let result: z.infer<typeof topicResearchSchema>;

      if (agent !== undefined) {
        const prompt = `Research the topic "${inputData.topic}" thoroughly.

        Provide:
        1. A comprehensive summary
        2. Key findings (5-10 bullet points)
        3. Up to ${inputData.maxSources} relevant sources
        4. Related topics for further exploration
        5. A confidence score (0-100) for the research quality

        Focus on accuracy and citing credible sources.`;

        const stream = await agent.stream(prompt);
        await stream.textStream?.pipeTo?.(writer);
        const finalText = await stream.text;
        const parsed = (() => {
          try {
            return JSON.parse(finalText || '');
          } catch {
            return null;
          }
        })();

        result = {
          topic: inputData.topic,
          summary: typeof parsed?.summary === 'string' ? parsed.summary : (finalText ?? ''),
          keyFindings: Array.isArray(parsed?.keyFindings) ? parsed.keyFindings : [],
          sources: Array.isArray(parsed?.sources) ? parsed.sources.slice(0, inputData.maxSources) : [],
          relatedTopics: Array.isArray(parsed?.relatedTopics) ? parsed.relatedTopics : [],
          confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0,
        };
      } else {
        result = {
          topic: inputData.topic,
          summary: `Research summary for "${inputData.topic}". This topic covers important aspects that require detailed analysis.`,
          keyFindings: [
            `Key finding 1 about ${inputData.topic}`,
            `Key finding 2 about ${inputData.topic}`,
            `Key finding 3 about ${inputData.topic}`,
          ],
          sources: [
            { title: `Source about ${inputData.topic}`, relevance: 0.9 },
          ],
          relatedTopics: [`Related to ${inputData.topic}`],
          confidence: 70,
        };
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Research completed for ${inputData.topic}...`,
          stage: 'research-topic-item',
        },
        id: 'research-topic-item',
      });

      span.setAttribute('findingsCount', result.keyFindings.length);
      span.setAttribute('sourcesCount', result.sources.length);
      span.setAttribute('confidence', result.confidence);
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();

      logStepEnd('research-topic-item', { topic: inputData.topic, confidence: result.confidence }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('research-topic-item', error, { topic: inputData.topic });

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Research error for ${inputData.topic}...`,
          stage: 'research-topic-item',
        },
        id: 'research-topic-item',
      });

      return {
        topic: inputData.topic,
        summary: `Research failed for "${inputData.topic}"`,
        keyFindings: [],
        sources: [],
        confidence: 0,
      };
    }
  },
});

const synthesizeResearchStep = createStep({
  id: 'synthesize-research',
  description: 'Synthesizes research across all topics using researchPaperAgent',
  inputSchema: z.object({
    topics: z.array(topicResearchSchema),
    synthesisType: z.string(),
  }),
  outputSchema: synthesizedResearchSchema,
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('synthesize-research', { topicsCount: inputData.topics.length });

    const tracer = trace.getTracer('research-synthesis');
    const span = tracer.startSpan('research-synthesis', {
      attributes: {
        topicsCount: inputData.topics.length,
        synthesisType: inputData.synthesisType,
      },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: 'Synthesizing research across topics...',
          stage: 'synthesize-research',
        },
        id: 'synthesize-research',
      });

      const agent = mastra?.getAgent('researchPaperAgent') ?? mastra?.getAgent('researchAgent');

      let synthesis: z.infer<typeof synthesizedResearchSchema>['synthesis'];

      if (agent !== undefined) {
        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'in-progress',
            message: 'AI synthesizing findings...',
            stage: 'synthesize-research',
          },
          id: 'synthesize-research',
        });

        const topicsSummary = inputData.topics.map(t =>
          `Topic: ${t.topic}\nSummary: ${t.summary}\nKey Findings: ${t.keyFindings.join('; ')}`
        ).join('\n\n---\n\n');

        const prompt = `Synthesize the following research into a ${inputData.synthesisType} analysis:

${topicsSummary}

Provide:
1. An overall summary connecting all topics
2. Common themes across topics
3. Key insights with importance levels (high/medium/low) and related topics
4. Actionable recommendations
5. Any gaps in the research`;

        const stream = await agent.stream(prompt);
        await stream.textStream?.pipeTo?.(writer);
        const finalText = await stream.text;
        const parsed = (() => {
          try {
            return JSON.parse(finalText || '');
          } catch {
            return null;
          }
        })();

        const hasParsed = parsed !== null && typeof parsed === 'object' && 'overallSummary' in parsed;
        synthesis = hasParsed
          ? {
            overallSummary: String((parsed as Record<string, unknown>).overallSummary),
            commonThemes: Array.isArray((parsed as Record<string, unknown>).commonThemes)
              ? (parsed as { commonThemes: string[] }).commonThemes
              : [],
            keyInsights: Array.isArray((parsed as Record<string, unknown>).keyInsights)
              ? (parsed as { keyInsights: unknown[] }).keyInsights as unknown as Array<{
                insight: string;
                relatedTopics: string[];
                importance: 'high' | 'medium' | 'low';
              }>
              : [],
            recommendations: Array.isArray((parsed as Record<string, unknown>).recommendations)
              ? (parsed as { recommendations: string[] }).recommendations
              : [],
            gaps: Array.isArray((parsed as Record<string, unknown>).gaps)
              ? (parsed as { gaps: string[] }).gaps
              : undefined,
          }
          : {
            overallSummary: finalText ?? '',
            commonThemes: [],
            keyInsights: [],
            recommendations: [],
            gaps: [],
          };
      } else {
        const allFindings = inputData.topics.flatMap(t => t.keyFindings);
        const allTopicNames = inputData.topics.map(t => t.topic);

        synthesis = {
          overallSummary: `Synthesis of research across ${inputData.topics.length} topics: ${allTopicNames.join(', ')}. ${inputData.topics.map(t => t.summary).join(' ')}`,
          commonThemes: ['Cross-topic theme 1', 'Cross-topic theme 2'],
          keyInsights: allFindings.slice(0, 5).map(finding => ({
            insight: finding,
            relatedTopics: allTopicNames.slice(0, 2),
            importance: 'medium' as const,
          })),
          recommendations: [
            'Recommendation based on synthesis',
            'Further research suggested',
          ],
          gaps: ['Area requiring more research'],
        };
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: 'Synthesis complete...',
          stage: 'synthesize-research',
        },
        id: 'synthesize-research',
      });

      const totalSources = inputData.topics.reduce((sum, t) => sum + t.sources.length, 0);
      const averageConfidence = inputData.topics.reduce((sum, t) => sum + t.confidence, 0) / inputData.topics.length;

      const result: z.infer<typeof synthesizedResearchSchema> = {
        topics: inputData.topics,
        synthesis,
        metadata: {
          topicsCount: inputData.topics.length,
          synthesisType: inputData.synthesisType,
          totalSources,
          averageConfidence,
          generatedAt: new Date().toISOString(),
        },
      };

      span.setAttribute('themesCount', synthesis.commonThemes.length);
      span.setAttribute('insightsCount', synthesis.keyInsights.length);
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();


      logStepEnd('synthesize-research', { themesCount: synthesis.commonThemes.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('synthesize-research', error);

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          stage: 'synthesize-research',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'done',
        },
        id: 'synthesize-research',
      });

      throw error;
    }
  },
});

const generateResearchReportStep = createStep({
  id: 'generate-research-report',
  description: 'Generates final research report using reportAgent',
  inputSchema: synthesizedResearchSchema,
  outputSchema: reportOutputSchema,
  execute: async ({ inputData, mastra, writer }) => {
    const startTime = Date.now();
    logStepStart('generate-research-report', { topicsCount: inputData.metadata.topicsCount });

    const tracer = trace.getTracer('research-synthesis');
    const span = tracer.startSpan('research-report-generation', {
      attributes: {
        topicsCount: inputData.metadata.topicsCount,
      },
    });

    try {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: 'Generating research report...',
          stage: 'generate-research-report',
        },
        id: 'generate-research-report',
      });

      const agent = mastra?.getAgent('reportAgent');
      let report = '';

      if (agent !== undefined) {
        await writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'in-progress',
            message: 'AI generating comprehensive report...',
            stage: 'generate-research-report',
          },
          id: 'generate-research-report',
        });

        const prompt = `Generate a comprehensive ${inputData.metadata.synthesisType} research report:

Overall Summary:
${inputData.synthesis.overallSummary}

Common Themes:
${inputData.synthesis.commonThemes.map(t => `- ${t}`).join('\n')}

Key Insights:
${inputData.synthesis.keyInsights.map(i => `- [${i.importance.toUpperCase()}] ${i.insight} (Topics: ${i.relatedTopics.join(', ')})`).join('\n')}

Recommendations:
${inputData.synthesis.recommendations.map(r => `- ${r}`).join('\n')}

Individual Topics:
${inputData.topics.map(t => `## ${t.topic}\n${t.summary}\n\nKey Findings:\n${t.keyFindings.map(f => `- ${f}`).join('\n')}`).join('\n\n')}

Create a well-structured, professional research report.`;

        const stream = await agent.stream(prompt);
        await stream.textStream?.pipeTo?.(writer);
        const finalText = await stream.text;
        const parsed = (() => {
          try {
            return JSON.parse(finalText || '');
          } catch {
            return null;
          }
        })();

        report = typeof parsed?.report === 'string' ? parsed.report : (finalText ?? '');
      } else {
        report = `# Research Synthesis Report

## Executive Summary
${inputData.synthesis.overallSummary}

## Common Themes
${inputData.synthesis.commonThemes.map(t => `- ${t}`).join('\n')}

## Key Insights
${inputData.synthesis.keyInsights.map(i => `### ${i.insight}\n- Importance: ${i.importance}\n- Related Topics: ${i.relatedTopics.join(', ')}`).join('\n\n')}

## Recommendations
${inputData.synthesis.recommendations.map(r => `- ${r}`).join('\n')}

## Topic Details
${inputData.topics.map(t => `### ${t.topic}\n${t.summary}\n\n**Key Findings:**\n${t.keyFindings.map(f => `- ${f}`).join('\n')}\n\n**Sources:** ${t.sources.length} sources reviewed\n**Confidence:** ${t.confidence}%`).join('\n\n---\n\n')}

## Research Gaps
${inputData.synthesis.gaps?.map(g => `- ${g}`).join('\n') ?? 'No significant gaps identified.'}

---
*Generated: ${inputData.metadata.generatedAt}*
*Topics Analyzed: ${inputData.metadata.topicsCount}*
*Total Sources: ${inputData.metadata.totalSources}*
*Average Confidence: ${inputData.metadata.averageConfidence.toFixed(1)}%*`;
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: 'Report generation complete...',
          stage: 'generate-research-report',
        },
        id: 'generate-research-report',
      });

      const result: z.infer<typeof reportOutputSchema> = {
        report,
        synthesis: inputData.synthesis,
        topics: inputData.topics,
        metadata: {
          topicsCount: inputData.metadata.topicsCount,
          synthesisType: inputData.metadata.synthesisType,
          totalSources: inputData.metadata.totalSources,
          generatedAt: new Date().toISOString(),
        },
      };

      span.setAttribute('reportLength', report.length);
      span.setAttribute('responseTimeMs', Date.now() - startTime);
      span.end();


      logStepEnd('generate-research-report', { reportLength: report.length }, Date.now() - startTime);
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('generate-research-report', error);

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          stage: 'generate-research-report',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'done'
        },
        id: 'generate-research-report',
      });

      throw error;
    }
  },
});

const foreachWrapperStep = createStep({
  id: 'foreach-wrapper',
  description: 'Wraps foreach results for synthesis',
  inputSchema: z.array(topicResearchSchema),
  outputSchema: z.object({
    topics: z.array(topicResearchSchema),
    synthesisType: z.string(),
  }),
  execute: async ({ inputData }) => {
    return {
      topics: inputData,
      synthesisType: 'summary',
    };
  },
});

export const researchSynthesisWorkflow = createWorkflow({
  id: 'researchSynthesisWorkflow',
  description: 'Multi-topic research with synthesis using .foreach() for concurrent topic processing',
  inputSchema: researchInputSchema,
  outputSchema: reportOutputSchema,
})
  .then(initializeResearchStep)
  .foreach(researchTopicStep, { concurrency: 2 })
  .then(foreachWrapperStep)
  .then(synthesizeResearchStep)
  .then(generateResearchReportStep);

researchSynthesisWorkflow.commit();
