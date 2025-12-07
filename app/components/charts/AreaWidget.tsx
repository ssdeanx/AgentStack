'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface AreaPoint { label: string; a: number; b?: number }

interface AreaWidgetProps {
  data: AreaPoint[]
  seriesA?: { key: 'a'; label?: string; color?: string }
  seriesB?: { key: 'b'; label?: string; color?: string }
  height?: number
}

export function AreaWidget({
  data,
  seriesA = { key: 'a', label: 'Primary', color: '#6366f1' },
  seriesB = { key: 'b', label: 'Secondary', color: '#22c55e' },
  height = 220,
}: AreaWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaColorA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={seriesA.color} stopOpacity={0.32} />
            <stop offset="95%" stopColor={seriesA.color} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="areaColorB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={seriesB.color} stopOpacity={0.32} />
            <stop offset="95%" stopColor={seriesB.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" stroke="currentColor" />
        <YAxis stroke="currentColor" />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey={seriesA.key}
          name={seriesA.label}
          stroke={seriesA.color}
          fill="url(#areaColorA)"
          strokeWidth={2}
        />
        {data.some((d) => typeof d.b === 'number') ? (
          <Area
            type="monotone"
            dataKey={seriesB.key}
            name={seriesB.label}
            stroke={seriesB.color}
            fill="url(#areaColorB)"
            strokeWidth={2}
          />
        ) : null}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default AreaWidget
