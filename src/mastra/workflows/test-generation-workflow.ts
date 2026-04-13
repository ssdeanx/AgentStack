import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { testEngineerAgent } from '../agents/codingAgents'
import { logStepEnd, logStepStart, logError } from '../config/logger'
import { mainWorkspace } from '../workspaces'

const testGenInputSchema = z.object({
    code: z.string().describe('The source code to test'),
    filePath: z.string().describe('The path of the source file'),
    language: z.enum(['ts', 'js', 'python']).default('ts'),
})

const testGenOutputSchema = z.object({
    testCode: z.string(),
    testFilePath: z.string(),
    verificationResult: z
        .object({
            success: z.boolean(),
            stdout: z.string(),
            stderr: z.string(),
        })
        .optional(),
})

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
    execute: async ({ inputData, writer, mastra, requestContext }) => {
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'generate-tests',
            input: inputData,
            metadata: {
                'workflow.step': 'generate-tests',
                'file.path': inputData.filePath,
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('generate-tests', { filePath: inputData.filePath })

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Generating tests for ${inputData.filePath}...`,
                    stage: 'generate-tests',
                },
                id: 'generate-tests',
            })

            const testFilePath = inputData.filePath.replace(
                /\.(ts|js|py)$/,
                '.test.$1'
            ) // Simple heuristic

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
    `

            const result = await testEngineerAgent.generate(prompt)

            const parsed = JSON.parse(result.text)
            const outputData = parsed ?? {
                testCode: '',
                testFilePath,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Tests generated.`,
                    stage: 'generate-tests',
                },
                id: 'generate-tests',
            })

            logStepEnd('generate-tests', {}, Date.now() - startTime)

            const finalResult = {
                ...inputData,
                testCode: outputData.testCode,
                testFilePath: outputData.testFilePath ?? testFilePath,
            }

            span?.update({
                output: finalResult,
            })
            span?.end()

            return finalResult
        } catch (error) {
            logError('generate-tests', error instanceof Error ? error : new Error(String(error)))
            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })
            throw error
        }
    },
})

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
        const span = getOrCreateSpan({
            type: SpanType.WORKFLOW_STEP,
            name: 'run-tests',
            input: inputData,
            metadata: {
                'workflow.step': 'run-tests',
                'test.file.path': inputData.testFilePath,
            },
            requestContext,
            mastra,
        })
        const startTime = Date.now()
        logStepStart('run-tests', { testFilePath: inputData.testFilePath })

        try {
            const filesystem = mainWorkspace.filesystem
            if (!filesystem?.writeFile) {
                throw new Error('Workspace filesystem is not available.')
            }

            const sandbox = mainWorkspace.sandbox
            if (!sandbox?.executeCommand) {
                throw new Error('Workspace sandbox executeCommand is not available.')
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Running tests in E2B sandbox...`,
                    stage: 'run-tests',
                },
                id: 'run-tests',
            })

            await filesystem.writeFile(inputData.filePath, inputData.code)
            await filesystem.writeFile(inputData.testFilePath, inputData.testCode)

            let testCommand = ''
            let testArgs: string[] = []
            if (inputData.language === 'ts' || inputData.language === 'js') {
                testCommand = 'npx'
                testArgs = ['-y', 'vitest', 'run', inputData.testFilePath]
            } else if (inputData.language === 'python') {
                testCommand = 'pytest'
                testArgs = [inputData.testFilePath]
            }

            const execution = await sandbox.executeCommand(
                testCommand,
                testArgs,
                {
                    timeout: 120_000,
                }
            )

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Tests executed. Exit code: ${execution.exitCode}`,
                    stage: 'run-tests',
                },
                id: 'run-tests',
            })

            logStepEnd(
                'run-tests',
                { success: execution.success },
                Date.now() - startTime
            )

            const finalResult = {
                testCode: inputData.testCode,
                testFilePath: inputData.testFilePath,
                verificationResult: {
                    success: execution.success,
                    stdout: execution.stdout,
                    stderr: execution.stderr,
                },
            }

            span?.update({
                output: finalResult,
                metadata: {
                    'test.success': execution.success,
                },
            })
            span?.end()

            return finalResult
        } catch (error) {
            logError('run-tests', error instanceof Error ? error : new Error(String(error)))
            const errorResult = {
                testCode: inputData.testCode,
                testFilePath: inputData.testFilePath,
                verificationResult: {
                    success: false,
                    stdout: '',
                    stderr:
                        error instanceof Error ? error.message : String(error),
                },
            }

            span?.error({
                error:
                    error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })

            return errorResult
        }
    },
})

export const testGenerationWorkflow = createWorkflow({
    id: 'testGenerationWorkflow',
    description: 'Generates and runs tests for a given code file',
    inputSchema: testGenInputSchema,
    outputSchema: testGenOutputSchema,
})
    .then(generateTestsStep)
    .then(runTestsStep)

testGenerationWorkflow.commit()

