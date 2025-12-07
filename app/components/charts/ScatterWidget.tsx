'use client'

import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

export interface ScatterPoint { x: number; y: number; z?: number; name?: string }

interface ScatterWidgetProps {
  data: ScatterPoint[]
  height?: number
  color?: string
  zLabel?: string
  xLabel?: string
  yLabel?: string
}

export function ScatterWidget({
  data,
  height = 220,
  color = '#06b6d4',
  zLabel = 'size',
  xLabel = 'x',
  yLabel = 'y',
}: ScatterWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="x" name={xLabel} stroke="currentColor" />
        <YAxis dataKey="y" name={yLabel} stroke="currentColor" />
        <ZAxis dataKey="z" name={zLabel} range={[60, 200]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Legend />
        <Scatter data={data} fill={color} name="Points" />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export default ScatterWidget
