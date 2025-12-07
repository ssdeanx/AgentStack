'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface PieDatum { label: string; value: number; color?: string }

interface D3PieChartProps {
  data: PieDatum[]
  height?: number
  innerRadius?: number
}

export function D3PieChart({ data, height = 240, innerRadius = 50 }: D3PieChartProps) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!ref.current || data.length === 0) {return}
    const width = ref.current.clientWidth ?? ref.current.parentElement?.clientWidth ?? 320
    const svg = d3.select(ref.current)
    svg.selectAll('*').remove()

    const radius = Math.min(width, height) / 2 - 8
    const root = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`)

    const pieGen = d3.pie<PieDatum>().sort(null).value((d) => d.value)
    const arc = d3.arc<d3.PieArcDatum<PieDatum>>().innerRadius(innerRadius).outerRadius(radius)

    const color = d3.scaleOrdinal<string>().domain(data.map((d) => d.label)).range(data.map((d) => d.color ?? '#6366f1'))

    root
      .selectAll('path')
      .data(pieGen(data))
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => color(d.data.label))
      .attr('stroke', 'var(--border)')
      .attr('stroke-width', 1)
  }, [data, height, innerRadius])

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-card p-3">
      <svg ref={ref} role="img" aria-label="Pie chart" className="block h-full w-full" style={{ minHeight: height }} />
    </div>
  )
}

export default D3PieChart
