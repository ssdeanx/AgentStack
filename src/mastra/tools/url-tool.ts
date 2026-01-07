import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { trace } from '@opentelemetry/api'
import { z } from 'zod'
import { log } from '../config/logger'

// Define the Zod schema for the runtime context
const urlToolContextSchema = z.object({
    defaultProtocol: z.string().default('https'),
    allowLocalhost: z.boolean().default(false),
    timeout: z.number().default(5000),
})

// Infer the TypeScript type from the Zod schema
export type UrlToolContext = z.infer<typeof urlToolContextSchema>

export const urlValidationTool = createTool({
    id: 'url-validation',
    description: 'Validate, parse, and analyze URLs',
    inputSchema: z.object({
        url: z.string().describe('URL to validate and analyze'),
        operations: z
            .array(
                z.enum([
                    'validate',
                    'parse',
                    'normalize',
                    'shorten',
                    'check-reachability',
                    'extract-domain',
                    'get-metadata',
                ])
            )
            .optional()
            .default(['validate'])
            .describe('Operations to perform on the URL'),
        options: z
            .object({
                followRedirects: z.boolean().optional().default(false),
                userAgent: z.string().optional(),
                timeout: z.number().optional(),
            })
            .optional(),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        results: z.record(z.string(),
            z.union([
                z.boolean(),
                z.string(),
                z.object({
                    protocol: z.string(),
                    hostname: z.string(),
                    port: z.string().optional(),
                    pathname: z.string(),
                    search: z.string(),
                    hash: z.string(),
                    query: z.record(z.string(), z.string()),
                }),
                z.object({
                    status: z.number().optional(),
                    contentType: z.string().optional(),
                    contentLength: z.number().optional(),
                    lastModified: z.string().optional(),
                    title: z.string().optional(),
                }),
            ])
        ),
        operations: z.array(z.string()),
        originalUrl: z.string(),
        message: z.string().optional(),
    }),
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('URL validation tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            hook: 'onInputStart',
            abortSignal: abortSignal?.aborted,
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('URL validation tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            hook: 'onInputDelta',
            abortSignal: abortSignal?.aborted,
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('URL validation tool received complete input', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: abortSignal?.aborted,
            inputData: {
                url: input.url,
                operationsCount: input.operations.length,
            },
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('URL validation tool completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            outputData: {
                success: output.success,
                operationsCompleted: output.operations.length,
            },
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext

        const { defaultProtocol, allowLocalhost, timeout } =
            urlToolContextSchema.parse(requestContext?.get('urlToolContext'))

        const tracer = trace.getTracer('url-validation-tool', '1.0.0')
        const span = tracer.startSpan('url-validation')

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔗 Analyzing URL: ${inputData.url}`,
                stage: 'url-validation',
            },
            id: 'url-validation',
        })

        try {
            const results: Record<string, any> = {}

            for (const operation of inputData.operations) {
                switch (operation) {
                    case 'validate':
                        results[operation] = validateUrl(
                            inputData.url,
                            allowLocalhost
                        )
                        break
                    case 'parse':
                        results[operation] = parseUrl(inputData.url)
                        break
                    case 'normalize':
                        results[operation] = normalizeUrl(
                            inputData.url,
                            defaultProtocol
                        )
                        break
                    case 'extract-domain':
                        results[operation] = extractDomain(inputData.url)
                        break
                    case 'check-reachability':
                        results[operation] = await checkUrlReachability(
                            inputData.url,
                            inputData.options?.timeout ?? timeout,
                            inputData.options?.userAgent
                        )
                        break
                    case 'get-metadata':
                        if (inputData.options?.followRedirects) {
                            results[operation] = await getUrlMetadata(
                                inputData.url,
                                inputData.options?.timeout ?? timeout,
                                inputData.options?.userAgent
                            )
                        } else {
                            results[operation] =
                                'Metadata fetching disabled (followRedirects=false)'
                        }
                        break
                    case 'shorten':
                        results[operation] = await shortenUrl(inputData.url)
                        break
                    default:
                        throw new Error(`Unknown operation: ${operation}`)
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ URL analysis completed (${inputData.operations.length} operations)`,
                    stage: 'url-validation',
                },
                id: 'url-validation',
            })

            span.setAttributes({
                'tool.output.success': true,
                'tool.output.operationsCount': inputData.operations.length,
            })
            span.end()

            return {
                success: true,
                results,
                operations: inputData.operations,
                originalUrl: inputData.url,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`URL validation failed: ${errorMsg}`)

            if (e instanceof Error) {
                span.recordException(e)
            }
            span.setStatus({ code: 2, message: errorMsg })
            span.end()

            return {
                success: false,
                results: {},
                operations: inputData.operations,
                originalUrl: inputData.url,
                message: errorMsg,
            }
        }
    },
})

export const urlManipulationTool = createTool({
    id: 'url-manipulation',
    description:
        'Manipulate and transform URLs with query parameters, paths, and fragments',
    inputSchema: z.object({
        baseUrl: z.string().describe('Base URL to manipulate'),
        operations: z
            .array(
                z.enum([
                    'add-query',
                    'remove-query',
                    'update-query',
                    'add-path',
                    'replace-path',
                    'add-fragment',
                    'remove-fragment',
                    'change-protocol',
                    'change-hostname',
                    'change-port',
                ])
            )
            .describe('URL manipulation operations'),
        parameters: z
            .record(z.string(), z.any())
            .optional()
            .describe(
                'Parameters for the operations (query params, paths, etc.)'
            ),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        resultUrl: z.string(),
        operations: z.array(z.string()),
        baseUrl: z.string(),
        changes: z.array(
            z.object({
                operation: z.string(),
                description: z.string(),
                before: z.string().optional(),
                after: z.string().optional(),
            })
        ),
        message: z.string().optional(),
    }),
    execute: async (inputData, context) => {
        const writer = context?.writer

        const tracer = trace.getTracer('url-manipulation-tool', '1.0.0')
        const span = tracer.startSpan('url-manipulation')

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🔄 Manipulating URL: ${inputData.baseUrl}`,
                stage: 'url-manipulation',
            },
            id: 'url-manipulation',
        })

        try {
            let currentUrl = inputData.baseUrl
            const changes: Array<{
                operation: string
                description: string
                before?: string
                after?: string
            }> = []

            for (const operation of inputData.operations) {
                const before = currentUrl

                switch (operation) {
                    case 'add-query':
                        if (inputData.parameters?.query) {
                            currentUrl = addQueryParams(
                                currentUrl,
                                inputData.parameters.query as Record<
                                    string,
                                    any
                                >
                            )
                        }
                        break
                    case 'remove-query':
                        if (inputData.parameters?.queryKeys) {
                            currentUrl = removeQueryParams(
                                currentUrl,
                                inputData.parameters.queryKeys as string[]
                            )
                        }
                        break
                    case 'update-query':
                        if (inputData.parameters?.query) {
                            currentUrl = updateQueryParams(
                                currentUrl,
                                inputData.parameters.query as Record<
                                    string,
                                    any
                                >
                            )
                        }
                        break
                    case 'add-path':
                        if (inputData.parameters?.path) {
                            currentUrl = addPath(
                                currentUrl,
                                inputData.parameters.path as string
                            )
                        }
                        break
                    case 'replace-path':
                        if (inputData.parameters?.path) {
                            currentUrl = replacePath(
                                currentUrl,
                                inputData.parameters.path as string
                            )
                        }
                        break
                    case 'add-fragment':
                        if (inputData.parameters?.fragment) {
                            currentUrl = addFragment(
                                currentUrl,
                                inputData.parameters.fragment as string
                            )
                        }
                        break
                    case 'remove-fragment':
                        currentUrl = removeFragment(currentUrl)
                        break
                    case 'change-protocol':
                        if (inputData.parameters?.protocol) {
                            currentUrl = changeProtocol(
                                currentUrl,
                                inputData.parameters.protocol as string
                            )
                        }
                        break
                    case 'change-hostname':
                        if (inputData.parameters?.hostname) {
                            currentUrl = changeHostname(
                                currentUrl,
                                inputData.parameters.hostname as string
                            )
                        }
                        break
                    case 'change-port':
                        currentUrl = changePort(
                            currentUrl,
                            inputData.parameters?.port as
                                | string
                                | number
                                | undefined
                        )
                        break
                    default:
                        throw new Error(`Unknown operation: ${operation}`)
                }

                changes.push({
                    operation,
                    description: getOperationDescription(
                        operation,
                        inputData.parameters
                    ),
                    before,
                    after: currentUrl,
                })
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ URL manipulation completed (${inputData.operations.length} operations)`,
                    stage: 'url-manipulation',
                },
                id: 'url-manipulation',
            })

            span.setAttributes({
                'tool.output.success': true,
                'tool.output.operationsCount': inputData.operations.length,
            })
            span.end()

            return {
                success: true,
                resultUrl: currentUrl,
                operations: inputData.operations,
                baseUrl: inputData.baseUrl,
                changes,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`URL manipulation failed: ${errorMsg}`)

            if (e instanceof Error) {
                span.recordException(e)
            }
            span.setStatus({ code: 2, message: errorMsg })
            span.end()

            return {
                success: false,
                resultUrl: inputData.baseUrl,
                operations: inputData.operations,
                baseUrl: inputData.baseUrl,
                changes: [],
                message: errorMsg,
            }
        }
    },
})

// Helper functions
function validateUrl(url: string, allowLocalhost = false): boolean {
    try {
        const urlObj = new URL(url)

        // Check for localhost if not allowed
        if (
            !allowLocalhost &&
            (urlObj.hostname === 'localhost' ||
                urlObj.hostname === '127.0.0.1' ||
                urlObj.hostname.startsWith('192.168.') ||
                urlObj.hostname.startsWith('10.'))
        ) {
            return false
        }

        // Basic validation
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
        return false
    }
}

function parseUrl(url: string) {
    try {
        const urlObj = new URL(url)
        const queryParams: Record<string, string> = {}

        urlObj.searchParams.forEach((value, key) => {
            queryParams[key] = value
        })

        return {
            protocol: urlObj.protocol,
            hostname: urlObj.hostname,
            port: urlObj.port || undefined,
            pathname: urlObj.pathname,
            search: urlObj.search,
            hash: urlObj.hash,
            query: queryParams,
        }
    } catch {
        throw new Error('Invalid URL format')
    }
}

function normalizeUrl(url: string, defaultProtocol = 'https'): string {
    try {
        // If no protocol, add default
        if (!(/^https?:\/\//.exec(url))) {
            url = `${defaultProtocol}://${url}`
        }

        const urlObj = new URL(url)

        // Remove trailing slash from pathname unless it's just "/"
        if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
            urlObj.pathname = urlObj.pathname.slice(0, -1)
        }

        // Sort query parameters
        const params = Array.from(urlObj.searchParams.entries()).sort()
        urlObj.search = ''
        params.forEach(([key, value]) => {
            urlObj.searchParams.set(key, value)
        })

        return urlObj.toString()
    } catch {
        throw new Error('Cannot normalize invalid URL')
    }
}

function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url)
        return urlObj.hostname
    } catch {
        throw new Error('Invalid URL format')
    }
}

async function checkUrlReachability(
    url: string,
    timeout = 5000,
    userAgent?: string
): Promise<boolean> {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: userAgent ? { 'User-Agent': userAgent } : undefined,
        })

        clearTimeout(timeoutId)
        return response.ok
    } catch {
        return false
    }
}

async function getUrlMetadata(
    url: string,
    timeout = 5000,
    userAgent?: string
) {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: userAgent ? { 'User-Agent': userAgent } : undefined,
        })

        clearTimeout(timeoutId)

        return {
            status: response.status,
            contentType: response.headers.get('content-type') ?? undefined,
            contentLength: response.headers.get('content-length')
                ? parseInt(response.headers.get('content-length')!)
                : undefined,
            lastModified: response.headers.get('last-modified') ?? undefined,
        }
    } catch {
        return { status: undefined }
    }
}

async function shortenUrl(url: string): Promise<string> {
    // For demo purposes, return a mock shortened URL
    // In a real implementation, you'd call a URL shortening service
    const mockShortId = Math.random().toString(36).substring(2, 8)
    return `https://short.ly/${mockShortId}`
}

function addQueryParams(url: string, params: Record<string, any>): string {
    const urlObj = new URL(url)
    Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, String(value))
    })
    return urlObj.toString()
}

function removeQueryParams(url: string, keys: string[]): string {
    const urlObj = new URL(url)
    keys.forEach((key) => urlObj.searchParams.delete(key))
    return urlObj.toString()
}

function updateQueryParams(url: string, params: Record<string, any>): string {
    const urlObj = new URL(url)
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            urlObj.searchParams.delete(key)
        } else {
            urlObj.searchParams.set(key, String(value))
        }
    })
    return urlObj.toString()
}

function addPath(url: string, pathSegment: string): string {
    const urlObj = new URL(url)
    urlObj.pathname =
        urlObj.pathname.replace(/\/$/, '') +
        '/' +
        pathSegment.replace(/^\//, '')
    return urlObj.toString()
}

function replacePath(url: string, newPath: string): string {
    const urlObj = new URL(url)
    urlObj.pathname = newPath.startsWith('/') ? newPath : '/' + newPath
    return urlObj.toString()
}

function addFragment(url: string, fragment: string): string {
    const urlObj = new URL(url)
    urlObj.hash = fragment.startsWith('#') ? fragment : '#' + fragment
    return urlObj.toString()
}

function removeFragment(url: string): string {
    const urlObj = new URL(url)
    urlObj.hash = ''
    return urlObj.toString()
}

function changeProtocol(url: string, protocol: string): string {
    const urlObj = new URL(url)
    urlObj.protocol = protocol.endsWith(':') ? protocol : protocol + ':'
    return urlObj.toString()
}

function changeHostname(url: string, hostname: string): string {
    const urlObj = new URL(url)
    urlObj.hostname = hostname
    return urlObj.toString()
}

function changePort(url: string, port?: string | number): string {
    const urlObj = new URL(url)
    if (port === null || port === undefined || port === '') {
        urlObj.port = ''
    } else {
        urlObj.port = String(port)
    }
    return urlObj.toString()
}

function getOperationDescription(
    operation: string,
    params?: Record<string, any>
): string {
    switch (operation) {
        case 'add-query':
            return `Added query parameters: ${Object.keys(params?.query ?? {}).join(', ')}`
        case 'remove-query':
            return `Removed query parameters: ${((params?.queryKeys as string[]) || []).join(', ')}`
        case 'update-query':
            return `Updated query parameters: ${Object.keys(params?.query ?? {}).join(', ')}`
        case 'add-path':
            return `Added path segment: ${(params?.path as string) || ''}`
        case 'replace-path':
            return `Replaced path with: ${(params?.path as string) || ''}`
        case 'add-fragment':
            return `Added fragment: ${(params?.fragment as string) || ''}`
        case 'remove-fragment':
            return 'Removed fragment'
        case 'change-protocol':
            return `Changed protocol to: ${(params?.protocol as string) || ''}`
        case 'change-hostname':
            return `Changed hostname to: ${(params?.hostname as string) || ''}`
        case 'change-port':
            return `Changed port to: ${params?.port ?? 'default'}`
        default:
            return operation
    }
}

export type UrlValidationUITool = InferUITool<typeof urlValidationTool>
export type UrlManipulationUITool = InferUITool<typeof urlManipulationTool>
