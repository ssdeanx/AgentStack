import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import type { TracingContext } from '@mastra/core/observability'
import type { InferToolInput, InferToolOutput, InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import * as cheerio from 'cheerio'
import { XMLParser } from 'fast-xml-parser'
import { JSDOM } from 'jsdom'
import { schedule } from 'node-cron'
import RE2 from 're2'
import { z } from 'zod'
import { log } from '../config/logger'
import { httpFetch } from '../lib/http-client'
import { createLinkedAbortController, resolveAbortSignal } from './abort-signal.utils'
import type { BaseToolRequestContext } from './request-context.utils'

const DEFAULT_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 AgentStackFetch/1.0'
const TRACKING_PARAM_RE = new RE2(
    '^(utm_[a-z0-9_]+|gclid|fbclid|yclid|mc_eid|mc_cid|igshid|ref|ref_src)$',
    'i'
)
type FetchUserAgent = {
    'user-agent': string
}

type FetchTimeout = {
    timeout: number
}

export interface FetchToolContext extends BaseToolRequestContext {
    'user-agent'?: FetchUserAgent['user-agent']
    timeout?: FetchTimeout['timeout']
}

class FetchToolError extends Error {
    public readonly code: string
    public readonly statusCode?: number
    public readonly url?: string

    constructor(message: string, code: string, statusCode?: number, url?: string) {
        super(message)
        this.code = code
        this.statusCode = statusCode
        this.url = url
        this.name = 'FetchToolError'
    }
}

function validateUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return false
    }
}

function buildRequestHeaders(userAgent?: string): Record<string, string> {
    return {
        'user-agent':
            typeof userAgent === 'string' && userAgent.trim() !== ''
                ? userAgent.trim()
                : DEFAULT_USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
    }
}

function sanitizeHtml(html: string): string {
    const dom = new JSDOM(html, {
        contentType: 'text/html',
        includeNodeLocations: false,
    })

    const { document } = dom.window

    const dangerousTags = [
        'script',
        'style',
        'iframe',
        'object',
        'embed',
        'noscript',
        'form',
        'input',
        'button',
        'select',
        'textarea',
    ]

    dangerousTags.forEach((tag) => {
        document.querySelectorAll(tag).forEach((el) => {
            el.remove()
        })
    })

    document.querySelectorAll('*').forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
            const name = attr.name.toLowerCase()
            if (name.startsWith('on')) {
                el.removeAttribute(attr.name)
            }
            if (name === 'href' && /^\s*javascript:/i.test(attr.value)) {
                el.setAttribute('href', '#')
            }
        })
    })

    return document.body.innerHTML
}

function htmlToMarkdown(html: string): string {
    const $ = cheerio.load(html)

    $('script,style,iframe,object,embed,noscript').remove()

    const title = $('title').first().text().trim()
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim()

    const headings = $('h1,h2,h3')
        .toArray()
        .map((el) => $(el).text().trim())
        .filter((t) => t.length > 0)

    const links = $('a[href]')
        .toArray()
        .map((el) => {
            const href = $(el).attr('href') ?? ''
            const text = $(el).text().trim() || href
            return href.trim().length > 0 ? `- [${text}](${href})` : ''
        })
        .filter((v) => v.length > 0)

    const lines: string[] = []

    if (title.length > 0) {
        lines.push(`# ${title}`, '')
    }

    if (headings.length > 0) {
        lines.push('## Headings')
        headings.forEach((h) => lines.push(`- ${h}`))
        lines.push('')
    }

    if (bodyText.length > 0) {
        lines.push('## Content', bodyText, '')
    }

    if (links.length > 0) {
        lines.push('## Links', ...links, '')
    }

    return lines.join('\n').trim()
}

interface SearchResult {
    title: string
    url: string
    snippet?: string
}

type SearchProvider = 'duckduckgo' | 'google' | 'bing' | 'all'
type SearchVertical = 'web' | 'news' | 'auto'
type ContentWindowMode = 'head' | 'tail' | 'head-tail'

interface ContentWindowConfig {
    minChars: number
    maxChars: number
    mode: ContentWindowMode
}

const DEFAULT_CONTENT_WINDOW: ContentWindowConfig = {
    minChars: 15000,
    maxChars: 75000,
    mode: 'head-tail',
}

function compileRe2Patterns(patterns?: string[]) {
    const compiled: RE2[] = []
    for (const pattern of patterns ?? []) {
        try {
            if (typeof pattern === 'string' && pattern.trim().length > 0) {
                compiled.push(new RE2(pattern))
            }
        } catch (error) {
            log.warn('Invalid RE2 pattern ignored', {
                pattern,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }
    return compiled
}

function passesRe2Filters(
    value: string,
    include: RE2[],
    exclude: RE2[]
): boolean {
    const includePass = include.length === 0 || include.some((re) => re.test(value))
    if (!includePass) {
        return false
    }
    return !exclude.some((re) => re.test(value))
}

function throwIfAborted(
    abortSignal: AbortSignal | undefined,
    message: string
): void {
    if (abortSignal?.aborted ?? false) {
        throw new FetchToolError(message, 'ABORTED')
    }
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>()
    const output: SearchResult[] = []

    for (const result of results) {
        const normalized = normalizeUrl(result.url)
        if (seen.has(normalized)) {
            continue
        }
        seen.add(normalized)
        output.push({ ...result, url: normalized })
    }

    return output
}

function normalizeUrl(rawUrl: string): string {
    try {
        const parsed = new URL(rawUrl.trim())
        const keptParams = new URLSearchParams()
        parsed.searchParams.forEach((value, key) => {
            if (!TRACKING_PARAM_RE.test(key)) {
                keptParams.append(key, value)
            }
        })
        parsed.search = keptParams.toString()
        parsed.hash = ''
        return parsed.toString().trim()
    } catch {
        return rawUrl.trim()
    }
}

function isNewsQuery(query: string): boolean {
    const lowered = query.toLowerCase()
    return /\b(news|headline|headlines|breaking|latest|today|update|updates)\b/.test(
        lowered
    )
}

function applyContentWindow(
    markdown: string,
    window: ContentWindowConfig
): { markdown: string; originalChars: number; outputChars: number; truncated: boolean } {
    const source = markdown
    const originalChars = source.length

    if (originalChars <= window.maxChars) {
        return {
            markdown: source,
            originalChars,
            outputChars: originalChars,
            truncated: false,
        }
    }

    if (window.mode === 'head') {
        const sliced = source.slice(0, window.maxChars).trim()
        return {
            markdown: `${sliced}\n\n---\n_Truncated by content window (head mode)_`,
            originalChars,
            outputChars: sliced.length,
            truncated: true,
        }
    }

    if (window.mode === 'tail') {
        const sliced = source.slice(-window.maxChars).trim()
        return {
            markdown: `_Truncated by content window (tail mode)_\n---\n\n${sliced}`,
            originalChars,
            outputChars: sliced.length,
            truncated: true,
        }
    }

    const headSize = Math.floor(window.maxChars * 0.7)
    const tailSize = window.maxChars - headSize
    const head = source.slice(0, headSize).trim()
    const tail = source.slice(-tailSize).trim()
    const joined = `${head}\n\n---\n_Truncated by content window (head-tail mode)_\n---\n\n${tail}`

    return {
        markdown: joined,
        originalChars,
        outputChars: joined.length,
        truncated: true,
    }
}

function resolveContentWindow(
    input?: Partial<ContentWindowConfig>
): ContentWindowConfig {
    const minChars = input?.minChars ?? DEFAULT_CONTENT_WINDOW.minChars
    const maxChars = input?.maxChars ?? DEFAULT_CONTENT_WINDOW.maxChars
    const mode = input?.mode ?? DEFAULT_CONTENT_WINDOW.mode

    if (minChars > maxChars) {
        return {
            minChars: DEFAULT_CONTENT_WINDOW.minChars,
            maxChars: DEFAULT_CONTENT_WINDOW.maxChars,
            mode,
        }
    }

    return { minChars, maxChars, mode }
}

function extractDuckDuckGoResults(html: string): SearchResult[] {
    const $ = cheerio.load(html)
    const out: SearchResult[] = []

    $('a.result__a').each((_i, el) => {
        const anchor = $(el)
        const title = anchor.text().trim()
        const href = anchor.attr('href') ?? ''
        if (href.trim().length === 0) {
            return
        }

        let resolvedUrl = href
        try {
            const urlObj = new URL(href, 'https://duckduckgo.com')
            const uddg = urlObj.searchParams.get('uddg')
            resolvedUrl =
                typeof uddg === 'string' && uddg.trim().length > 0
                    ? decodeURIComponent(uddg)
                    : urlObj.href
        } catch {
            // Keep original href
        }

        const snippet =
            anchor.closest('.result').find('.result__snippet').text().trim() ||
            undefined

        if (validateUrl(resolvedUrl)) {
            out.push({ title, url: resolvedUrl, snippet })
        }
    })

    return out
}

function extractGoogleResults(html: string): SearchResult[] {
    const $ = cheerio.load(html)
    const out: SearchResult[] = []

    $('a[href^="/url?q="]').each((_i, el) => {
        const anchor = $(el)
        const href = anchor.attr('href') ?? ''
        const title = anchor.text().trim()
        if (href.trim().length === 0) {
            return
        }

        try {
            const parsed = new URL(`https://www.google.com${href}`)
            const target = parsed.searchParams.get('q') ?? ''
            if (!validateUrl(target)) {
                return
            }

            const snippet =
                anchor
                    .closest('div')
                    .parent()
                    .find('span,div')
                    .first()
                    .text()
                    .trim() || undefined

            out.push({
                title: title.length > 0 ? title : target,
                url: target,
                snippet,
            })
        } catch {
            // Skip malformed results
        }
    })

    return out
}

function extractBingResults(html: string): SearchResult[] {
    const $ = cheerio.load(html)
    const out: SearchResult[] = []

    $('li.b_algo').each((_i, el) => {
        const node = $(el)
        const linkEl = node.find('h2 a').first()
        const url = linkEl.attr('href') ?? ''
        if (!validateUrl(url)) {
            return
        }

        const title = linkEl.text().trim()
        const snippet = node.find('p').first().text().trim() || undefined

        out.push({
            title: title.length > 0 ? title : url,
            url,
            snippet,
        })
    })

    return out
}

async function searchDuckDuckGo(options: {
    query: string
    timeout: number
    userAgent?: string
    abortSignal?: AbortSignal
}): Promise<SearchResult[]> {
    throwIfAborted(options.abortSignal, 'Fetch tool cancelled before DuckDuckGo search')
    const response = await httpFetch('https://duckduckgo.com/html/', {
        method: 'GET',
        timeout: options.timeout,
        signal: options.abortSignal,
        responseType: 'text',
        params: { q: options.query },
        headers: buildRequestHeaders(options.userAgent),
    })

    if (!response.ok) {
        throw new FetchToolError(
            `DuckDuckGo search failed: HTTP ${String(response.status)}`,
            'SEARCH_DDG_HTTP_ERROR',
            response.status,
            'https://duckduckgo.com/html/'
        )
    }

    return extractDuckDuckGoResults(await response.text())
}

async function searchGoogle(options: {
    query: string
    maxResults: number
    timeout: number
    userAgent?: string
    abortSignal?: AbortSignal
}): Promise<SearchResult[]> {
    throwIfAborted(options.abortSignal, 'Fetch tool cancelled before Google search')
    const response = await httpFetch('https://www.google.com/search', {
        method: 'GET',
        timeout: options.timeout,
        signal: options.abortSignal,
        responseType: 'text',
        params: {
            q: options.query,
            num: options.maxResults,
            hl: 'en',
        },
        headers: buildRequestHeaders(options.userAgent),
    })

    if (!response.ok) {
        throw new FetchToolError(
            `Google search failed: HTTP ${String(response.status)}`,
            'SEARCH_GOOGLE_HTTP_ERROR',
            response.status,
            'https://www.google.com/search'
        )
    }

    return extractGoogleResults(await response.text())
}

async function searchBing(options: {
    query: string
    timeout: number
    userAgent?: string
    abortSignal?: AbortSignal
}): Promise<SearchResult[]> {
    throwIfAborted(options.abortSignal, 'Fetch tool cancelled before Bing search')
    const response = await httpFetch('https://www.bing.com/search', {
        method: 'GET',
        timeout: options.timeout,
        signal: options.abortSignal,
        responseType: 'text',
        params: { q: options.query, setlang: 'en' },
        headers: buildRequestHeaders(options.userAgent),
    })

    if (!response.ok) {
        throw new FetchToolError(
            `Bing search failed: HTTP ${String(response.status)}`,
            'SEARCH_BING_HTTP_ERROR',
            response.status,
            'https://www.bing.com/search'
        )
    }

    return extractBingResults(await response.text())
}

async function searchGoogleNewsRss(options: {
    query: string
    timeout: number
    userAgent?: string
    maxResults: number
    abortSignal?: AbortSignal
}): Promise<SearchResult[]> {
    throwIfAborted(
        options.abortSignal,
        'Fetch tool cancelled before Google News RSS search'
    )
    const response = await httpFetch('https://news.google.com/rss/search', {
        method: 'GET',
        timeout: options.timeout,
        signal: options.abortSignal,
        responseType: 'text',
        params: {
            q: options.query,
            hl: 'en-US',
            gl: 'US',
            ceid: 'US:en',
        },
        headers: buildRequestHeaders(options.userAgent),
    })

    if (!response.ok) {
        throw new FetchToolError(
            `Google News RSS search failed: HTTP ${String(response.status)}`,
            'SEARCH_GOOGLE_NEWS_RSS_HTTP_ERROR',
            response.status,
            'https://news.google.com/rss/search'
        )
    }

    const xml = await response.text()
    const parser = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: true,
        trimValues: true,
    })

    interface RssItem {
        title?: string
        link?: string
        description?: string
    }
    interface ParsedRss {
        rss?: {
            channel?: {
                item?: RssItem[] | RssItem
            }
        }
    }

    const parsed = parser.parse(xml) as ParsedRss
    const itemsRaw = parsed.rss?.channel?.item
    const items = Array.isArray(itemsRaw)
        ? itemsRaw
        : itemsRaw
          ? [itemsRaw]
          : []

    return items
        .map((item): SearchResult | null => {
            const link = typeof item.link === 'string' ? item.link.trim() : ''
            if (!validateUrl(link)) {
                return null
            }

            const description =
                typeof item.description === 'string'
                    ? cheerio.load(`<div>${item.description}</div>`)('div')
                          .text()
                          .replace(/\s+/g, ' ')
                          .trim()
                    : undefined

            const title =
                typeof item.title === 'string' && item.title.trim() !== ''
                    ? item.title.trim()
                    : link

            return {
                title,
                url: normalizeUrl(link),
                snippet:
                    typeof description === 'string' &&
                    description.trim().length > 0
                        ? description
                        : undefined,
            }
        })
        .filter((item): item is SearchResult => item !== null)
        .slice(0, options.maxResults)
}

async function fetchPageAsMarkdown(options: {
    url: string
    timeout: number
    userAgent?: string
    contentWindow: ContentWindowConfig
    abortSignal?: AbortSignal
}): Promise<{
    markdown: string
    originalChars: number
    outputChars: number
    truncated: boolean
}> {
    const headers: Record<string, string> = {}
    Object.assign(headers, buildRequestHeaders(options.userAgent))

    throwIfAborted(options.abortSignal, 'Fetch tool cancelled before page fetch')
    const response = await httpFetch(options.url, {
        method: 'GET',
        timeout: options.timeout,
        signal: options.abortSignal,
        responseType: 'text',
        headers,
    })

    if (!response.ok) {
        throw new FetchToolError(
            `HTTP ${String(response.status)}: ${response.statusText}`,
            'HTTP_ERROR',
            response.status,
            options.url
        )
    }

    const html = await response.text()
    const markdown = htmlToMarkdown(sanitizeHtml(html))
    return applyContentWindow(markdown, options.contentWindow)
}

const fetchToolInputSchema = z
    .object({
        url: z.url().optional().describe('Direct URL to fetch and convert to markdown.'),
        query: z.string().min(1).max(500).optional().describe('Search query for web discovery.'),
        searchProvider: z
            .enum(['duckduckgo', 'google', 'bing', 'all'])
            .optional()
            .describe('Search backend. No fallback is applied.'),
        searchVertical: z
            .enum(['web', 'news', 'auto'])
            .optional()
            .describe(
                'Search vertical. auto detects news-like queries and adds Google News RSS for reliability.'
            ),
        maxResults: z
            .number()
            .int()
            .min(1)
            .max(10)
            .optional()
            .describe('Maximum search results to return (default: 5).'),
        includeContent: z
            .boolean()
            .optional()
            .describe('Fetch markdown for each search result (default: true).'),
        timeout: z
            .number()
            .min(1000)
            .max(60000)
            .optional()
            .describe('HTTP timeout in milliseconds (default: 30000).'),
        userAgent: z.string().optional().describe('Optional custom user-agent header.'),
        contentContext: z
            .object({
                minChars: z
                    .number()
                    .int()
                    .min(1000)
                    .max(200000)
                    .optional()
                    .describe('Minimum preferred markdown context size in characters.'),
                maxChars: z
                    .number()
                    .int()
                    .min(5000)
                    .max(250000)
                    .optional()
                    .describe('Maximum markdown context size in characters.'),
                mode: z
                    .enum(['head', 'tail', 'head-tail'])
                    .optional()
                    .describe('Truncation mode when content exceeds maxChars.'),
            })
            .optional()
            .describe(
                'Content window controls for markdown output. Defaults to 15k-75k chars in head-tail mode.'
            ),
        includeUrlPatterns: z.array(z.string()).optional().describe('RE2 include regex patterns for URLs.'),
        excludeUrlPatterns: z.array(z.string()).optional().describe('RE2 exclude regex patterns for URLs.'),
    })
    .strict()
    .refine(
        (v) =>
            (typeof v.url === 'string' && v.url.trim().length > 0) ||
            (typeof v.query === 'string' && v.query.trim().length > 0),
        {
            message: 'Either url or query must be provided.',
            path: ['url'],
        }
    )

const fetchToolOutputSchema = z
    .object({
        mode: z.enum(['url', 'search']),
        query: z.string().optional(),
        url: z.string().optional(),
        markdown: z.string(),
        results: z
            .array(
                z.object({
                    title: z.string().optional(),
                    url: z.string(),
                    snippet: z.string().optional(),
                    markdown: z.string().optional(),
                })
            )
            .optional(),
        metadata: z.object({
            fetchedAt: z.string(),
            source: z.string(),
            provider: z.string().optional(),
            vertical: z.string().optional(),
            totalResults: z.number().optional(),
            originalChars: z.number().optional(),
            outputChars: z.number().optional(),
            truncated: z.boolean().optional(),
            contentWindow: z
                .object({
                    minChars: z.number(),
                    maxChars: z.number(),
                    mode: z.enum(['head', 'tail', 'head-tail']),
                })
                .optional(),
            providerDiagnostics: z.record(z.string(), z.string()).optional(),
        }),
    })
    .strict()

export const fetchTool = createTool({
    id: 'fetch',
    description:
        'Production fetch/search tool with RE2 filtering and markdown output. No fallback, no file writes.',
    inputSchema: fetchToolInputSchema,
    outputSchema: fetchToolOutputSchema,
    strict: true,
    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        
        
        log.info('Fetch tool input streaming started', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputStart',
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Fetch tool received input chunk', {
            toolCallId,
            inputTextDelta,
            messageCount: messages?.length ?? 0,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Fetch tool input available', {
            toolCallId,
            messageCount: messages?.length ?? 0,
            abortSignal: resolveAbortSignal(abortSignal).aborted,
            url: input.url,
            query: input.query,
            searchProvider: input.searchProvider,
            searchVertical: input.searchVertical,
            contentContext: input.contentContext,
            hook: 'onInputAvailable',
        })
    },
    execute: async (inputData, context) => {
        const writer = context.writer
        const abortController = createLinkedAbortController(context.abortSignal)
        const abortSignal = abortController.signal
        const requestContext = context.requestContext as RequestContext<FetchToolContext> | undefined
        const userId = requestContext?.all.userId
        const workspaceId = requestContext?.all.workspaceId
        const tracingContext: TracingContext | undefined = context.tracingContext

        throwIfAborted(abortSignal, 'Fetch tool cancelled')

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '🌐 Starting fetch...',
                stage: 'fetch',
            },
            id: 'fetch',
        })

        const span = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'fetch',
            input: inputData,
            requestContext: context.requestContext,
            tracingContext,
            metadata: {
                'tool.id': 'fetch',
                'tool.input.url': inputData.url,
                'tool.input.query': inputData.query,
                'tool.input.searchProvider': inputData.searchProvider,
                'tool.input.searchVertical': inputData.searchVertical,
                    'tool.input.contentContext':
                    typeof inputData.contentContext === 'object'
                        ? JSON.stringify(inputData.contentContext)
                        : undefined,
                    'user.id': userId,
                    'workspace.id': workspaceId,
            },
        })

        const timeout = inputData.timeout ?? requestContext?.get('timeout') ?? 30000
        const userAgent = inputData.userAgent ?? requestContext?.get('user-agent') ?? 'Mastra/1.0'
        const contentWindow = resolveContentWindow(inputData.contentContext)
        const includePatterns = compileRe2Patterns(inputData.includeUrlPatterns)
        const excludePatterns = compileRe2Patterns(inputData.excludeUrlPatterns)

        try {
            if (typeof inputData.url === 'string' && inputData.url.trim() !== '') {
                const page = await fetchPageAsMarkdown({
                    url: inputData.url,
                    timeout,
                    userAgent,
                    contentWindow,
                    abortSignal,
                })

                const result = fetchToolOutputSchema.parse({
                    mode: 'url',
                    url: inputData.url,
                    markdown: page.markdown,
                    metadata: {
                        fetchedAt: new Date().toISOString(),
                        source: 'direct-url',
                        originalChars: page.originalChars,
                        outputChars: page.outputChars,
                        truncated: page.truncated,
                        contentWindow,
                    },
                })

                span?.update({ output: result })
                span?.end()

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: '✅ Fetch complete',
                        stage: 'fetch',
                    },
                    id: 'fetch',
                })

                return result
            }

            const query = inputData.query?.trim() ?? ''
            const maxResults = inputData.maxResults ?? 5
            const includeContent = inputData.includeContent ?? true
            const provider: SearchProvider = inputData.searchProvider ?? 'all'
            const verticalInput: SearchVertical = inputData.searchVertical ?? 'auto'
            const effectiveVertical: 'news' | 'web' =
                verticalInput === 'news'
                    ? 'news'
                    : verticalInput === 'web'
                      ? 'web'
                      : isNewsQuery(query)
                        ? 'news'
                        : 'web'

            const discoveredRaw: SearchResult[] = []
            const providerDiagnostics: Record<string, string> = {}

            if (effectiveVertical === 'news') {
                try {
                    const newsResults = await searchGoogleNewsRss({
                        query,
                        timeout,
                        userAgent,
                        maxResults,
                        abortSignal,
                    })
                    providerDiagnostics['google-news-rss'] = 'ok'
                    discoveredRaw.push(...newsResults)
                } catch (error) {
                    providerDiagnostics['google-news-rss'] =
                        error instanceof Error ? error.message : String(error)
                }
            }

            if (provider === 'duckduckgo') {
                const providerResults = await searchDuckDuckGo({
                    query,
                    timeout,
                    userAgent,
                    abortSignal,
                })
                discoveredRaw.push(...providerResults)
                providerDiagnostics.duckduckgo = 'ok'
            } else if (provider === 'google') {
                const providerResults = await searchGoogle({
                    query,
                    maxResults,
                    timeout,
                    userAgent,
                    abortSignal,
                })
                discoveredRaw.push(...providerResults)
                providerDiagnostics.google = 'ok'
            } else if (provider === 'bing') {
                const providerResults = await searchBing({
                    query,
                    timeout,
                    userAgent,
                    abortSignal,
                })
                discoveredRaw.push(...providerResults)
                providerDiagnostics.bing = 'ok'
            } else {
                const [ddgResults, googleResults, bingResults] = await Promise.all([
                    searchDuckDuckGo({ query, timeout, userAgent, abortSignal })
                        .then((results) => {
                            providerDiagnostics.duckduckgo = 'ok'
                            return results
                        })
                        .catch((error: unknown) => {
                            providerDiagnostics.duckduckgo =
                                error instanceof Error ? error.message : String(error)
                            return []
                        }),
                    searchGoogle({
                        query,
                        maxResults,
                        timeout,
                        userAgent,
                        abortSignal,
                    })
                        .then((results) => {
                            providerDiagnostics.google = 'ok'
                            return results
                        })
                        .catch((error: unknown) => {
                            providerDiagnostics.google =
                                error instanceof Error ? error.message : String(error)
                            return []
                        }),
                    searchBing({ query, timeout, userAgent, abortSignal })
                        .then((results) => {
                            providerDiagnostics.bing = 'ok'
                            return results
                        })
                        .catch((error: unknown) => {
                            providerDiagnostics.bing =
                                error instanceof Error ? error.message : String(error)
                            return []
                        }),
                ])
                discoveredRaw.push(...ddgResults, ...googleResults, ...bingResults)
            }

            const discovered = dedupeResults(discoveredRaw)
                .filter((r) => passesRe2Filters(r.url, includePatterns, excludePatterns))
                .slice(0, maxResults)

            const results: Array<{
                title?: string
                url: string
                snippet?: string
                markdown?: string
            }> = []

            for (const item of discovered) {
                throwIfAborted(abortSignal, 'Fetch tool cancelled during result fetch')

                if (!includeContent) {
                    results.push(item)
                    continue
                }

                try {
                    const resultMarkdown = await fetchPageAsMarkdown({
                        url: item.url,
                        timeout,
                        userAgent,
                        contentWindow,
                        abortSignal,
                    })
                    results.push({ ...item, markdown: resultMarkdown.markdown })
                } catch (error) {
                    log.warn('Result content fetch failed; returning search metadata only', {
                        url: item.url,
                        error: error instanceof Error ? error.message : String(error),
                    })
                    results.push(item)
                }
            }

            const markdown = [
                `# Search results for: ${query}`,
                '',
                ...results.flatMap((r) => {
                    const sectionTitle =
                        typeof r.title === 'string' && r.title.trim() !== ''
                            ? r.title
                            : r.url
                    const lines = [`## ${sectionTitle}`, `- URL: ${r.url}`]
                    if (typeof r.snippet === 'string' && r.snippet.trim() !== '') {
                        lines.push(`- Snippet: ${r.snippet}`)
                    }
                    if (typeof r.markdown === 'string' && r.markdown.trim() !== '') {
                        lines.push('', r.markdown)
                    }
                    lines.push('')
                    return lines
                }),
            ]
                .join('\n')
                .trim()

            const result = fetchToolOutputSchema.parse({
                mode: 'search',
                query,
                markdown,
                results,
                metadata: {
                    fetchedAt: new Date().toISOString(),
                    source: provider,
                    provider,
                    vertical: effectiveVertical,
                    totalResults: results.length,
                    contentWindow,
                    providerDiagnostics,
                },
            })

            span?.update({ output: result })
            span?.end()

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Search complete: ${String(results.length)} result(s)`,
                    stage: 'fetch',
                },
                id: 'fetch',
            })

            return result
        } catch (error) {
            span?.error({
                error: error instanceof Error ? error : new Error(String(error)),
                endSpan: true,
            })
            throw error
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        const parsed = fetchToolOutputSchema.safeParse(output)
        const safeOutput = parsed.success ? parsed.data : undefined

        log.info('Fetch tool completed', {
            toolCallId,
            toolName,
            abortSignal: abortSignal?.aborted,
            mode: safeOutput?.mode ?? 'unknown',
            resultCount: safeOutput?.results?.length ?? 0,
            hook: 'onOutput',
        })
    },
})

export type FetchUITool = InferUITool<typeof fetchTool>
export type FetchToolOutput = InferToolOutput<typeof fetchTool>
export type FetchToolInput = InferToolInput<typeof fetchTool>

interface ScheduledFetchJob {
    jobId: string
    cronExpression: string
    task: ReturnType<typeof schedule>
    input: z.infer<typeof fetchToolInputSchema>
}

const scheduledFetchJobs = new Map<string, ScheduledFetchJob>()

export const scheduledFetchToolInputSchema = z
    .object({
        jobId: z.string().optional(),
        cronExpression: z.string().min(1),
        input: fetchToolInputSchema,
    })
    .strict()

export const scheduledFetchToolOutputSchema = z
    .object({
        jobId: z.string(),
        cronExpression: z.string(),
        scheduled: z.boolean(),
    })
    .strict()

export function scheduleFetchJob({
    jobId,
    cronExpression,
    input,
}: z.infer<typeof scheduledFetchToolInputSchema>): ScheduledFetchJob {
    const resolvedJobId = jobId ?? 'scheduled-fetch-' + Date.now().toString()

    void scheduledFetchJobs.get(resolvedJobId)?.task.stop()

    const task = schedule(cronExpression, async () => {
        log.info('Scheduled fetch started', {
            jobId: resolvedJobId,
            cronExpression,
            hook: 'scheduleFetchJob',
        })

        try {
            const execute = fetchTool.execute

            if (!execute) {
                throw new Error('Fetch tool execute handler is unavailable')
            }

            await execute(input, undefined as never)

            log.info('Scheduled fetch completed', {
                jobId: resolvedJobId,
                cronExpression,
                hook: 'scheduleFetchJob',
            })
        } catch (error) {
            log.error('Scheduled fetch failed', {
                jobId: resolvedJobId,
                cronExpression,
                hook: 'scheduleFetchJob',
                error: error instanceof Error ? error.message : String(error),
            })
        }
    })

    const job: ScheduledFetchJob = {
        jobId: resolvedJobId,
        cronExpression,
        task,
        input,
    }

    scheduledFetchJobs.set(resolvedJobId, job)

    return job
}

export const scheduledFetchTool = createTool({
    id: 'scheduled-fetch',
    description: 'Schedule the fetch tool to run on a cron expression.',
    inputSchema: scheduledFetchToolInputSchema,
    outputSchema: scheduledFetchToolOutputSchema,
    execute: async (inputData) => {
        const job = await Promise.resolve(scheduleFetchJob(inputData))

        return {
            jobId: job.jobId,
            cronExpression: job.cronExpression,
            scheduled: true,
        }
    },
})

export function stopScheduledFetchJob(jobId: string): boolean {
    const job = scheduledFetchJobs.get(jobId)

    if (!job) {
        return false
    }

    void job.task.stop()
    scheduledFetchJobs.delete(jobId)

    return true
}

export function listScheduledFetchJobs(): ScheduledFetchJob[] {
    return Array.from(scheduledFetchJobs.values())
}
