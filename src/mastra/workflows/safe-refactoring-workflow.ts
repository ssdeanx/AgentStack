import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { refactoringAgent } from '../agents/codingAgents';
import { createSandbox, runCommand, writeFile } from '../tools/e2b';
import { logStepEnd, logStepStart, logError } from '../config/logger';

const refactorInputSchema = z.object({
  sourceCode: z.string().describe('The source code to refactor'),
  filePath: z.string().describe('The file path of the source code (e.g., src/utils.ts)'),
  goal: z.string().describe('The goal of the refactoring'),
  language: z.enum(['ts', 'js', 'python']).default('ts'),
});

const refactorOutputSchema = z.object({
  refactoredCode: z.string(),
  explanation: z.string(),
  verificationResult: z.object({
    success: z.boolean(),
    stdout: z.string(),
    stderr: z.string(),
  }).optional(),
});

const generateRefactorStep = createStep({
  id: 'generate-refactor',
  description: 'Generates refactored code using refactoringAgent',
  inputSchema: refactorInputSchema,
  outputSchema: z.object({
    sourceCode: z.string(),
    filePath: z.string(),
    language: z.string(),
    goal: z.string(),
    refactoredCode: z.string(),
    explanation: z.string(),
  }),
  execute: async ({ inputData, writer }) => {
    const startTime = Date.now();
    logStepStart('generate-refactor', { filePath: inputData.filePath });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Generating refactor for ${inputData.filePath}...`,
        stage: 'generate-refactor',
      },
      id: 'generate-refactor',
    });

    const prompt = `Refactor the following code.
    
    File Path: ${inputData.filePath}
    Goal: ${inputData.goal}
    
    Code:
    \`\`\`${inputData.language}
    ${inputData.sourceCode}
    \`\`\`
    
    Return a JSON object with:
    - "refactoredCode": The complete refactored code.
    - "explanation": A brief explanation of changes.
    `;

    try {
      const result = await refactoringAgent.generate(prompt);

      const output = result.object ?? {
        refactoredCode: inputData.sourceCode,
        explanation: 'Failed to generate refactor'
      };

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Refactor generated.`,
          stage: 'generate-refactor',
        },
        id: 'generate-refactor',
      });

      logStepEnd('generate-refactor', {}, Date.now() - startTime);

      return {
        ...inputData,
        refactoredCode: output.refactoredCode,
        explanation: output.explanation,
      };
    } catch (error) {
      logError('generate-refactor', error);
      throw error;
    }
  },
});

const verifyRefactorStep = createStep({
  id: 'verify-refactor',
  description: 'Verifies the refactored code in an E2B sandbox',
  inputSchema: z.object({
    sourceCode: z.string(),
    filePath: z.string(),
    language: z.string(),
    goal: z.string(),
    refactoredCode: z.string(),
    explanation: z.string(),
  }),
  outputSchema: refactorOutputSchema,
  execute: async ({ inputData, writer, mastra, requestContext }) => {
    const startTime = Date.now();
    logStepStart('verify-refactor', { filePath: inputData.filePath });

    await writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Verifying refactor in E2B sandbox...`,
        stage: 'verify-refactor',
      },
      id: 'verify-refactor',
    });

    try {
      // 1. Create Sandbox
      const sandbox = await createSandbox.execute({
        timeoutMS: 300_000, // 5 minutes
      }, { mastra, requestContext });

      if (sandbox instanceof z.ZodError) {
        throw new Error(sandbox.message);
      }

      const { sandboxId } = sandbox as { sandboxId: string };

      // 2. Write the file
      await writeFile.execute({
        sandboxId,
        path: inputData.filePath,
        content: inputData.refactoredCode,
      }, { mastra, requestContext });

      // 3. Try to compile/run (basic syntax check)
      let checkCommand = '';
      if (inputData.language === 'ts') {
        // Assuming environment has typescript installed or we install it
        // For speed, just checking if we can run it with ts-node or similar if available,
        // or just compile with tsc.
        // Let's assume a basic check: verify it parses.
        // We'll install typescript first if not present?
        // Actually, let's try to run it or just check syntax.
        // Simple syntax check: tsc --noEmit
        // We need to write a package.json or assume global tsc
        checkCommand = `npx -y typescript tsc ${inputData.filePath} --noEmit --target esnext --module commonjs`;
      } else if (inputData.language === 'js') {
        checkCommand = `node --check ${inputData.filePath}`;
      } else if (inputData.language === 'python') {
        checkCommand = `python3 -m py_compile ${inputData.filePath}`;
      }

      const execution = await runCommand.execute({
        sandboxId,
        command: checkCommand,
        timeoutMs: 60000,
        captureOutput: true,
      }, { mastra, requestContext });

      if (execution instanceof z.ZodError) {
        throw new Error(execution.message);
      }

      const execResult = execution as {
        success: boolean;
        exitCode: number;
        stdout: string;
        stderr: string;
        command: string;
        executionTime: number;
        error?: undefined;
      };

      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: 'done',
          message: `Verification complete. Success: ${execResult.success}`,
          stage: 'verify-refactor',
        },
        id: 'verify-refactor',
      });

      logStepEnd('verify-refactor', { success: execResult.success }, Date.now() - startTime);

      return {
        refactoredCode: inputData.refactoredCode,
        explanation: inputData.explanation,
        verificationResult: {
          success: execResult.success,
          stdout: execResult.stdout,
          stderr: execResult.stderr,
        },
      };

    } catch (error) {
      logError('verify-refactor', error);
      // Fail gracefully returning the unverified code
      return {
        refactoredCode: inputData.refactoredCode,
        explanation: inputData.explanation,
        verificationResult: {
          success: false,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
});

export const safeRefactoringWorkflow = createWorkflow({
  id: 'safeRefactoringWorkflow',
  description: 'Refactors code and verifies it in a sandbox',
  inputSchema: refactorInputSchema,
  outputSchema: refactorOutputSchema,
})
  .then(generateRefactorStep)
  .then(verifyRefactorStep);

safeRefactoringWorkflow.commit();
