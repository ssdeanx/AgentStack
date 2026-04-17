/**
 * SerpAPI Local and Maps Review Tools
 *
 * Provides Google Local search and Google Maps reviews extraction.
 * These tools are useful for business discovery, location research, and
 * review analysis workflows.
 */
import type { RequestContext } from '@mastra/core/request-context'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import type { TracingContext } from '@mastra/core/observability'
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
 * Shared request context for SerpAPI local and review tools.
 */
export interface SerpApiLocalContext extends RequestContext {
    userId?: string
}

const localCoordinatesSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
})

/**
 * Google Local responses sometimes return numeric fields as strings.
 *
 * @param value - Raw numeric-like value from SerpApi
 * @returns Parsed number when possible
 */
function parseOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value.replace(/,/g, ''))
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }

    return undefined
}

/**
 * Normalizes a Google result type into a string array.
 *
 * Google Local sometimes returns a single string and sometimes a list.
 *
 * @param type - Raw type value from SerpApi
 * @returns Normalized array of type labels
 */
function normalizeResultType(type: unknown): string[] | undefined {
    if (Array.isArray(type)) {
        return type.filter((item): item is string => typeof item === 'string')
    }

    if (typeof type === 'string' && type.trim().length > 0) {
        return [type]
    }

    return undefined
}

interface GoogleLocalLinkGroup {
    website?: string
    directions?: string
}

interface GoogleLocalServiceOptions {
    dine_in?: boolean
    takeout?: boolean
    delivery?: boolean
    curbside_pickup?: boolean
}

interface GoogleLocalRawResult {
    position?: number
    title: string
    data_id?: string
    data_cid?: string
    place_id?: string
    reviews_link?: string
    photos_link?: string
    gps_coordinates?: {
        latitude?: number
        longitude?: number
    }
    place_id_search?: string
    rating?: number
    reviews?: number | string
    reviews_original?: string
    price?: string
    description?: string
    lsig?: string
    thumbnail?: string
    type?: string | string[]
    address?: string
    phone?: string
    hours?: string
    open_state?: string
    website?: string
    links?: GoogleLocalLinkGroup
    service_options?: GoogleLocalServiceOptions
}

interface GoogleLocalResponse {
    local_results?: GoogleLocalRawResult[]
    pagination?: {
        next?: string
        previous?: string
    }
    serpapi_pagination?: {
        next?: string
        previous?: string
    }
    search_information?: {
        total_results?: number | string
    }
}

interface GoogleMapsReviewAuthor {
    name?: string
    url?: string
    photo_url?: string
    local_guide?: boolean
    reviews?: number | string
    photos?: number | string
}

interface GoogleMapsReviewRaw {
    position?: number
    author?: GoogleMapsReviewAuthor
    author_name?: string
    author_url?: string
    author_photo_url?: string
    local_guide?: boolean
    reviews?: number | string
    photos?: number | string
    rating?: number
    date?: string
    snippet?: string
    text?: string
    likes?: number | string
    images?: string[]
    review_id?: string
}

interface GoogleMapsPlaceInfoRaw {
    title?: string
    rating?: number
    reviews?: number | string
    price?: string
    type?: string | string[]
    address?: string
    phone?: string
    website?: string
    hours?: string
    open_state?: string
    description?: string
    thumbnail?: string
    data_id?: string
    place_id?: string
    data_cid?: string
    gps_coordinates?: {
        latitude?: number
        longitude?: number
    }
    links?: GoogleLocalLinkGroup
    service_options?: GoogleLocalServiceOptions
}

interface GoogleMapsTopicRaw {
    topic_id?: string
    title?: string
    reviews?: number | string
    link?: string
    serpapi_link?: string
}

interface GoogleMapsReviewsResponse {
    place_info?: GoogleMapsPlaceInfoRaw
    place_information?: GoogleMapsPlaceInfoRaw
    topics?: GoogleMapsTopicRaw[]
    reviews?: GoogleMapsReviewRaw[]
    reviews_results?: GoogleMapsReviewRaw[]
    search_information?: {
        total_results?: number | string
    }
    next_page_token?: string
}

/**
 * Local search output shape.
 */
const googleLocalOutputSchema = z.object({
    localResults: z
        .array(
            z.object({
                position: z.number().optional(),
                title: z.string(),
                rating: z.number().optional(),
                reviews: z.number().optional(),
                reviewsOriginal: z.string().optional(),
                price: z.string().optional(),
                description: z.string().optional(),
                lsig: z.string().optional(),
                thumbnail: z.url().optional(),
                googleCid: z.string().optional(),
                placeId: z.string().optional(),
                dataId: z.string().optional(),
                dataCid: z.string().optional(),
                reviewsLink: z.url().optional(),
                photosLink: z.url().optional(),
                placeIdSearch: z.url().optional(),
                gpsCoordinates: localCoordinatesSchema.optional(),
                type: z.array(z.string()).optional(),
                address: z.string().optional(),
                phone: z.string().optional(),
                hours: z.string().optional(),
                openState: z.string().optional(),
                website: z.url().optional(),
                links: z
                    .object({
                        website: z.url().optional(),
                        directions: z.url().optional(),
                    })
                    .optional(),
                serviceOptions: z
                    .object({
                        dineIn: z.boolean().optional(),
                        takeout: z.boolean().optional(),
                        delivery: z.boolean().optional(),
                        curbsidePickup: z.boolean().optional(),
                    })
                    .optional(),
            })
        )
        .describe('Normalized Google Local results'),
    totalResults: z
        .number()
        .optional()
        .describe('Total number of local results when provided'),
    pagination: z
        .object({
            next: z.string().optional(),
            previous: z.string().optional(),
        })
        .optional()
        .describe('Pagination metadata from SerpApi when available'),
})

/**
 * Google Maps Reviews output shape.
 */
const googleMapsReviewsOutputSchema = z.object({
    placeInfo: z
        .object({
            title: z.string().optional(),
            rating: z.number().optional(),
            reviews: z.number().optional(),
            price: z.string().optional(),
            type: z.array(z.string()).optional(),
            address: z.string().optional(),
            phone: z.string().optional(),
            website: z.url().optional(),
            hours: z.string().optional(),
            openState: z.string().optional(),
            description: z.string().optional(),
            thumbnail: z.url().optional(),
            googleCid: z.string().optional(),
            placeId: z.string().optional(),
            dataId: z.string().optional(),
            dataCid: z.string().optional(),
            gpsCoordinates: localCoordinatesSchema.optional(),
            links: z
                .object({
                    website: z.url().optional(),
                    directions: z.url().optional(),
                })
                .optional(),
            serviceOptions: z
                .object({
                    dineIn: z.boolean().optional(),
                    takeout: z.boolean().optional(),
                    delivery: z.boolean().optional(),
                    curbsidePickup: z.boolean().optional(),
                })
                .optional(),
        })
        .optional()
        .describe('Structured information about the reviewed place'),
    topics: z
        .array(
            z.object({
                topicId: z.string().optional(),
                title: z.string().optional(),
                reviews: z.number().optional(),
                link: z.url().optional(),
                serpapiLink: z.url().optional(),
            })
        )
        .optional()
        .describe('Review topics returned by SerpApi when available'),
    reviews: z
        .array(
            z.object({
                position: z.number().optional(),
                authorName: z.string().optional(),
                authorUrl: z.url().optional(),
                authorPhotoUrl: z.url().optional(),
                localGuide: z.boolean().optional(),
                authorReviewCount: z.number().optional(),
                authorPhotoCount: z.number().optional(),
                rating: z.number().optional(),
                date: z.string().optional(),
                snippet: z.string().optional(),
                likes: z.number().optional(),
                images: z.array(z.url()).optional(),
                reviewId: z.string().optional(),
            })
        )
        .describe('Normalized review entries'),
    totalResults: z
        .number()
        .optional()
        .describe('Total review count when provided'),
    nextPageToken: z
        .string()
        .optional()
        .describe('Pagination token for retrieving additional reviews'),
})

/**
 * Input schema for Google Local search.
 */
const googleLocalInputSchema = z.object({
    query: z.string().min(1).describe('The local search query'),
    language: z
        .string()
        .default('en')
        .describe('Two-letter language code for the response'),
    country: z
        .string()
        .default('us')
        .describe('Two-letter country code for the response'),
    ludocid: z
        .string()
        .optional()
        .describe('Google CID used to anchor the local search'),
    start: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe('Pagination offset for local results'),
})

/**
 * Input schema for Google Maps reviews.
 */
const googleMapsReviewsInputSchema = z
    .object({
        dataId: z
            .string()
            .optional()
            .describe('Google Maps data ID for the place'),
        placeId: z
            .string()
            .optional()
            .describe('Google Maps place ID for the place'),
        language: z
            .string()
            .default('en')
            .describe('Two-letter language code for the response'),
        sortBy: z
            .enum(['qualityScore', 'newestFirst', 'ratingHigh', 'ratingLow'])
            .default('qualityScore')
            .describe('Sort order for reviews'),
        topicId: z
            .string()
            .optional()
            .describe('Optional review topic filter'),
        query: z
            .string()
            .optional()
            .describe('Optional text filter for reviews'),
        numResults: z
            .number()
            .int()
            .min(1)
            .max(20)
            .default(10)
            .describe('Maximum number of reviews to return'),
        nextPageToken: z
            .string()
            .optional()
            .describe('Pagination token for subsequent review pages'),
    })
    .refine((input) => Boolean(input.dataId || input.placeId), {
        message: 'Either dataId or placeId must be provided.',
        path: ['dataId'],
    })
    .refine((input) => !(input.topicId && input.query), {
        message: 'topicId and query cannot be used together.',
        path: ['topicId'],
    })

/**
 * Google Local search tool.
 */
export const googleLocalTool = createTool({
    id: 'google-local',
    description:
        'Search Google Local for nearby businesses and locations. Returns normalized business details including ratings, review counts, map IDs, contact data, hours, and navigation links. Best for location discovery and place research.',
    inputSchema: googleLocalInputSchema,
    outputSchema: googleLocalOutputSchema,
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google Local received input', {
            toolCallId,
            inputData: {
                query: input.query,
                language: input.language,
                country: input.country,
                ludocid: input.ludocid,
                start: input.start,
            },
            messageCount: messages?.length ?? 0,
            aborted: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext as
            | SerpApiLocalContext
            | undefined
        const tracingContext: TracingContext | undefined = context?.tracingContext

        validateSerpApiKey()

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `📍 Searching Google Local for "${input.query}"`,
                stage: 'google-local',
            },
            id: 'google-local',
        })

        const localSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-local-tool',
            input,
            metadata: {
                'tool.id': 'google-local',
                query: input.query,
                language: input.language,
                country: input.country,
                operation: 'google-local',
            },
            requestContext,
            tracingContext,
        })

        try {
            const language = input.language ?? 'en'
            const country = input.country ?? 'us'
            const start = input.start ?? 0

            const params: Record<string, string | number> = {
                engine: 'google_local',
                q: input.query,
                hl: language,
                gl: country,
                start,
                google_domain: 'google.com',
            }

            if (typeof input.ludocid === 'string' && input.ludocid.length > 0) {
                params.ludocid = input.ludocid
            }

            const rawResponse = (await getJson(params)) as GoogleLocalResponse
            const totalResults = parseOptionalNumber(
                rawResponse.search_information?.total_results
            )
            const paginationSource =
                rawResponse.pagination ?? rawResponse.serpapi_pagination

            const localResults = (rawResponse.local_results ?? []).map((result) => ({
                position: result.position,
                title: result.title,
                rating: result.rating,
                reviews: parseOptionalNumber(result.reviews),
                reviewsOriginal: result.reviews_original,
                price: result.price,
                description: result.description,
                lsig: result.lsig,
                thumbnail: result.thumbnail,
                googleCid: result.place_id,
                placeId: result.place_id,
                dataId: result.data_id,
                dataCid: result.data_cid,
                reviewsLink: result.reviews_link,
                photosLink: result.photos_link,
                placeIdSearch: result.place_id_search,
                gpsCoordinates:
                    result.gps_coordinates?.latitude !== null &&
                    result.gps_coordinates?.latitude !== undefined &&
                    result.gps_coordinates?.longitude !== null &&
                    result.gps_coordinates?.longitude !== undefined
                        ? {
                              latitude: result.gps_coordinates.latitude,
                              longitude: result.gps_coordinates.longitude,
                          }
                        : undefined,
                type: normalizeResultType(result.type),
                address: result.address,
                phone: result.phone,
                hours: result.hours,
                openState: result.open_state,
                website: result.links?.website ?? result.website,
                links: result.links
                    ? {
                          website: result.links.website,
                          directions: result.links.directions,
                      }
                    : undefined,
                serviceOptions: result.service_options
                    ? {
                          dineIn: result.service_options.dine_in,
                          takeout: result.service_options.takeout,
                          delivery: result.service_options.delivery,
                          curbsidePickup: result.service_options.curbside_pickup,
                      }
                    : undefined,
            }))

            const result = {
                localResults,
                totalResults,
                pagination: paginationSource
                    ? {
                          next: paginationSource.next,
                          previous: paginationSource.previous,
                      }
                    : undefined,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Google Local search complete: ${localResults.length} places`,
                    stage: 'google-local',
                },
                id: 'google-local',
            })

            localSpan?.update({
                output: result,
                metadata: {
                    'tool.output.placeCount': localResults.length,
                },
            })
            localSpan?.end()

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            localSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            log.error('Google Local search failed', {
                query: input.query,
                error: errorMessage,
            })
            throw new Error(`Google Local search failed: ${errorMessage}`, {
                cause: error,
            })
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google Local completed', {
            toolCallId,
            toolName,
            placeCount: output.localResults.length,
            aborted: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

/**
 * Google Maps reviews tool.
 */
export const googleMapsReviewsTool = createTool({
    id: 'google-maps-reviews',
    description:
        'Fetch Google Maps reviews for a business or place using either the Maps data ID or place ID. Returns structured place details, review topics, and normalized review entries for downstream analysis.',
    inputSchema: googleMapsReviewsInputSchema,
    outputSchema: googleMapsReviewsOutputSchema,
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Google Maps Reviews received input', {
            toolCallId,
            inputData: {
                dataId: input.dataId,
                placeId: input.placeId,
                language: input.language,
                sortBy: input.sortBy,
                topicId: input.topicId,
                query: input.query,
                numResults: input.numResults,
                nextPageToken: input.nextPageToken,
            },
            messageCount: messages?.length ?? 0,
            aborted: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },
    execute: async (input, context) => {
        const writer = context?.writer
        const requestContext = context?.requestContext as
            | SerpApiLocalContext
            | undefined
        const tracingContext: TracingContext | undefined = context?.tracingContext

        validateSerpApiKey()

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: '📝 Fetching Google Maps reviews...',
                stage: 'google-maps-reviews',
            },
            id: 'google-maps-reviews',
        })

        const mapsReviewsSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'google-maps-reviews-tool',
            input,
            metadata: {
                'tool.id': 'google-maps-reviews',
                dataId: input.dataId,
                placeId: input.placeId,
                sortBy: input.sortBy,
                operation: 'google-maps-reviews',
            },
            requestContext,
            tracingContext,
        })

        try {
            const language = input.language ?? 'en'
            const sortBy = input.sortBy ?? 'qualityScore'
            const numResults = input.numResults ?? 10

            const params: Record<string, string | number> = {
                engine: 'google_maps_reviews',
                hl: language,
                sort_by: sortBy,
                google_domain: 'google.com',
            }

            if (typeof input.dataId === 'string' && input.dataId.length > 0) {
                params.data_id = input.dataId
            } else if (
                typeof input.placeId === 'string' && input.placeId.length > 0
            ) {
                params.place_id = input.placeId
            }

            if (typeof input.topicId === 'string' && input.topicId.length > 0) {
                params.topic_id = input.topicId
            }

            if (typeof input.query === 'string' && input.query.length > 0) {
                params.query = input.query
            }

            const canUseNum = Boolean(
                input.nextPageToken || input.topicId || input.query
            )
            if (canUseNum) {
                params.num = numResults
            }

            if (
                typeof input.nextPageToken === 'string' &&
                input.nextPageToken.length > 0
            ) {
                params.next_page_token = input.nextPageToken
            }

            const rawResponse = (await getJson(params)) as GoogleMapsReviewsResponse
            const rawPlaceInfo = rawResponse.place_info ?? rawResponse.place_information

            const placeInfo = rawPlaceInfo
                ? {
                      title: rawPlaceInfo.title,
                      rating: rawPlaceInfo.rating,
                      reviews: parseOptionalNumber(rawPlaceInfo.reviews),
                      price: rawPlaceInfo.price,
                      type: normalizeResultType(rawPlaceInfo.type),
                      address: rawPlaceInfo.address,
                      phone: rawPlaceInfo.phone,
                      website: rawPlaceInfo.website,
                      hours: rawPlaceInfo.hours,
                      openState: rawPlaceInfo.open_state,
                      description: rawPlaceInfo.description,
                      thumbnail: rawPlaceInfo.thumbnail,
                      googleCid: rawPlaceInfo.place_id,
                      placeId: rawPlaceInfo.place_id,
                      dataId: rawPlaceInfo.data_id,
                      dataCid: rawPlaceInfo.data_cid,
                      gpsCoordinates:
                          rawPlaceInfo.gps_coordinates?.latitude !== null &&
                          rawPlaceInfo.gps_coordinates?.latitude !== undefined &&
                          rawPlaceInfo.gps_coordinates?.longitude !== null &&
                          rawPlaceInfo.gps_coordinates?.longitude !== undefined
                              ? {
                                    latitude: rawPlaceInfo.gps_coordinates.latitude,
                                    longitude: rawPlaceInfo.gps_coordinates.longitude,
                                }
                              : undefined,
                      links: rawPlaceInfo.links
                          ? {
                                website: rawPlaceInfo.links.website,
                                directions: rawPlaceInfo.links.directions,
                            }
                          : undefined,
                      serviceOptions: rawPlaceInfo.service_options
                          ? {
                                dineIn: rawPlaceInfo.service_options.dine_in,
                                takeout: rawPlaceInfo.service_options.takeout,
                                delivery: rawPlaceInfo.service_options.delivery,
                                curbsidePickup:
                                    rawPlaceInfo.service_options.curbside_pickup,
                            }
                          : undefined,
                  }
                : undefined

            const topics = (rawResponse.topics ?? []).map((topic) => ({
                topicId: topic.topic_id,
                title: topic.title,
                reviews: parseOptionalNumber(topic.reviews),
                link: topic.link,
                serpapiLink: topic.serpapi_link,
            }))

            const reviewsSource = rawResponse.reviews ?? rawResponse.reviews_results ?? []
            const reviews = reviewsSource.map((review) => {
                const author = review.author
                const authorName = review.author_name ?? author?.name
                const authorUrl = review.author_url ?? author?.url
                const authorPhotoUrl = review.author_photo_url ?? author?.photo_url
                const localGuide = review.local_guide ?? author?.local_guide
                const authorReviewCount = parseOptionalNumber(
                    review.reviews ?? author?.reviews
                )
                const authorPhotoCount = parseOptionalNumber(
                    review.photos ?? author?.photos
                )

                return {
                    position: review.position,
                    authorName,
                    authorUrl,
                    authorPhotoUrl,
                    localGuide,
                    authorReviewCount,
                    authorPhotoCount,
                    rating: review.rating,
                    date: review.date,
                    snippet: review.snippet ?? review.text,
                    likes: parseOptionalNumber(review.likes),
                    images: review.images,
                    reviewId: review.review_id,
                }
            })

            const totalResults = parseOptionalNumber(
                rawResponse.search_information?.total_results
            )

            const result = {
                placeInfo,
                topics,
                reviews,
                totalResults,
                nextPageToken: rawResponse.next_page_token,
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `✅ Google Maps reviews ready: ${reviews.length} reviews`,
                    stage: 'google-maps-reviews',
                },
                id: 'google-maps-reviews',
            })

            mapsReviewsSpan?.update({
                output: result,
                metadata: {
                    'tool.output.reviewCount': reviews.length,
                    'tool.output.topicCount': topics.length,
                },
            })
            mapsReviewsSpan?.end()

            return result
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            mapsReviewsSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            log.error('Google Maps Reviews failed', {
                dataId: input.dataId,
                placeId: input.placeId,
                error: errorMessage,
            })
            throw new Error(`Google Maps Reviews failed: ${errorMessage}`, {
                cause: error,
            })
        }
    },
    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Google Maps Reviews completed', {
            toolCallId,
            toolName,
            reviewCount: output.reviews.length,
            topicCount: output.topics?.length ?? 0,
            aborted: abortSignal?.aborted,
            hook: 'onOutput',
        })
    },
})

export type GoogleLocalToolUI = InferUITool<typeof googleLocalTool>
export type GoogleMapsReviewsToolUI = InferUITool<typeof googleMapsReviewsTool>
export type GoogleLocalToolOutput = InferToolOutput<typeof googleLocalTool>
export type GoogleLocalToolInput = InferToolInput<typeof googleLocalTool>
export type GoogleMapsReviewsToolOutput = InferToolOutput<typeof googleMapsReviewsTool>
export type GoogleMapsReviewsToolInput = InferToolInput<typeof googleMapsReviewsTool>
