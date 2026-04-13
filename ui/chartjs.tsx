"use client"

import * as React from 'react'
import {
    ArcElement,
    BarController,
    BarElement,
    BubbleController,
    CategoryScale,
    Chart as ChartJS,
    DoughnutController,
    Filler,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    PolarAreaController,
    PieController,
    RadialLinearScale,
    ScatterController,
    Title,
    Tooltip,
    type ChartType,
    type ChartOptions,
    type DefaultDataPoint,
} from 'chart.js'
import { Chart as ReactChart, type ChartProps } from 'react-chartjs-2'

import { cn } from '@/lib/utils'

let chartJsRegistered = false

/**
 * Registers the common Chart.js controllers, elements, scales, and plugins.
 * Call once before rendering charts if you need explicit setup outside React.
 */
export function registerChartJsDefaults() {
    if (chartJsRegistered) {
        return
    }

    ChartJS.register(
        ArcElement,
        BarController,
        BarElement,
        BubbleController,
        CategoryScale,
        DoughnutController,
        Filler,
        Legend,
        LineController,
        LineElement,
        LinearScale,
        PointElement,
        PolarAreaController,
        PieController,
        RadialLinearScale,
        ScatterController,
        Title,
        Tooltip
    )

    chartJsRegistered = true
}

registerChartJsDefaults()

export interface ChartJsPrimitiveProps<
    TType extends ChartType = ChartType,
    TData = DefaultDataPoint<TType>,
    TLabel = unknown,
> extends Omit<ChartProps<TType, TData, TLabel>, 'type'> {
    type: TType
    title?: React.ReactNode
    description?: React.ReactNode
    wrapperClassName?: string
    canvasClassName?: string
}

/**
 * A polished Chart.js wrapper with sensible defaults and a card-like shell.
 */
export function ChartJsPrimitive<
    TType extends ChartType = ChartType,
    TData = DefaultDataPoint<TType>,
    TLabel = unknown,
>({
    type,
    data,
    options,
    plugins,
    redraw,
    updateMode,
    fallbackContent,
    title,
    description,
    wrapperClassName,
    canvasClassName,
    className,
    height,
    width,
    ...props
}: ChartJsPrimitiveProps<TType, TData, TLabel>) {
    const mergedOptions = React.useMemo(() => {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 360, easing: 'easeOutQuart' },
            ...options,
        } satisfies ChartOptions<TType>
    }, [options])

    return (
        <div
            className={cn(
                'flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm',
                wrapperClassName
            )}
        >
            {(title || description) && (
                <div className="space-y-1">
                    {title ? <div className="text-sm font-medium text-foreground">{title}</div> : null}
                    {description ? (
                        <div className="text-sm text-muted-foreground">{description}</div>
                    ) : null}
                </div>
            )}

            <div className="relative min-h-0 w-full">
                <ReactChart
                    type={type}
                    data={data}
                    options={mergedOptions}
                    plugins={plugins}
                    redraw={redraw}
                    updateMode={updateMode}
                    fallbackContent={fallbackContent}
                    height={height}
                    width={width}
                    className={cn('max-h-full w-full', canvasClassName, className)}
                    {...props}
                />
            </div>
        </div>
    )
}
