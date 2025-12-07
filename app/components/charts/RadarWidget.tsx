'use client'

import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'

export type RadarPoint = { subject: string; a: number; b?: number }

interface RadarWidgetProps {
  data: RadarPoint[]
  height?: number
  seriesA?: { key?: 'a'; label?: string; color?: string }
  seriesB?: { key?: 'b'; label?: string; color?: string }
}

export function RadarWidget({
  data,
  height = 260,
  seriesA = { key: 'a', label: 'Primary', color: '#6366f1' },
  seriesB = { key: 'b', label: 'Secondary', color: '#22c55e' },
}: RadarWidgetProps) {
  const hasB = data.some((d) => typeof d.b === 'number')
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="subject" stroke="currentColor" />
        <PolarRadiusAxis stroke="currentColor" />
        <Tooltip />
        <Legend />
        <Radar name={seriesA.label} dataKey={seriesA.key} stroke={seriesA.color} fill={seriesA.color} fillOpacity={0.3} />
        {hasB ? (
          <Radar name={seriesB.label} dataKey={seriesB.key} stroke={seriesB.color} fill={seriesB.color} fillOpacity={0.25} />
        ) : null}
      </RadarChart>
    </ResponsiveContainer>
  )
}

export default RadarWidget
