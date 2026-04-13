import { createStep, createWorkflow } from '@mastra/core/workflows'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { z } from 'zod'
import { refactoringAgent } from '../agents/codingAgents'
import { logStepEnd, logStepStart, logError } from '../config/logger'
import { mainWorkspace } from '../workspaces'

const refactorInputSchema = z.object({
    sourceCode: z.string().describe('The source code to refactor'),
    filePath: z
        .string()
        .describe('The file path of the source code (e.g., src/utils.ts)'),
    goal: z.string().describe('The goal of the refactoring'),
    language: z.enum(['ts', 'js', 'python']).default('ts'),
})

const refactorOutputSchema = z.object({
    refactoredCode: z.string(),
    explanation: z.string(),
    verificationResult: z
        .object({
            success: z.boolean(),
            stdout: z.string(),
            stderr: z.string(),
        })
        .optional(),
})

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
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'generate-refactor',
            input: inputData,
            metadata: {
                'workflow.step': 'generate-refactor',
                'file.path': inputData.filePath,
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('generate-refactor', { filePath: inputData.filePath })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Generating refactor for ${inputData.filePath}...`,
                stage: 'generate-refactor',
            },
            id: 'generate-refactor',
        })

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
    `

        try {
            const result = await refactoringAgent.generate(prompt)

            const output = result.object ?? {
                refactoredCode: inputData.sourceCode,
                explanation: 'Failed to generate refactor',
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Refactor generated.`,
                    stage: 'generate-refactor',
                },
                id: 'generate-refactor',
            })

            const res = {
                ...inputData,
                refactoredCode: output.refactoredCode,
                explanation: output.explanation,
            }

            span?.update({
                output: res,
                metadata: {
                    responseTimeMs: Date.now() - startTime,
                },
            })
            span?.end()

            logStepEnd('generate-refactor', {}, Date.now() - startTime)

            return res
        } catch (error) {
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })
            logError('generate-refactor', error instanceof Error ? error : new Error(String(error)))
            throw error
        }
    },
})

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
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'verify-refactor',
            input: {
                filePath: inputData.filePath,
                language: inputData.language,
            },
            metadata: {
                'workflow.step': 'verify-refactor',
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('verify-refactor', { filePath: inputData.filePath })

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Verifying refactor in E2B sandbox...`,
                stage: 'verify-refactor',
            },
            id: 'verify-refactor',
        })

        try {
            const filesystem = mainWorkspace.filesystem
            if (!filesystem?.writeFile) {
                throw new Error('Workspace filesystem is not available.')
            }

            const sandbox = mainWorkspace.sandbox
            if (!sandbox?.executeCommand) {
                throw new Error('Workspace sandbox executeCommand is not available.')
            }

            await filesystem.writeFile(inputData.filePath, inputData.refactoredCode)

            // Try to compile/run (basic syntax check)
            let checkCommand = ''
            let checkArgs: string[] = []
            if (inputData.language === 'ts') {
                checkCommand = 'npx'
                checkArgs = [
                    '-y',
                    'typescript',
                    'tsc',
                    inputData.filePath,
                    '--noEmit',
                    '--target',
                    'esnext',
                    '--module',
                    'commonjs',
                ]
            } else if (inputData.language === 'js') {
                checkCommand = 'node'
                checkArgs = ['--check', inputData.filePath]
            } else if (inputData.language === 'python') {
                checkCommand = 'python3'
                checkArgs = ['-m', 'py_compile', inputData.filePath]
            }

            const execResult = await sandbox.executeCommand(
                checkCommand,
                checkArgs,
                {
                    timeout: 60_000,
                }
            )

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Verification complete. Success: ${execResult.success}`,
                    stage: 'verify-refactor',
                },
                id: 'verify-refactor',
            })

            const res = {
                refactoredCode: inputData.refactoredCode,
                explanation: inputData.explanation,
                verificationResult: {
                    success: execResult.success,
                    stdout: execResult.stdout,
                    stderr: execResult.stderr,
                },
            }

            span?.update({
                output: res,
                metadata: {
                    success: execResult.success,
                    responseTimeMs: Date.now() - startTime,
                },
            })
            span?.end()

            logStepEnd(
                'verify-refactor',
                { success: execResult.success },
                Date.now() - startTime
            )

            return res
        } catch (error) {
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })
            logError('verify-refactor', error instanceof Error ? error : new Error(String(error)))
            // Fail gracefully returning the unverified code
            return {
                refactoredCode: inputData.refactoredCode,
                explanation: inputData.explanation,
                verificationResult: {
                    success: false,
                    stdout: '',
                    stderr:
                        error instanceof Error ? error.message : String(error),
                },
            }
        }
    },
})

export const safeRefactoringWorkflow = createWorkflow({
    id: 'safeRefactoringWorkflow',
    description: 'Refactors code and verifies it in a sandbox',
    inputSchema: refactorInputSchema,
    outputSchema: refactorOutputSchema,
})
    .then(generateRefactorStep)
    .then(verifyRefactorStep)

safeRefactoringWorkflow.commit()

