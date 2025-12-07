'use client'

import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export type PieSlice = { name: string; value: number; fill?: string }

interface PieWidgetProps {
  data: PieSlice[]
  height?: number
  innerRadius?: number
  outerRadius?: number
}

export function PieWidget({ data, height = 220, innerRadius = 50, outerRadius = 90 }: PieWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={4} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default PieWidget
