'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import {
    CloudSun,
    Wind,
    Droplets,
    AlertCircle,
    Loader2,
    Calendar,
} from 'lucide-react'
import type { InferUITool } from '@mastra/core/tools'
import { z } from 'zod'

// ... (Existing WeatherCard)

export function ForecastView({ input, output, errorText }: WeatherCardProps) {
    if (errorText || output?.error) {
        // Reuse error state
        return null
    }

    if (!output?.data?.forecast) {
        return null // Don't render if no forecast data
    }

    const { forecast, location } = output.data
    const days = forecast.forecastday || []

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    {days.length}-Day Forecast for {location.name}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {days.map((day: any) => (
                        <div
                            key={day.date}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {day.day.condition.icon && (
                                    <img
                                        src={
                                            day.day.condition.icon.startsWith(
                                                '//'
                                            )
                                                ? `https:${day.day.condition.icon}`
                                                : day.day.condition.icon
                                        }
                                        alt={day.day.condition.text}
                                        className="size-8"
                                    />
                                )}
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                        {new Date(day.date).toLocaleDateString(
                                            undefined,
                                            {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                            }
                                        )}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {day.day.condition.text}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="font-semibold">
                                    {Math.round(day.day.avgtemp_c)}°
                                </span>
                                <span className="text-xs text-muted-foreground w-12 text-right">
                                    {Math.round(day.day.mintemp_c)}° /{' '}
                                    {Math.round(day.day.maxtemp_c)}°
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

// Mock schema based on typical weather tool output since we don't have the exact import yet
const weatherOutputSchema = z.object({
    data: z
        .object({
            current: z.object({
                temp_c: z.number(),
                condition: z.object({
                    text: z.string(),
                    icon: z.string(),
                }),
                humidity: z.number(),
                wind_kph: z.number(),
            }),
            location: z.object({
                name: z.string(),
                country: z.string(),
                localtime: z.string(),
            }),
            forecast: z
                .object({
                    forecastday: z.array(
                        z.object({
                            date: z.string(),
                            day: z.object({
                                avgtemp_c: z.number(),
                                mintemp_c: z.number(),
                                maxtemp_c: z.number(),
                                condition: z.object({
                                    text: z.string(),
                                    icon: z.string(),
                                }),
                            }),
                        })
                    ),
                })
                .optional(),
        })
        .optional(),
    error: z.string().optional(),
})

interface WeatherCardProps {
    toolCallId: string
    input: { location: string }
    output?: z.infer<typeof weatherOutputSchema>
    errorText?: string
}

export function WeatherCard({ input, output, errorText }: WeatherCardProps) {
    if (errorText || output?.error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="size-4" />
                        Weather Check Failed
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-destructive">
                        {errorText || output?.error}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!output?.data) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        Checking weather in {input.location}...
                    </CardTitle>
                </CardHeader>
            </Card>
        )
    }

    const { current, location } = output.data

    return (
        <Card className="w-full max-w-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CloudSun className="size-4 text-muted-foreground" />
                        <span>
                            {location.name}, {location.country}
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {location.localtime.split(' ')[1]}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        {current.condition.icon && (
                            <img
                                src={
                                    current.condition.icon.startsWith('//')
                                        ? `https:${current.condition.icon}`
                                        : current.condition.icon
                                }
                                alt={current.condition.text}
                                className="size-12"
                            />
                        )}
                        <div>
                            <div className="text-2xl font-bold">
                                {current.temp_c}°C
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {current.condition.text}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Droplets className="size-4" />
                        <span>Humidity: {current.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wind className="size-4" />
                        <span>Wind: {current.wind_kph} km/h</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
