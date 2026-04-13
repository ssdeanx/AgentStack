'use client'

import type {
  PolygonCryptoAggregatesUITool,
  PolygonCryptoQuotesUITool,

  PolygonStockAggregatesUITool,
  PolygonStockFundamentalsUITool,
  PolygonStockQuotesUITool,
} from './types'

import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import {
  AlertCircle,
  ChartBar,
  Clock,
  CopyIcon,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Search,
} from 'lucide-react'
import { useEffect, ReactNode, useRef, useState, type ChangeEvent } from 'react'
import { CodeBlock, CodeBlockCopyButton } from '../code-block'

/* Utility helpers */
function formatNumber(n?: number | string) {
  if (n == null) {return 'N/A'}
  const num = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(num)) {return String(n)}
  return num >= 1000 ? num.toLocaleString() : num.toString()
}

function formatTime(ts?: number | string) {
  if (!ts) {return 'N/A'}
  // polygon often uses unix ms timestamps or ISO
  const t = typeof ts === 'string' && /^\d+$/.test(ts) ? Number(ts) : ts
  const date = typeof t === 'number' ? new Date(t) : new Date(String(t))
  return isNaN(date.getTime()) ? String(ts) : date.toLocaleString()
}

function downloadJSON(filename: string, data: any) {
  try {
    const content = JSON.stringify(data, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    // noop
  }
}

/* Small UI pieces */
function LoadingCard({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">{icon}{title}</CardTitle>
      </CardHeader>
      {subtitle && <CardContent><div className="text-sm text-muted-foreground">{subtitle}</div></CardContent>}
    </Card>
  )
}

function ErrorCard({ title, message }: { title: string; message?: string }) {
  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent><div className="text-sm text-destructive">{message}</div></CardContent>
    </Card>
  )
}

/* Polygon Stock Quotes */
export function PolygonStockQuotesCard({
  toolCallId,
  input,
  output,
  errorText,
}: {
  toolCallId: string
  input: PolygonStockQuotesUITool['input']
  output?: PolygonStockQuotesUITool['output']
  errorText?: string
}) {
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (bottomRef.current) {bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })}
  }, [output])

  if (errorText) {return <ErrorCard title="Quotes Failed" message={errorText} />}
  if (!output) {return <LoadingCard title={`Fetching quotes for ${(input as any).symbol}`} icon={<Loader2 className="size-4 animate-spin" />} />}
  if ('error' in output) {return <ErrorCard title="Quotes Error" message={(output as any).error ?? 'Unknown'} />}

  const data = (output as any).data ?? []
  const filtered = query ? data.filter((p: any) => JSON.stringify(p).toLowerCase().includes(query.toLowerCase())) : data

  const copyRaw = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch { }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm"><ChartBar className="size-4 text-primary" /> Quotes: {(input as any).symbol}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{(output as any).metadata?.count ?? data.length} points</Badge>
            <Button size="sm" variant="ghost" onClick={copyRaw}><CopyIcon className="size-4 mr-2" />{copied ? 'Copied' : 'Copy JSON'}</Button>
            <Button size="sm" variant="ghost" onClick={() => downloadJSON(`${(input as any).symbol}-quotes.json`, data)}><Download className="size-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Input value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} placeholder="Filter quotes..." className="w-64 text-sm" />
            <Button size="sm" variant="ghost" onClick={() => setQuery('')}>Clear</Button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No quotes match</div>
          ) : (
            <ScrollArea className="h-75 pr-4">
              <div className="space-y-2">
                {filtered.map((row: any, idx: number) => (
                  <div key={idx} className="p-2 border rounded flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {formatTime(row.t ?? row.timestamp ?? row.tradetime ?? row.time) || `#${idx + 1}`}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">Close: {formatNumber(row.c ?? row.close ?? row.price)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatNumber(row.v ?? row.volume ?? '')}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Raw Data</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={JSON.stringify(data, null, 2)} language="json">
            <CodeBlockCopyButton />
            <Button size="icon" variant="ghost" onClick={() => downloadJSON(`${(input as any).symbol}-quotes-raw.json`, data)}><Download className="size-4" /></Button>
          </CodeBlock>
        </CardContent>
      </Card>
    </div>
  )
}

/* Polygon Stock Aggregates */
export function PolygonStockAggregatesCard({
  toolCallId,
  input,
  output,
  errorText,
}: {
  toolCallId: string
  input: PolygonStockAggregatesUITool['input']
  output?: PolygonStockAggregatesUITool['output']
  errorText?: string
}) {
  if (errorText) {return <ErrorCard title="Aggregates Failed" message={errorText} />}
  if (!output) {return <LoadingCard title={`Fetching aggregates for ${(input as any).symbol}`} icon={<Loader2 className="size-4 animate-spin" />} />}
  if ('error' in output) {return <ErrorCard title="Aggregates Error" message={(output as any).error ?? 'Unknown'} />}

  const data = (output as any).data ?? []
  const meta = (output as any).metadata ?? {}

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm"><FileText className="size-4 text-primary" /> Aggregates: {(input as any).symbol}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{meta.count ?? data.length} bars</Badge>
            <Button size="sm" variant="ghost" onClick={() => downloadJSON(`${(input as any).symbol}-aggregates.json`, data)}><Download className="size-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? <div className="text-sm text-muted-foreground">No aggregates</div> : (
            <ScrollArea className="h-75 pr-4">
              <div className="space-y-2">
                {data.map((row: any, i: number) => (
                  <div key={i} className="p-2 border rounded flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{formatTime(row.t ?? row.timestamp)}</div>
                      <div className="text-xs text-muted-foreground">O {formatNumber(row.o)} H {formatNumber(row.h)} L {formatNumber(row.l)} C {formatNumber(row.c)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatNumber(row.v ?? row.vw ?? row.vwap ?? '')}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Raw Aggregates</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={JSON.stringify(data, null, 2)} language="json">
            <CodeBlockCopyButton />
            <Button size="icon" variant="ghost" onClick={() => downloadJSON(`${(input as any).symbol}-aggregates-raw.json`, data)}><Download className="size-4" /></Button>
          </CodeBlock>
        </CardContent>
      </Card>
    </div>
  )
}

/* Polygon Stock Fundamentals */
export function PolygonStockFundamentalsCard({
  toolCallId,
  input,
  output,
  errorText,
}: {
  toolCallId: string
  input: PolygonStockFundamentalsUITool['input']
  output?: PolygonStockFundamentalsUITool['output']
  errorText?: string
}) {
  if (errorText) {return <ErrorCard title="Fundamentals Failed" message={errorText} />}
  if (!output) {return <LoadingCard title={`Fetching fundamentals for ${(input as any).symbol}`} icon={<Loader2 className="size-4 animate-spin" />} />}
  if ('error' in output) {return <ErrorCard title="Fundamentals Error" message={(output as any).error ?? 'Unknown'} />}

  const data = (output as any).data ?? {}
  const entries = typeof data === 'object' ? Object.entries(data) : []

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm"><FileText className="size-4 text-primary" /> Fundamentals: {(input as any).symbol}</CardTitle>
        <div>
          <Button size="sm" variant="ghost" onClick={() => downloadJSON(`${(input as any).symbol}-fundamentals.json`, data)}><Download className="size-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-sm text-muted-foreground">No fundamental data available</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {entries.map(([k, v]) => (
              <div key={k} className="p-2 border rounded">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="font-medium">{String(v)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* Polygon Crypto Quotes */
export function PolygonCryptoQuotesCard({
  toolCallId,
  input,
  output,
  errorText,
}: {
  toolCallId: string
  input: PolygonCryptoQuotesUITool['input']
  output?: PolygonCryptoQuotesUITool['output']
  errorText?: string
}) {
  const [filter, setFilter] = useState('')

  if (errorText) {return <ErrorCard title="Crypto Quotes Failed" message={errorText} />}
  if (!output) {return <LoadingCard title={`Fetching crypto quotes for ${(input as any).symbol}`} icon={<Loader2 className="size-4 animate-spin" />} />}
  if ('error' in output) {return <ErrorCard title="Crypto Quotes Error" message={(output as any).error ?? 'Unknown'} />}

  const data = (output as any).data ?? []
  const filtered = filter ? data.filter((d: any) => JSON.stringify(d).toLowerCase().includes(filter.toLowerCase())) : data

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm"><ChartBar className="size-4 text-primary" /> Crypto Quotes: {(input as any).symbol}</CardTitle>
          <div className="flex items-center gap-2">
            <Input value={filter} onChange={(e: ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)} placeholder="Filter..." className="w-56 text-sm" />
            <Button size="sm" variant="ghost" onClick={() => setFilter('')}>Clear</Button>
            <Button size="sm" variant="ghost" onClick={() => downloadJSON(`${(input as any).symbol}-crypto-quotes.json`, data)}><Download className="size-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? <div className="text-sm text-muted-foreground">No quotes</div> : (
            <ScrollArea className="h-75 pr-4">
              <div className="space-y-2">
                {filtered.map((r: any, i: number) => (
                  <div key={i} className="p-2 rounded border flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{formatTime(r.t ?? r.timestamp)}</div>
                      <div className="text-xs text-muted-foreground">Price: {formatNumber(r.c ?? r.price)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatNumber(r.v ?? r.volume)}</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* Polygon Crypto Aggregates */
export function PolygonCryptoAggregatesCard({
  toolCallId,
  input,
  output,
  errorText,
}: {
  toolCallId: string
  input: PolygonCryptoAggregatesUITool['input']
  output?: PolygonCryptoAggregatesUITool['output']
  errorText?: string
}) {
  if (errorText) {return <ErrorCard title="Crypto Aggregates Failed" message={errorText} />}
  if (!output) {return <LoadingCard title={`Fetching aggregates for ${(input as any).symbol}`} icon={<Loader2 className="size-4 animate-spin" />} />}
  if ('error' in output) {return <ErrorCard title="Crypto Aggregates Error" message={(output as any).error ?? 'Unknown'} />}

  const data = (output as any).data ?? []
  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm"><ChartBar className="size-4 text-primary" /> Crypto Aggregates: {(input as any).symbol}</CardTitle>
        <div><Button size="sm" variant="ghost" onClick={() => downloadJSON(`${(input as any).symbol}-crypto-aggregates.json`, data)}><Download className="size-4" /></Button></div>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <div>{(output as any).metadata?.message ?? 'Aggregates retrieved'}</div>
        </div>
      </CardContent>
    </Card>
  )
}

/* Polygon Crypto Snapshots */
export function PolygonCryptoSnapshotsCard({
  toolCallId,
  input,
  output,
  errorText,
}: {
  toolCallId: string
  input: PolygonCryptoSnapshotsUITool['input']
  output?: PolygonCryptoSnapshotsUITool['output']
  errorText?: string
}) {
  if (errorText) {return <ErrorCard title="Crypto Snapshots Failed" message={errorText} />}
  if (!output) {return <LoadingCard title={`Fetching snapshots for ${(input as any).symbol}`} icon={<Loader2 className="size-4 animate-spin" />} />}
  if ('error' in output) {return <ErrorCard title="Crypto Snapshots Error" message={(output as any).error ?? 'Unknown'} />}

  const data = (output as any).data ?? []
  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm"><FileText className="size-4 text-primary" /> Crypto Snapshots: {(input as any).symbol}</CardTitle>
        <div><Button size="sm" variant="ghost" onClick={() => downloadJSON(`${(input as any).symbol}-snapshots.json`, data)}><Download className="size-4" /></Button></div>
      </CardHeader>
      <CardContent>
        {Array.isArray(data) ? (
          <ScrollArea className="h-80 pr-4">
            <div className="space-y-2">
              {data.map((s: any, i: number) => (
                <div key={i} className="p-2 rounded border flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{formatTime(s.t ?? s.timestamp)}</div>
                    <div className="text-xs text-muted-foreground">Price: {formatNumber(s.c ?? s.price)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{formatNumber(s.v ?? s.volume)}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-sm text-muted-foreground">No snapshots available</div>
        )}
      </CardContent>
    </Card>
  )
}
