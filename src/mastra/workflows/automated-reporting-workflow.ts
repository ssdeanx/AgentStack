import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { reportAgent } from '../agents/reportAgent';
import { researchAgent } from '../agents/researchAgent';
import { logStepEnd, logStepStart, logError } from '../config/logger';

const reportInputSchema = z.object({
  topic: z.string().describe('The main topic of the report'),
  sections: z.array(z.string()).describe('List of sections to include in the report'),
  depth: z.enum(['brief', 'detailed', 'comprehensive']).default('detailed'),
});

const reportOutputSchema = z.object({
  reportId: z.string(),
  title: z.string(),
  executiveSummary: z.string(),
  fullReport: z.string(),
  metadata: z.object({
    topic: z.string(),
    generatedAt: z.string(),
    sectionsCount: z.number(),
  }),
});

const researchTopicStep = createStep({
  id: 'research-topic',
  description: 'Gathers research data for each section',
  inputSchema: reportInputSchema,
  outputSchema: z.object({
    topic: z.string(),
    sections: z.array(z.object({
      name: z.string(),
      data: z.string(),
    })),
    depth: z.string(),
  }),
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();
    logStepStart('research-topic', { topic: inputData.topic });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Researching ${inputData.sections.length} sections for topic: ${inputData.topic}...`,
        stage: 'research-topic',
      },
      id: 'research-topic',
    });

    const researchedSections = [];

    for (const section of inputData.sections) {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'in-progress',
          message: `Researching section: ${section}...`,
          stage: 'research-topic',
        },
        id: 'research-topic',
      });

      const prompt = `Research the following aspect of "${inputData.topic}": ${section}. 
      Provide a ${inputData.depth} summary of key facts, trends, and data points.`;

      const result = await researchAgent.generate(prompt);
      researchedSections.push({
        name: section,
        data: result.text,
      });
    }

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'done',
        message: `Research completed for all sections.`,
        stage: 'research-topic',
      },
      id: 'research-topic',
    });

    logStepEnd('research-topic', {}, Date.now() - startTime);

    return {
      topic: inputData.topic,
      sections: researchedSections,
      depth: inputData.depth,
    };
  },
});

const synthesizeReportStep = createStep({
  id: 'synthesize-report',
  description: 'Synthesizes researched sections into a professional report',
  inputSchema: z.object({
    topic: z.string(),
    sections: z.array(z.object({
      name: z.string(),
      data: z.string(),
    })),
    depth: z.string(),
  }),
  outputSchema: reportOutputSchema,
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();
    logStepStart('synthesize-report', { topic: inputData.topic });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Synthesizing final report for ${inputData.topic}...`,
        stage: 'synthesize-report',
      },
      id: 'synthesize-report',
    });

    const reportId = `rep-${Date.now()}`;
    const sectionsContent = inputData.sections.map(s => `## ${s.name}\n${s.data}`).join('\n\n');

    const prompt = `You are a Professional Report Writer. Synthesize the following research data into a high-quality ${inputData.depth} report about "${inputData.topic}".
    
    Research Data:
    ${sectionsContent}
    
    Instructions:
    1. Create a compelling title.
    2. Write a concise Executive Summary.
    3. Organize the full report logically with professional formatting.
    4. Ensure a consistent tone and flow between sections.
    5. Highlight key takeaways.
    
    Return a JSON object with:
    - "title": The report title.
    - "executiveSummary": The summary.
    - "fullReport": The complete markdown report.
    `;

    try {
      const result = await reportAgent.generate(prompt);

      let output;
      try {
        output = JSON.parse(result.text);
      } catch {
        output = {
          title: inputData.topic,
          executiveSummary: '',
          fullReport: sectionsContent,
        };
      }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Report synthesis completed for ${inputData.topic}.`,
          stage: 'synthesize-report',
        },
        id: 'synthesize-report',
      });

      logStepEnd('synthesize-report', {}, Date.now() - startTime);

      return {
        reportId,
        title: output.title,
        executiveSummary: output.executiveSummary,
        fullReport: output.fullReport,
        metadata: {
          topic: inputData.topic,
          generatedAt: new Date().toISOString(),
          sectionsCount: inputData.sections.length,
        },
      };
    } catch (error) {
      logError('synthesize-report', error);
      throw error;
    }
  },
});

export const automatedReportingWorkflow = createWorkflow({
  id: 'automatedReportingWorkflow',
  description: 'Gathers multi-section research and synthesizes it into a professional report',
  inputSchema: reportInputSchema,
  outputSchema: reportOutputSchema,
})
  .then(researchTopicStep)
  .then(synthesizeReportStep);

automatedReportingWorkflow.commit();
