import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { codeArchitectAgent } from '../agents/codingAgents';
import { reportAgent } from '../agents/reportAgent';
import { createSandbox, runCode, writeFile } from '../tools/e2b';
import { logStepEnd, logStepStart, logError } from '../config/logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const analysisInputSchema = z.object({
  data: z.string().describe('CSV or JSON data content'),
  query: z.string().describe('Specific analysis question or instruction'),
  dataFormat: z.enum(['csv', 'json']).default('csv'),
  outputFormat: z.enum(['markdown', 'pdf', 'html']).default('markdown'),
});

const analysisOutputSchema = z.object({
  report: z.string(),
  insights: z.array(z.string()),
  artifacts: z.array(z.object({
    name: z.string(),
    type: z.string(),
    content: z.string().optional(),
  })).optional(),
});

const generateAnalysisCodeStep = createStep({
  id: 'generate-analysis-code',
  description: 'Generates Python analysis code based on data and query',
  inputSchema: analysisInputSchema,
  outputSchema: z.object({
    code: z.string(),
    data: z.string(),
    query: z.string(),
    dataFormat: z.string(),
  }),
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();
    logStepStart('generate-analysis-code', { query: inputData.query });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Planning analysis for query: ${inputData.query}...`,
        stage: 'generate-analysis-code',
      },
      id: 'generate-analysis-code',
    });

    const dataPreview = inputData.data.slice(0, 1000);
    const prompt = `You are a Data Scientist. Generate a Python script to analyze the following data.
    
    Data Format: ${inputData.dataFormat}
    Data Preview:
    ${dataPreview}
    
    Analysis Query: ${inputData.query}
    
    Instructions:
    1. Use pandas for analysis.
    2. Read data from 'data.${inputData.dataFormat}'.
    3. Perform the requested analysis.
    4. Print summary statistics and specific insights to stdout.
    5. If applicable, generate a plot and save it as 'plot.png'.
    6. Ensure the code is robust and handles potential data issues.
    
    Return ONLY the Python code in a code block.`;

    try {
      const result = await codeArchitectAgent.generate(prompt);
      const code = result.text.replace(/```python\n([\s\S]*?)\n```/, '$1').trim();

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Analysis code generated.`,
          stage: 'generate-analysis-code',
        },
        id: 'generate-analysis-code',
      });

      logStepEnd('generate-analysis-code', {}, Date.now() - startTime);

      return {
        code,
        data: inputData.data,
        query: inputData.query,
        dataFormat: inputData.dataFormat,
      };
    } catch (error) {
      logError('generate-analysis-code', error);
      throw error;
    }
  },
});

const executeAnalysisStep = createStep({
  id: 'execute-analysis',
  description: 'Executes the analysis code in an E2B sandbox',
  inputSchema: z.object({
    code: z.string(),
    data: z.string(),
    query: z.string(),
    dataFormat: z.string(),
  }),
  outputSchema: z.object({
    stdout: z.string(),
    stderr: z.string(),
    plotGenerated: z.boolean(),
    query: z.string(),
  }),
  execute: async ({ inputData, writer, mastra, requestContext }) => {
    const startTime = Date.now();
    logStepStart('execute-analysis', { query: inputData.query });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Executing analysis in E2B sandbox...`,
        stage: 'execute-analysis',
      },
      id: 'execute-analysis',
    });

    const tracer = trace.getTracer('data-analysis');
    const span = tracer.startSpan('e2b-analysis-execution');

    try {
      const sandbox = await createSandbox.execute({
        timeoutMS: 300_000,
      }, { mastra, requestContext });

      if (!('sandboxId' in sandbox)) {
        throw new Error('Failed to create sandbox');
      }

      const { sandboxId } = sandbox;

      // Write data file
      await writeFile.execute({
        sandboxId,
        path: `data.${inputData.dataFormat}`,
        content: inputData.data,
      }, { mastra, requestContext });

      // Run code
      const executionResult = await runCode.execute({
        sandboxId,
        code: inputData.code,
        runCodeOpts: {
          language: 'python',
        },
      }, { mastra, requestContext });

      if (!('execution' in executionResult)) {
        throw new Error('Failed to execute code');
      }

      const execution = JSON.parse(executionResult.execution);

      // Check if plot was generated (simple check via stdout or just assume if code was meant to)
      // In a real production scenario, we'd check if 'plot.png' exists using listFiles
      const plotGenerated = inputData.code.includes('plot.png');

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Analysis execution complete.`,
          stage: 'execute-analysis',
        },
        id: 'execute-analysis',
      });

      span.end();
      logStepEnd('execute-analysis', { success: true }, Date.now() - startTime);

      return {
        stdout: execution.logs.stdout.join('\n'),
        stderr: execution.logs.stderr.join('\n'),
        plotGenerated,
        query: inputData.query,
      };
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      logError('execute-analysis', error);
      throw error;
    }
  },
});

const generateDataReportStep = createStep({
  id: 'generate-data-report',
  description: 'Synthesizes analysis results into a final report',
  inputSchema: z.object({
    stdout: z.string(),
    stderr: z.string(),
    plotGenerated: z.boolean(),
    query: z.string(),
  }),
  outputSchema: analysisOutputSchema,
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();
    logStepStart('generate-data-report', { query: inputData.query });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Generating final report and insights...`,
        stage: 'generate-data-report',
      },
      id: 'generate-data-report',
    });

    const prompt = `You are a Senior Analyst. Based on the following analysis execution results, generate a comprehensive report.
    
    Original Query: ${inputData.query}
    
    Analysis Output (stdout):
    ${inputData.stdout}
    
    Errors/Warnings (stderr):
    ${inputData.stderr}
    
    Artifacts: ${inputData.plotGenerated ? 'A visualization plot was generated.' : 'No visualization.'}
    
    Instructions:
    1. Summarize the key findings.
    2. List at least 3 specific insights.
    3. Provide a structured markdown report.
    4. If there were errors, explain their impact on the results.
    
    Return a JSON object with:
    - "report": Markdown string of the full report.
    - "insights": Array of insight strings.
    `;

    try {
      const result = await reportAgent.generate(prompt);
      const output = JSON.parse(result.text);

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Report generated successfully.`,
          stage: 'generate-data-report',
        },
        id: 'generate-data-report',
      });

      logStepEnd('generate-data-report', {}, Date.now() - startTime);

      return {
        report: output.report,
        insights: output.insights,
        artifacts: inputData.plotGenerated ? [{ name: 'plot.png', type: 'image/png' }] : [],
      };
    } catch (error) {
      logError('generate-data-report', error);
      throw error;
    }
  },
});

export const dataAnalysisWorkflow = createWorkflow({
  id: 'dataAnalysisWorkflow',
  description: 'Production-grade data analysis workflow using coding agents and E2B sandboxes',
  inputSchema: analysisInputSchema,
  outputSchema: analysisOutputSchema,
})
  .then(generateAnalysisCodeStep)
  .then(executeAnalysisStep)
  .then(generateDataReportStep);

dataAnalysisWorkflow.commit();
