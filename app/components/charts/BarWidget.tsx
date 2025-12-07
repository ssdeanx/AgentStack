'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface BarPoint { label: string; value: number }

interface BarWidgetProps {
  data: BarPoint[]
  height?: number
  color?: string
  label?: string
  radius?: number | [number, number, number, number]
}

export function BarWidget({
  data,
  height = 220,
  color = '#f59e0b',
  label = 'Value',
  radius = 6,
}: BarWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" stroke="currentColor" />
        <YAxis stroke="currentColor" />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" name={label} fill={color} radius={radius} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default BarWidget
