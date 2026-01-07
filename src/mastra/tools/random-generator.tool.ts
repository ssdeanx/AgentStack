import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { trace } from '@opentelemetry/api'
import { z } from 'zod'
import { log } from '../config/logger'

// Define the Zod schema for the runtime context
const randomToolContextSchema = z.object({
    seed: z.number().optional(),
    locale: z.string().default('en'),
})

// Infer the TypeScript type from the Zod schema
export type RandomToolContext = z.infer<typeof randomToolContextSchema>

export const randomGeneratorTool = createTool({
    id: 'random-generator',
    description: 'Generate random data for testing and development',
    inputSchema: z.object({
        type: z
            .enum([
                'string',
                'number',
                'boolean',
                'date',
                'uuid',
                'email',
                'name',
                'address',
                'array',
                'object',
            ])
            .describe('Type of random data to generate'),
        count: z
            .number()
            .optional()
            .default(1)
            .describe('Number of items to generate'),
        options: z
            .object({
                min: z
                    .number()
                    .optional()
                    .describe('Minimum value for numbers'),
                max: z
                    .number()
                    .optional()
                    .describe('Maximum value for strings/numbers'),
                length: z.number().optional().describe('Length for strings'),
                format: z.string().optional().describe('Format for dates'),
                includeSpecial: z
                    .boolean()
                    .optional()
                    .describe('Include special characters in strings'),
                locale: z
                    .string()
                    .optional()
                    .describe('Locale for names/addresses'),
            })
            .optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        data: z
            .union([
                z.string(),
                z.number(),
                z.boolean(),
                z.array(z.any()),
                z.record(z.string(), z.any()),
            ])
            .nullable(),
        type: z.string(),
        count: z.number(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Random generator tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            hook: 'onInputStart',
            abortSignal: abortSignal?.aborted,
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Random generator tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            hook: 'onInputDelta',
            abortSignal: abortSignal?.aborted,
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Random generator tool received complete input', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            inputData: {
                type: input.type,
                count: input.count,
            },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Random generator tool completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            outputData: {
                success: output.success,
                type: output.type,
                count: output.count,
            },
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer

        const tracer = trace.getTracer('random-generator-tool', '1.0.0')
        const span = tracer.startSpan('random-generate')

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🎲 Generating ${inputData.count} random ${inputData.type}(s)...`,
                stage: 'random-generator',
            },
            id: 'random-generator',
        })

        try {
            let result: any

            if (inputData.count === 1) {
                result = generateRandomItem(inputData.type, inputData.options)
            } else {
                result = []
                for (let i = 0; i < inputData.count; i++) {
                    result.push(
                        generateRandomItem(inputData.type, inputData.options)
                    )
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Generated ${inputData.count} random ${inputData.type}(s)`,
                    stage: 'random-generator',
                },
                id: 'random-generator',
            })

            span.setAttributes({
                'tool.output.success': true,
                'tool.output.type': inputData.type,
                'tool.output.count': inputData.count,
            })
            span.end()

            return {
                success: true,
                data: result,
                type: inputData.type,
                count: inputData.count,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`Random generation failed: ${errorMsg}`)

            if (e instanceof Error) {
                span.recordException(e)
            }
            span.setStatus({ code: 2, message: errorMsg })
            span.end()

            return {
                success: false,
                data: null,
                type: inputData.type,
                count: inputData.count,
                message: errorMsg,
            }
        }
    },
})

// Helper functions
function generateRandomItem(type: string, options?: any): any {
    switch (type) {
        case 'string':
            return generateRandomString(
                options?.length || 10,
                options?.includeSpecial || false
            )
        case 'number':
            return generateRandomNumber(options?.min || 0, options?.max || 100)
        case 'boolean':
            return Math.random() > 0.5
        case 'date':
            return generateRandomDate(options?.format)
        case 'uuid':
            return generateUUID()
        case 'email':
            return generateRandomEmail()
        case 'name':
            return generateRandomName(options?.locale || 'en')
        case 'address':
            return generateRandomAddress(options?.locale || 'en')
        case 'array':
            return generateRandomArray(
                options?.length || 5,
                options?.itemType || 'string'
            )
        case 'object':
            return generateRandomObject(options?.properties || 3)
        default:
            throw new Error(`Unknown type: ${type}`)
    }
}

function generateRandomString(
    length: number,
    includeSpecial = false
): string {
    const chars = includeSpecial
        ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
        : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

function generateRandomNumber(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRandomDate(format?: string): string {
    const start = new Date(2000, 0, 1)
    const end = new Date()
    const randomDate = new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
    )

    if (format === 'iso') {
        return randomDate.toISOString()
    } else if (format === 'timestamp') {
        return randomDate.getTime().toString()
    } else {
        return randomDate.toISOString().split('T')[0] // YYYY-MM-DD format
    }
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        (c) => {
            const r = (Math.random() * 16) | 0
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
        }
    )
}

function generateRandomEmail(): string {
    const domains = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'example.com',
    ]
    const name = generateRandomString(8, false).toLowerCase()
    const domain = domains[Math.floor(Math.random() * domains.length)]
    return `${name}@${domain}`
}

function generateRandomName(locale = 'en'): string {
    const firstNames = {
        en: [
            'John',
            'Jane',
            'Michael',
            'Sarah',
            'David',
            'Emma',
            'James',
            'Olivia',
        ],
        es: [
            'Juan',
            'Maria',
            'Carlos',
            'Ana',
            'Luis',
            'Carmen',
            'Jose',
            'Isabel',
        ],
        fr: [
            'Jean',
            'Marie',
            'Pierre',
            'Sophie',
            'Michel',
            'Claire',
            'Philippe',
            'Isabelle',
        ],
    }

    const lastNames = {
        en: [
            'Smith',
            'Johnson',
            'Brown',
            'Williams',
            'Jones',
            'Garcia',
            'Miller',
            'Davis',
        ],
        es: [
            'Garcia',
            'Rodriguez',
            'Gonzalez',
            'Fernandez',
            'Lopez',
            'Martinez',
            'Sanchez',
            'Perez',
        ],
        fr: [
            'Dubois',
            'Martin',
            'Bernard',
            'Thomas',
            'Petit',
            'Robert',
            'Richard',
            'Durand',
        ],
    }

    const names1 =
        firstNames[locale as keyof typeof firstNames] || firstNames.en
    const names2 = lastNames[locale as keyof typeof lastNames] || lastNames.en

    const first = names1[Math.floor(Math.random() * names1.length)]
    const last = names2[Math.floor(Math.random() * names2.length)]

    return `${first} ${last}`
}

function generateRandomAddress(locale = 'en'): string {
    const streets = [
        'Main St',
        'Oak Ave',
        'Pine Rd',
        'Elm St',
        'Maple Dr',
        'Cedar Ln',
    ]
    const cities = {
        en: [
            'New York',
            'Los Angeles',
            'Chicago',
            'Houston',
            'Phoenix',
            'Philadelphia',
        ],
        es: [
            'Madrid',
            'Barcelona',
            'Valencia',
            'Sevilla',
            'Zaragoza',
            'Malaga',
        ],
        fr: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes'],
    }

    const street = streets[Math.floor(Math.random() * streets.length)]
    const cityList = cities[locale as keyof typeof cities] || cities.en
    const city = cityList[Math.floor(Math.random() * cityList.length)]
    const number = generateRandomNumber(1, 9999)

    return `${number} ${street}, ${city}`
}

function generateRandomArray(length: number, itemType: string): any[] {
    const result = []
    for (let i = 0; i < length; i++) {
        result.push(generateRandomItem(itemType))
    }
    return result
}

function generateRandomObject(properties: number): Record<string, any> {
    const result: Record<string, any> = {}
    for (let i = 0; i < properties; i++) {
        const key = `prop${i + 1}`
        const type = ['string', 'number', 'boolean'][
            Math.floor(Math.random() * 3)
        ]
        result[key] = generateRandomItem(type)
    }
    return result
}

export type RandomGeneratorUITool = InferUITool<typeof randomGeneratorTool>
