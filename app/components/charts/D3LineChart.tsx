'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface LineDatum { label: string; value: number }

interface D3LineChartProps {
  data: LineDatum[]
  height?: number
  color?: string
  curve?: d3.CurveFactory | d3.CurveFactoryLineOnly
}

export function D3LineChart({ data, height = 240, color = '#6366f1', curve = d3.curveCatmullRom }: D3LineChartProps) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!ref.current || data.length === 0) {return}

    const width = ref.current.clientWidth ?? ref.current.parentElement?.clientWidth ?? 320
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const margin = { top: 12, right: 12, bottom: 28, left: 40 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const x = d3
      .scalePoint()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.5)

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) ?? 0])
      .nice()
      .range([innerHeight, 0])

    const line = d3
      .line<LineDatum>()
      .x((d) => x(d.label) ?? 0)
      .y((d) => y(d.value))
      .curve(curve)

    const root = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    root
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .style('font-size', '12px')

    root
      .append('g')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .attr('fill', 'currentColor')
      .style('font-size', '12px')

    root
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line)

    root
      .append('g')
      .selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', (d) => x(d.label) ?? 0)
      .attr('cy', (d) => y(d.value))
      .attr('r', 3.5)
      .attr('fill', color)
  }, [data, height, color, curve])

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-card p-3">
      <svg ref={ref} role="img" aria-label="Line chart" className="block h-full w-full" style={{ minHeight: height }} />
    </div>
  )
}

export default D3LineChart
