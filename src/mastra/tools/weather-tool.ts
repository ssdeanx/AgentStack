import type { RequestContext } from '@mastra/core/request-context'
import type { InferUITool } from '@mastra/core/tools'
import { createTool } from '@mastra/core/tools'
import { SpanType, getOrCreateSpan } from '@mastra/core/observability'
import { z } from 'zod'
import { log } from '../config/logger'
import type { TracingContext } from '@mastra/core/observability'

export interface WeatherToolContext extends RequestContext {
    temperatureUnit?: 'celsius' | 'fahrenheit'
    userId?: string
    workspaceId?: string
    maxRows?: number
}

export type WeatherToolContextType = WeatherToolContext

interface GeocodingResponse {
    results?: Array<{
        latitude: number
        longitude: number
        name: string
    }>
}

interface WeatherResponse {
    current: {
        time: string
        temperature_2m: number
        apparent_temperature: number
        relative_humidity_2m: number
        wind_speed_10m: number
        wind_gusts_10m: number
        weather_code: number
    }
}

export const weatherTool = createTool({
    id: 'get-weather',
    description: 'Get current weather for a location',
    inputSchema: z.object({
        location: z.string().describe('City name'),
    }),
    outputSchema: z.object({
        temperature: z.number(),
        feelsLike: z.number(),
        humidity: z.number(),
        windSpeed: z.number(),
        windGust: z.number(),
        conditions: z.string(),
        location: z.string(),
        unit: z.string(), // Add unit to output schema
    }),

    onInputStart: ({ toolCallId, messages, abortSignal }) => {
        log.info('Weather tool input streaming started', {
            toolCallId: toolCallId.includes('get-weather'),
            messageCount: messages.length,
            hook: 'onInputStart',
            abortSignal: abortSignal?.aborted,
        })
    },
    onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
        log.info('Weather tool received input chunk', {
            toolCallId: toolCallId.includes('get-weather'),
            inputTextDelta,
            abortSignal: abortSignal?.aborted,
            messageCount: messages.length,
            hook: 'onInputDelta',
        })
    },
    onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
        log.info('Weather tool received input', {
            toolCallId: toolCallId.includes('get-weather'), 
            messageCount: messages.length,
            inputData: { location: input.location },
            abortSignal: abortSignal?.aborted,
            hook: 'onInputAvailable',
        })
    },

    execute: async (inputData, context) => {
        const writer = context?.writer
        const abortSignal = context?.abortSignal
        const tracingContext: TracingContext | undefined =
            context?.tracingContext

        // Check if operation was already cancelled
        if (abortSignal?.aborted ?? false) {
            throw new Error('Weather lookup cancelled')
        }

        await writer?.custom({
            type: 'data-tool-progress',
            data: {
                status: 'in-progress',
                message: `Input: location="${inputData.location}" - 🚀 Starting weather lookup`,
                stage: 'get-weather',
            },
            id: 'get-weather',
        })

        const requestCtx = context?.requestContext as
            | WeatherToolContext
            | undefined
        const temperatureUnit = requestCtx?.temperatureUnit ?? 'celsius'
        const userId = requestCtx?.userId
        const workspaceId = requestCtx?.workspaceId

        log.info(
            `Fetching weather for location: ${inputData.location} in ${temperatureUnit}`,
            { userId, workspaceId }
        )

        // Create root span using getOrCreateSpan (creates root OR attaches to parent)
        const rootSpan = getOrCreateSpan({
            type: SpanType.TOOL_CALL,
            name: 'get-weather',
            input: { location: inputData.location, temperatureUnit },
            metadata: {
                'tool.id': 'get-weather',
                'tool.input.location': inputData.location,
                'tool.input.temperatureUnit': temperatureUnit,
                'user.id': userId,
                'workspace.id': workspaceId,
            },
            requestContext: context?.requestContext,
            tracingContext,
        })

        // Create child span for weather lookup operation
        const weatherSpan = rootSpan?.createChildSpan({
            type: SpanType.TOOL_CALL,
            name: 'weather-lookup-operation',
            input: { location: inputData.location },
            metadata: {
                'tool.id': 'weather-lookup',
                'operation.type': 'geocode-and-fetch',
            },
        })

        try {
            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Input: location="${inputData.location}" - 📍 Geocoding location`,
                    stage: 'get-weather',
                },
                id: 'get-weather',
            })

            // Check for cancellation before geocoding
            if (abortSignal?.aborted ?? false) {
                weatherSpan?.error({
                    error: new Error('Operation cancelled during geocoding'),
                    endSpan: true,
                })
                throw new Error('Weather lookup cancelled during geocoding')
            }

            const result = await getWeather(
                inputData.location,
                temperatureUnit,
                abortSignal
            )

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'in-progress',
                    message: `Input: location="${inputData.location}" - 🌤️ Processing weather data`,
                    stage: 'get-weather',
                },
                id: 'get-weather',
            })

            // Update spans with successful result
            weatherSpan?.update({
                output: result,
                metadata: {
                    'operation.completed': true,
                },
            })
            weatherSpan?.end()

            rootSpan?.update({
                output: result,
                metadata: {
                    'tool.output.location': result.location,
                    'tool.output.temperature': result.temperature,
                    'tool.output.conditions': result.conditions,
                    'tool.output.success': true,
                },
            })
            rootSpan?.end()

            log.info(`Weather fetched successfully for ${inputData.location}`)
            const finalResult = {
                ...result,
                unit: temperatureUnit === 'celsius' ? '°C' : '°F',
            }

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: location="${inputData.location}" - ✅ Weather ready: ${finalResult.temperature}${finalResult.unit} in ${finalResult.location}`,
                    stage: 'get-weather',
                },
                id: 'get-weather',
            })

            return finalResult
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)

            // Handle AbortError specifically
            if (error instanceof Error && error.name === 'AbortError') {
                const cancelMessage = `Weather lookup cancelled for ${inputData.location}`
                weatherSpan?.error({
                    error: new Error(cancelMessage),
                    endSpan: true,
                })
                rootSpan?.error({
                    error: new Error(cancelMessage),
                    endSpan: true,
                })

                await writer?.custom({
                    type: 'data-tool-progress',
                    data: {
                        status: 'done',
                        message: `Input: location="${inputData.location}" - 🛑 ${cancelMessage}`,
                        stage: 'get-weather',
                    },
                    id: 'get-weather',
                })

                log.warn(cancelMessage)
                throw new Error(cancelMessage)
            }

            // Record error in both spans
            weatherSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })
            rootSpan?.error({
                error: error instanceof Error ? error : new Error(errorMessage),
                endSpan: true,
            })

            await writer?.custom({
                type: 'data-tool-progress',
                data: {
                    status: 'done',
                    message: `Input: location="${inputData.location}" - ❌ Weather error: ${errorMessage}`,
                    stage: 'get-weather',
                },
                id: 'get-weather',
            })

            log.error(
                `Failed to fetch weather for ${inputData.location}: ${errorMessage}`
            )
            throw error
        }
    },

    onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
        log.info('Weather tool completed', {
            toolCallId: toolCallId.includes('get-weather'),
            toolName,
            outputData: {
                location: output.location,
                temperature: output.temperature,
                unit: output.unit,
                conditions: output.conditions,
            },
            hook: 'onOutput',
            abortSignal: abortSignal?.aborted,
        })
    },
})

const getWeather = async (
    location: string,
    unit: 'celsius' | 'fahrenheit',
    abortSignal?: AbortSignal
) => {
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    const geocodingResponse = await fetch(geocodingUrl, { signal: abortSignal })
    const geocodingData = (await geocodingResponse.json()) as GeocodingResponse

    if (!geocodingData.results?.[0]) {
        throw new Error(`Location '${location}' not found`)
    }

    const { latitude, longitude, name } = geocodingData.results[0]

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code&temperature_unit=${unit}`

    const response = await fetch(weatherUrl, { signal: abortSignal })
    const data = (await response.json()) as WeatherResponse

    return {
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        windGust: data.current.wind_gusts_10m,
        conditions: getWeatherCondition(data.current.weather_code),
        location: name,
    }
}

function getWeatherCondition(code: number): string {
    const conditions: Record<number, string> = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow fall',
        73: 'Moderate snow fall',
        75: 'Heavy snow fall',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail',
    }
    return conditions[code] ?? 'Unknown'
}

export type WeatherUITool = InferUITool<typeof weatherTool>
