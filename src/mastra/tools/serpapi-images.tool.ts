/**
 * SerpAPI Google Images Tool
 *
 * Provides structured Google Images search results, inline images, and a
 * compact knowledge-graph summary when available.
 */
import type { RequestContext } from '@mastra/core/request-context'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type {
    InferToolInput,
    InferToolOutput,
    InferUITool,
} from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { getJson } from 'serpapi'
import { z } from 'zod'
import { log } from '../config/logger'
import { validateSerpApiKey } from './serpapi-config'

/**
 * Shared request context for the SerpApi Google Images tool.
 */
export interface SerpApiImagesContext extends RequestContext {
    userId?: string
}

interface GoogleImagesRawResult {
    position?: number
    thumbnail: string
    related_content_id?: string
    serpapi_related_content_link?: string
    original?: string
    original_width?: number
    original_height?: number
    title?: string
    tag?: string
    link?: string
    source?: string
    source_logo?: string
    is_product?: boolean
    in_stock?: boolean
}

interface GoogleImagesInlineImage {
    link: string
    source: string
    thumbnail: string
}

interface GoogleImagesSuggestedSearch {
    name: string
    link: string
    chips?: string
    serpapi_link?: string
    thumbnail?: string
}

interface GoogleImagesKnowledgeGraphRaw {
    title?: string
    type?: string
    thumbnail?: string
    serpapi_link?: string
    description?: string
    merchant_description?: string
}

interface GoogleImagesResponse {
    images_results?: GoogleImagesRawResult[]
    inline_images?: GoogleImagesInlineImage[]
    inline_images_suggested_searches?: GoogleImagesSuggestedSearch[]
    knowledge_graph?: GoogleImagesKnowledgeGraphRaw
}

const googleImagesOutputSchema = z.object({
    imagesResults: z
        .array(
            z.object({
                position: z.number().optional(),
                thumbnail: z.url(),
                relatedContentId: z.string().optional(),
                serpapiRelatedContentLink: z.url().optional(),
                original: z.url().optional(),
                originalWidth: z.number().optional(),
                originalHeight: z.number().optional(),
                title: z.string().optional(),
                tag: z.string().optional(),
                link: z.url().optional(),
                source: z.string().optional(),
                sourceLogo: z.url().optional(),
                isProduct: z.boolean().optional(),
                inStock: z.boolean().optional(),
            })
        )
        .describe('Normalized Google Images search results'),
    inlineImages: z
        .array(
            z.object({
                link: z.url(),
                source: z.url(),
                thumbnail: z.url(),
            })
        )
        .optional()
        .describe('Inline image cards shown in the Google Images response'),
    inlineImageSuggestedSearches: z
        .array(
            z.object({
                name: z.string(),
                link: z.url(),
                chips: z.string().optional(),
                serpapiLink: z.url().optional(),
                thumbnail: z.url().optional(),
            })
        )
        .optional()
        .describe('Suggested follow-up searches from the inline image section'),
    knowledgeGraph: z
        .object({
            title: z.string().optional(),
            type: z.string().optional(),
            thumbnail: z.url().optional(),
            serpapiLink: z.url().optional(),
            description: z.string().optional(),
            merchantDescription: z.string().optional(),
        })
        .optional()
        .describe('Compact knowledge graph summary when SerpApi returns one'),
})

const googleImagesInputSchema = z.object({
    query: z.string().min(1).describe('The image search query'),
    language: z
        .string()
        .default('en')
        .describe('Two-letter language code for the response'),
    country: z
        .string()
        .default('us')
        .describe('Two-letter country code for the response'),
    pageIndex: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe('Image page index used by the ijn parameter'),
    filters: z
        .string()
        .optional()
        .describe('Raw tbs filter string, for example: itp:photos,isz:l'),
})

/**
 * Google Images tool.
 */
export const googleImagesTool = createTool({
    id: 'google-images',
    description:
        'Search Google Images and return structured image results, inline images, suggested searches, and a compact knowledge-graph summary. Useful for visual research, inspiration, and image source discovery.',
    inputSchema: googleImagesInputSchema,
    outputSchema: googleImagesOutputSchema,
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google Images received input', {
            toolCallId,
            inputData: {
                query: input.query,
                language: input.language,
                country: input.country,
                pageIndex: input.pageIndex,
                filters: input.filters,
            },
            messageCount: messages?.length ?? 0,
            aborted: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext as
            | SerpApiImagesContext
            | undefined
        const tracingContext = context?.tracingContext

        validateSerpApiKey()

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `🖼️ Searching Google Images for "${input.query}"`,
                stage: 'google-images',
            },
            id: 'google-images',
        })

        const imagesSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-images-tool',
            input,
            metadata: {
                'tool.id': 'google-images',
                query: input.query,
                pageIndex: input.pageIndex,
                operation: 'google-images',
            },
            requestContext,
            tracingContext,
        })

        try {
            const language = input.language ?? 'en'
            const country = input.country ?? 'us'
            const pageIndex = input.pageIndex ?? 0

            const params: Record<string, string | number> = {
                engine: 'google_images',
                q: input.query,
                hl: language,
                gl: country,
                ijn: pageIndex,
                google_domain: 'google.com',
            }

            if (typeof input.filters === 'string' && input.filters.length > 0) {
                params.tbs = input.filters
            }

            const rawResponse = (await getJson(params)) as GoogleImagesResponse

            const imagesResults = (rawResponse.images_results ?? []).map(
                (image) => ({
                    position: image.position,
                    thumbnail: image.thumbnail,
                    relatedContentId: image.related_content_id,
                    serpapiRelatedContentLink: image.serpapi_related_content_link,
                    original: image.original,
                    originalWidth: image.original_width,
                    originalHeight: image.original_height,
                    title: image.title,
                    tag: image.tag,
                    link: image.link,
                    source: image.source,
                    sourceLogo: image.source_logo,
                    isProduct: image.is_product,
                    inStock: image.in_stock,
                })
            )

            const inlineImages = rawResponse.inline_images?.map((image) => ({
                link: image.link,
                source: image.source,
                thumbnail: image.thumbnail,
            }))

            const inlineImageSuggestedSearches =
                rawResponse.inline_images_suggested_searches?.map((search) => ({
                    name: search.name,
                    link: search.link,
                    chips: search.chips,
                    serpapiLink: search.serpapi_link,
                    thumbnail: search.thumbnail,
                }))

            const knowledgeGraph = rawResponse.knowledge_graph
                ? {
                      title: rawResponse.knowledge_graph.title,
                      type: rawResponse.knowledge_graph.type,
                      thumbnail: rawResponse.knowledge_graph.thumbnail,
                      serpapiLink: rawResponse.knowledge_graph.serpapi_link,
                      description: rawResponse.knowledge_graph.description,
                      merchantDescription:
                          rawResponse.knowledge_graph.merchant_description,
                  }
                : undefined

            const result = {
                imagesResults,
                inlineImages,
                inlineImageSuggestedSearches,
                knowledgeGraph,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Google Images search complete: ${imagesResults.length} images`,
                    stage: 'google-images',
                },
                id: 'google-images',
            })

            imagesSpan?.update({
                output: result,
                metadata: {
                    'tool.output.imageCount': imagesResults.length,
                },
            })
            imagesSpan?.end()

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            imagesSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            log.error('Google Images search failed', {
                query: input.query,
                error: errorMessage,
            })
            throw new Error(`Google Images search failed: ${errorMessage}`, {
                cause: error,
            })
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google Images completed', {
            toolCallId,
            toolName,
            imageCount: output.imagesResults.length,
            aborted: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export type GoogleImagesToolUI = InferUITool<typeof googleImagesTool>
export type GoogleImagesToolOutput = InferToolOutput<typeof googleImagesTool>
export type GoogleImagesToolInput = InferToolInput<typeof googleImagesTool>
