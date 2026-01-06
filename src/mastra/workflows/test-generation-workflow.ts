import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { testEngineerAgent } from '../agents/codingAgents';
import { createSandbox, runCommand, writeFile } from '../tools/e2b';
import { logStepEnd, logStepStart, logError } from '../config/logger';

const testGenInputSchema = z.object({
  code: z.string().describe('The source code to test'),
  filePath: z.string().describe('The path of the source file'),
  language: z.enum(['ts', 'js', 'python']).default('ts'),
});

const testGenOutputSchema = z.object({
  testCode: z.string(),
  testFilePath: z.string(),
  verificationResult: z.object({
    success: z.boolean(),
    stdout: z.string(),
    stderr: z.string(),
  }).optional(),
});

const generateTestsStep = createStep({
  id: 'generate-tests',
  description: 'Generates tests using testEngineerAgent',
  inputSchema: testGenInputSchema,
  outputSchema: z.object({
    code: z.string(),
    filePath: z.string(),
    language: z.string(),
    testCode: z.string(),
    testFilePath: z.string(),
  }),
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();
    logStepStart('generate-tests', { filePath: inputData.filePath });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Generating tests for ${inputData.filePath}...`,
        stage: 'generate-tests',
      },
      id: 'generate-tests',
    });

    const testFilePath = inputData.filePath.replace(/\.(ts|js|py)$/, '.test.$1'); // Simple heuristic

    const prompt = `Generate unit tests for the following code.
    
    File Path: ${inputData.filePath}
    Target Test File Path: ${testFilePath}
    Language: ${inputData.language}
    Framework: ${inputData.language === 'python' ? 'pytest' : 'vitest'}
    
    Code:
    \`\`${inputData.language}
    ${inputData.code}
    \`\`\`
    
    Return a JSON object with:
    - "testCode": The complete test file content.
    - "testFilePath": The recommended path for the test file.
    `;

    try {
      const result = await testEngineerAgent.generate(prompt);

      const parsed = JSON.parse(result.text);
      const output = parsed ?? {
        testCode: '',
        testFilePath
      };

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Tests generated.`,
          stage: 'generate-tests',
        },
        id: 'generate-tests',
      });

      logStepEnd('generate-tests', {}, Date.now() - startTime);

      return {
        ...inputData,
        testCode: output.testCode,
        testFilePath: output.testFilePath ?? testFilePath,
      };
    } catch (error) {
      logError('generate-tests', error);
      throw error;
    }
  },
});

const runTestsStep = createStep({
  id: 'run-tests',
  description: 'Runs the generated tests in an E2B sandbox',
  inputSchema: z.object({
    code: z.string(),
    filePath: z.string(),
    language: z.string(),
    testCode: z.string(),
    testFilePath: z.string(),
  }),
  outputSchema: testGenOutputSchema,
  execute: async ({ inputData, writer, mastra, requestContext }) => {
    const startTime = Date.now();
    logStepStart('run-tests', { testFilePath: inputData.testFilePath });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Running tests in E2B sandbox...`,
        stage: 'run-tests',
      },
      id: 'run-tests',
    });

    try {
      // 1. Create Sandbox
      const sandbox = await createSandbox.execute({
        timeoutMS: 300_000,
      }, { mastra, requestContext });

      if ('error' in sandbox) { throw sandbox.error; }

      const { sandboxId } = sandbox;

      // 2. Write source file
      await writeFile.execute({
        sandboxId,
        path: inputData.filePath,
        content: inputData.code,
      }, { mastra, requestContext });

      // 3. Write test file
      await writeFile.execute({
        sandboxId,
        path: inputData.testFilePath,
        content: inputData.testCode,
      }, { mastra, requestContext });

      // 4. Run tests
      let testCommand = '';
      if (inputData.language === 'ts' || inputData.language === 'js') {
        // Install vitest if needed, but for speed we'll assume npx works
        // We might need a package.json or just run npx vitest directly
        testCommand = `npx -y vitest run ${inputData.testFilePath}`;
      } else if (inputData.language === 'python') {
        testCommand = `pip install pytest && pytest ${inputData.testFilePath}`;
      }

      const execution = await runCommand.execute({
        sandboxId,
        command: testCommand,
        timeoutMs: 120000,
        captureOutput: true,
      }, { mastra, requestContext });

      if ('error' in execution) { throw execution.error; }

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Tests executed. Exit code: ${execution.exitCode}`,
          stage: 'run-tests',
        },
        id: 'run-tests',
      });

      logStepEnd('run-tests', { success: execution.success }, Date.now() - startTime);

      return {
        testCode: inputData.testCode,
        testFilePath: inputData.testFilePath,
        verificationResult: {
          success: execution.success,
          stdout: execution.stdout,
          stderr: execution.stderr,
        },
      };

    } catch (error) {
      logError('run-tests', error);
      return {
        testCode: inputData.testCode,
        testFilePath: inputData.testFilePath,
        verificationResult: {
          success: false,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
});

export const testGenerationWorkflow = createWorkflow({
  id: 'testGenerationWorkflow',
  description: 'Generates and runs tests for a given code file',
  inputSchema: testGenInputSchema,
  outputSchema: testGenOutputSchema,
})
  .then(generateTestsStep)
  .then(runTestsStep);

testGenerationWorkflow.commit();
