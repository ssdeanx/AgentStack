import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { z } from 'zod'
import { log } from '../config/logger'
import {
    createLinkedAbortController,
    resolveAbortSignal,
} from './abort-signal.utils'

export interface UrlToolContext extends RequestContext {
    defaultProtocol?: string
    allowLocalhost?: boolean
    timeout?: number
    userId?: string
}

const UrlScalarSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
])
const UrlQueryRecordSchema = z.record(z.string(), UrlScalarSchema)
const UrlParameterValueSchema = z.union([
    UrlScalarSchema,
    z.array(z.string()),
    UrlQueryRecordSchema,
])

type UrlScalar = z.infer<typeof UrlScalarSchema>
type UrlQueryRecord = z.infer<typeof UrlQueryRecordSchema>
type UrlParameterValue = z.infer<typeof UrlParameterValueSchema>
type UrlParameters = Record<string, UrlParameterValue>

const UrlValidationInputSchema = z.object({
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
})

const UrlValidationOutputSchema = z.object({
    success: z.boolean(),
    results: z.record(
        z.string(),
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
})

const UrlManipulationInputSchema = z.object({
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
        .record(z.string(), UrlParameterValueSchema)
        .optional()
        .describe(
            'Parameters for the operations (query params, paths, etc.)'
        ),
})

const UrlManipulationOutputSchema = z.object({
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
})

export const urlValidationTool = createTool({
    id: 'url-validation',
    description: 'Validate, parse, and analyze URLs',
    inputSchema: UrlValidationInputSchema,
    outputSchema: UrlValidationOutputSchema,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('URL validation tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('URL validation tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('URL validation tool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                url: input.url,
                operationsCount: input.operations?.length ?? 1,
            },
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('URL validation tool completed', {
            toolCallId,
            toolName,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            outputData: {
                success: output.success,
                operationsCompleted: output.operations.length,
            },
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortController = createLinkedAbortController(context?.abortSignal)
        const abortSignal = abortController.signal
        const tracingContext = context?.tracingContext
        const operations = inputData.operations ?? ['validate']

        const requestCtx = context?.requestContext as UrlToolContext | undefined
        const defaultProtocol = requestCtx?.defaultProtocol ?? 'https'
        const allowLocalhost = requestCtx?.allowLocalhost ?? false
        const timeout = requestCtx?.timeout ?? 5000

        if (abortSignal.aborted) {
            throw new Error('URL validation cancelled')
        }

        // Create child span for URL validation
        const urlValidationSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'url-validation',
            input: inputData,
            requestContext: context?.requestContext,
            tracingContext,
            metadata: {
                'tool.id': 'url-validation',
                'tool.input.url': inputData.url,
                'tool.input.operationsCount': operations.length,
                'user.id': requestCtx?.userId,
            },
        })

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
            type UrlValidationResult =
                | boolean
                | string
                | {
                      protocol: string
                      hostname: string
                      port?: string
                      pathname: string
                      search: string
                      hash: string
                      query: Record<string, string>
                  }
                | {
                      status?: number
                      contentType?: string
                      contentLength?: number
                      lastModified?: string
                      title?: string
                  }
            const results: Record<string, UrlValidationResult> = {}

            for (const operation of operations) {
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
                    case 'get-metadata': {
                        const followRedirects =
                            inputData.options?.followRedirects ?? false
                        if (followRedirects) {
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
                    }
                    case 'shorten':
                        results[operation] = shortenUrl(inputData.url)
                        break
                    default:
                        {
                            const unreachableOperation: never = operation
                            throw new Error(
                                `Unknown operation: ${String(unreachableOperation)}`
                            )
                        }
                }
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ URL analysis completed (${operations.length} operations)`,
                    stage: 'url-validation',
                },
                id: 'url-validation',
            })

            // Update span with successful result
            urlValidationSpan?.update({
                output: {
                    success: true,
                    operationsCount: operations.length,
                },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.operationsCount': operations.length,
                },
            })
            urlValidationSpan?.end()

            return {
                success: true,
                results,
                operations,
                originalUrl: inputData.url,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`URL validation failed: ${errorMsg}`, { error: errorMsg })

            // Record error in span
            urlValidationSpan?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })

            return {
                success: false,
                results: {},
                operations,
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
    inputSchema: UrlManipulationInputSchema,
    outputSchema: UrlManipulationOutputSchema,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('URL manipulation tool input streaming started', {
            toolCallId,
            messageCount: messages.length,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('URL manipulation tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages.length,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('URL manipulation tool received input', {
            toolCallId,
            messageCount: messages.length,
            inputData: {
                baseUrl: input.baseUrl,
                operationsCount: input.operations.length,
            },
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputAvailable',
        })
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('URL manipulation tool completed', {
            toolCallId,
            toolName,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            outputData: {
                success: output.success,
                resultUrl: output.resultUrl,
            },
            hook: 'onOutput',
        })
    },
    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortController = createLinkedAbortController(context?.abortSignal)
        const abortSignal = abortController.signal
        const tracingContext = context?.tracingContext
        const requestCtx = context?.requestContext as UrlToolContext | undefined

        if (abortSignal.aborted) {
            throw new Error('URL manipulation cancelled')
        }

        // Create child span for URL manipulation
        const urlManipulationSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'url-manipulation',
            input: inputData,
            requestContext: context?.requestContext,
            tracingContext,
            metadata: {
                'tool.id': 'url-manipulation',
                'tool.input.baseUrl': inputData.baseUrl,
                'tool.input.operationsCount': inputData.operations.length,
                'user.id': requestCtx?.userId,
            },
        })

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
                        if (
                            inputData.parameters &&
                            'query' in inputData.parameters
                        ) {
                            currentUrl = addQueryParams(
                                currentUrl,
                                inputData.parameters.query as UrlQueryRecord
                            )
                        }
                        break
                    case 'remove-query':
                        if (
                            inputData.parameters &&
                            'queryKeys' in inputData.parameters
                        ) {
                            currentUrl = removeQueryParams(
                                currentUrl,
                                inputData.parameters.queryKeys as string[]
                            )
                        }
                        break
                    case 'update-query':
                        if (
                            inputData.parameters &&
                            'query' in inputData.parameters
                        ) {
                            currentUrl = updateQueryParams(
                                currentUrl,
                                inputData.parameters.query as UrlQueryRecord
                            )
                        }
                        break
                    case 'add-path':
                        if (
                            inputData.parameters &&
                            'path' in inputData.parameters
                        ) {
                            currentUrl = addPath(
                                currentUrl,
                                inputData.parameters.path as string
                            )
                        }
                        break
                    case 'replace-path':
                        if (
                            inputData.parameters &&
                            'path' in inputData.parameters
                        ) {
                            currentUrl = replacePath(
                                currentUrl,
                                inputData.parameters.path as string
                            )
                        }
                        break
                    case 'add-fragment':
                        if (
                            inputData.parameters &&
                            'fragment' in inputData.parameters
                        ) {
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
                        if (
                            inputData.parameters &&
                            'protocol' in inputData.parameters
                        ) {
                            currentUrl = changeProtocol(
                                currentUrl,
                                inputData.parameters.protocol as string
                            )
                        }
                        break
                    case 'change-hostname':
                        if (
                            inputData.parameters &&
                            'hostname' in inputData.parameters
                        ) {
                            currentUrl = changeHostname(
                                currentUrl,
                                inputData.parameters.hostname as string
                            )
                        }
                        break
                    case 'change-port':
                        if (
                            inputData.parameters &&
                            'port' in inputData.parameters
                        ) {
                            currentUrl = changePort(
                                currentUrl,
                                inputData.parameters.port as
                                    | string
                                    | number
                                    | undefined
                            )
                        }
                        break
                    default:
                        {
                            const unreachableOperation: never = operation
                            throw new Error(
                                `Unknown operation: ${String(unreachableOperation)}`
                            )
                        }
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

            // Update span with successful result
            urlManipulationSpan?.update({
                output: {
                    success: true,
                    operationsCount: inputData.operations.length,
                },
                metadata: {
                    'tool.output.success': true,
                    'tool.output.operationsCount': inputData.operations.length,
                },
            })
            urlManipulationSpan?.end()

            return {
                success: true,
                resultUrl: currentUrl,
                operations: inputData.operations,
                baseUrl: inputData.baseUrl,
                changes,
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e)
            log.error(`URL manipulation failed: ${errorMsg}`, {
                error: errorMsg,
            })

            // Record error in span
            urlManipulationSpan?.error({
                error: e instanceof Error ? e : new Error(errorMsg),
                endSpan: true,
            })

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
        if (!/^https?:\/\//.exec(url)) {
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
    userAgent?: string,
    parentAbortSignal?: AbortSignal
): Promise<boolean> {
    try {
        const controller = createLinkedAbortController(parentAbortSignal)
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const hasUserAgent = typeof userAgent === 'string' && userAgent.length > 0
        const headers = hasUserAgent ? { 'User-Agent': userAgent } : undefined
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers,
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
    userAgent?: string,
    parentAbortSignal?: AbortSignal
) {
    try {
        const controller = createLinkedAbortController(parentAbortSignal)
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const hasUserAgent = typeof userAgent === 'string' && userAgent.length > 0
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: hasUserAgent ? { 'User-Agent': userAgent } : undefined,
        })

        clearTimeout(timeoutId)

        const contentLengthHeader = response.headers.get('content-length')

        return {
            status: response.status,
            contentType: response.headers.get('content-type') ?? undefined,
            contentLength:
                contentLengthHeader === null
                    ? undefined
                    : Number.parseInt(contentLengthHeader, 10),
            lastModified: response.headers.get('last-modified') ?? undefined,
        }
    } catch {
        return { status: undefined }
    }
}

function shortenUrl(_url: string): string {
    void _url
    // For demo purposes, return a mock shortened URL
    // In a real implementation, you'd call a URL shortening service
    const mockShortId = Math.random().toString(36).substring(2, 8)
    return `https://short.ly/${mockShortId}`
}

function serializeUrlScalar(value: UrlScalar): string {
    return value === null ? 'null' : String(value)
}

function describeParameterValue(value: UrlParameterValue | undefined): string {
    if (value === undefined) {
        return ''
    }

    if (Array.isArray(value)) {
        return value.join(', ')
    }

    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
    ) {
        return serializeUrlScalar(value)
    }

    return Object.keys(value).join(', ')
}

function addQueryParams(url: string, params: UrlQueryRecord): string {
    const urlObj = new URL(url)
    Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, serializeUrlScalar(value))
    })
    return urlObj.toString()
}

function removeQueryParams(url: string, keys: string[]): string {
    const urlObj = new URL(url)
    keys.forEach((key) => urlObj.searchParams.delete(key))
    return urlObj.toString()
}

function updateQueryParams(url: string, params: UrlQueryRecord): string {
    const urlObj = new URL(url)
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            urlObj.searchParams.delete(key)
        } else {
            urlObj.searchParams.set(key, serializeUrlScalar(value))
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
    params?: UrlParameters
): string {
    switch (operation) {
        case 'add-query': {
            const queryKeys =
                params &&
                typeof params.query === 'object' &&
                params.query !== null
                    ? Object.keys(params.query as UrlQueryRecord).join(
                          ', '
                      )
                    : ''
            return `Added query parameters: ${queryKeys}`
        }
        case 'remove-query': {
            const keys =
                params &&
                'queryKeys' in params &&
                Array.isArray(params['queryKeys'])
                    ? (params['queryKeys'] as string[]).join(', ')
                    : ''
            return `Removed query parameters: ${keys}`
        }
        case 'update-query': {
            const updated =
                params &&
                typeof params.query === 'object' &&
                params.query !== null
                    ? Object.keys(params.query as UrlQueryRecord).join(
                          ', '
                      )
                    : ''
            return `Updated query parameters: ${updated}`
        }
        case 'add-path':
            return `Added path segment: ${describeParameterValue(params?.path)}`
        case 'replace-path':
            return `Replaced path with: ${describeParameterValue(params?.path)}`
        case 'add-fragment':
            return `Added fragment: ${describeParameterValue(params?.fragment)}`
        case 'remove-fragment':
            return 'Removed fragment'
        case 'change-protocol':
            return `Changed protocol to: ${describeParameterValue(params?.protocol)}`
        case 'change-hostname':
            return `Changed hostname to: ${describeParameterValue(params?.hostname)}`
        case 'change-port':
            return `Changed port to: ${describeParameterValue(params?.port) || 'default'}`
        default:
            return operation
    }
}

export type UrlValidationUITool = InferUITool<typeof urlValidationTool>
export type UrlManipulationUITool = InferUITool<typeof urlManipulationTool>
