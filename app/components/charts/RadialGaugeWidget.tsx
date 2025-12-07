'use client'

import { RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts'

export interface RadialGaugeDatum {
  name: string
  value: number
  fill?: string
}

interface RadialGaugeWidgetProps {
  data: RadialGaugeDatum[]
  height?: number
  innerRadius?: number | string
  outerRadius?: number | string
}

export function RadialGaugeWidget({
  data,
  height = 220,
  innerRadius = '40%',
  outerRadius = '100%',
}: RadialGaugeWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadialBarChart innerRadius={innerRadius} outerRadius={outerRadius} data={data} startAngle={90} endAngle={-270}>
        <Tooltip />
        <RadialBar dataKey="value" cornerRadius={8} label={{ position: 'insideStart', fill: '#fff' }} />
      </RadialBarChart>
    </ResponsiveContainer>
  )
}

export default RadialGaugeWidget
