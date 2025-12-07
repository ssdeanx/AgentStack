'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface LinePoint { label: string; a: number; b?: number }

interface LineWidgetProps {
  data: LinePoint[]
  seriesA?: { key?: 'a'; label?: string; color?: string }
  seriesB?: { key?: 'b'; label?: string; color?: string }
  height?: number
  title?: string
}

export function LineWidget({
  data,
  seriesA = { key: 'a', label: 'Series A', color: '#6366f1' },
  seriesB = { key: 'b', label: 'Series B', color: '#22c55e' },
  height = 220,
}: LineWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" stroke="currentColor" />
        <YAxis stroke="currentColor" />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey={seriesA.key}
          name={seriesA.label}
          stroke={seriesA.color}
          strokeWidth={2}
          dot={false}
        />
        {data.some((d) => typeof d.b === 'number') ? (
          <Line
            type="monotone"
            dataKey={seriesB.key}
            name={seriesB.label}
            stroke={seriesB.color}
            strokeWidth={2}
            dot={false}
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  )
}

export default LineWidget
