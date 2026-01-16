'use client'

import type {
  BrowserUITool,
  ClickAndExtractUITool,
  FillFormUITool,
  GoogleSearchUITool,
  MonitorPageUITool,
  PdfGeneratorUITool,
  ScreenshotUITool,
} from './types'

import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import {
  AlertCircle,
  CheckCircle,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  Search,
} from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CodeBlock, CodeBlockCopyButton } from '../code-block'

/* Helpers */
function formatBytes(bytes?: number) {
  if (bytes == null) return 'N/A'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let num = bytes
  while (num >= 1024 && i < units.length - 1) {
    num /= 1024
    i++
  }
  return `${num >= 10 ? Math.round(num) : num.toFixed(2)} ${units[i]}`
}

function downloadFileFromBase64(filename: string, base64: string, mime = 'application/octet-stream') {
  try {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertCircle className="size-4 text-destructive" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-destructive">{message}</div>
      </CardContent>
    </Card>
  )
}

function LoadingCard({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      {subtitle && (
        <CardContent>
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        </CardContent>
      )}
    </Card>
  )
}

/* Screenshot tool UI */
interface ScreenshotCardProps {
  toolCallId: string
  input: ScreenshotUITool['input']
  output?: ScreenshotUITool['output']
  errorText?: string
}

export function ScreenshotCard({ input, output, errorText }: ScreenshotCardProps) {
  const [copied, setCopied] = useState(false)

  if (errorText) return <ErrorCard title="Screenshot Failed" message={errorText} />
  if (!output) {
    return <LoadingCard title={`Taking screenshot of ${(input as any).url}...`} icon={<Loader2 className="size-4 animate-spin" />} />
  }
  if ('error' in (output as any)) {
    return <ErrorCard title="Screenshot Failed" message={(output as any).error ?? 'Unknown error'} />
  }

  const base64 = ((output as any).screenshot as string) ?? ''
  const dataUrl = `data:image/png;base64,${base64}`

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(dataUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const download = () => downloadFileFromBase64('screenshot.png', base64, 'image/png')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ImageIcon className="size-4 text-primary" />
            Screenshot
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {(output as any).success ? 'Success' : 'Done'}
            </Badge>
            <Button size="sm" variant="ghost" onClick={copyUrl}>
              <Clipboard className="size-4 mr-2" />
              {copied ? 'Copied' : 'Copy Data URL'}
            </Button>
            <Button size="sm" variant="ghost" onClick={download}>
              <Download className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {base64 ? (
            <div className="flex flex-col gap-3">
              <img src={dataUrl} alt={`screenshot-${(input as any).url}`} className="rounded border max-h-[400px] object-contain w-full" />
              <div className="text-xs text-muted-foreground">Content length: {base64.length} chars</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No screenshot data</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* PDF generator UI */
interface PdfGeneratorCardProps {
  toolCallId: string
  input: PdfGeneratorUITool['input']
  output?: PdfGeneratorUITool['output']
  errorText?: string
}

export function PdfGeneratorCard({ input, output, errorText }: PdfGeneratorCardProps) {
  if (errorText) return <ErrorCard title="PDF Generation Failed" message={errorText} />
  if (!output) {
    return <LoadingCard title={`Generating PDF from ${(input as any).url}...`} icon={<Loader2 className="size-4 animate-spin" />} />
  }
  if ('error' in (output as any)) {
    return <ErrorCard title="PDF Generation Failed" message={(output as any).error ?? 'Unknown error'} />
  }

  const base64 = ((output as any).pdf as string) ?? ''
  const downloadPdf = () => downloadFileFromBase64('page.pdf', base64, 'application/pdf')

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4 text-primary" />
          PDF Generated
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {(output as any).success ? 'Success' : 'Ready'}
          </Badge>
          {base64 && (
            <Button size="sm" variant="ghost" onClick={downloadPdf}>
              <Download className="size-4" />
            </Button>
          )}
          {(output as any).message && (
            <Badge variant="outline" className="text-xs">
              {(output as any).message}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {base64 ? (
          <div className="space-y-3">
            <a href={`data:application/pdf;base64,${base64}`} target="_blank" rel="noreferrer noopener" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-2">
              <ExternalLink className="size-4" />
              View PDF
            </a>
            <div className="text-xs text-muted-foreground">Size: {formatBytes((base64.length * 3) / 4)}</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No PDF content</div>
        )}
      </CardContent>
    </Card>
  )
}

/* Browser summary (generic) */
interface BrowserToolCardProps {
  toolCallId: string
  input: BrowserUITool['input']
  output?: BrowserUITool['output']
  errorText?: string
}

export function BrowserToolCard({ input, output, errorText }: BrowserToolCardProps) {
  if (errorText) return <ErrorCard title="Browser Tool Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Browsing ${(input as any).url}...`} icon={<Loader2 className="size-4 animate-spin" />} />
  if (output && typeof output === 'object' && 'error' in output) {
    return <ErrorCard title="Browser Tool Failed" message={(output as any).error ?? 'Unknown error'} />
  }

  const contentLength = (output as any).contentLength ?? (output as any).message?.length

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="size-4 text-primary" />
          Browser Result
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{formatBytes(contentLength)}</Badge>
          {output && (output as any).message && <Badge variant="outline" className="text-xs">message</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-2">
          {((output as any).sections && Array.isArray((output as any).sections)) ? (
            <div>
              <div className="text-xs text-muted-foreground">Sections:</div>
              <ScrollArea className="h-36">
                <div className="space-y-2">
                  {((output as any).sections as any[]).map((s, i) => (
                    <div key={i} className="p-2 border rounded text-sm">
                      <div className="font-medium">{s.title ?? `Section ${i + 1}`}</div>
                      {s.summary && <div className="text-xs text-muted-foreground">{s.summary}</div>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{(output as any).message ?? 'No readable content'}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* Click & Extract */
interface ClickAndExtractCardProps {
  toolCallId: string
  input: ClickAndExtractUITool['input']
  output?: ClickAndExtractUITool['output']
  errorText?: string
}

export function ClickAndExtractCard({ input, output, errorText }: ClickAndExtractCardProps) {
  if (errorText) return <ErrorCard title="Click & Extract Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Clicking ${(input as any).clickSelector} on ${(input as any).url}...`} icon={<Loader2 className="size-4 animate-spin" />} />
  if (output && typeof output === 'object' && 'error' in output) return <ErrorCard title="Click & Extract Failed" message={(output as any).error ?? 'Unknown error'} />

  const content = (output as any).content ?? (output as any).message ?? ''

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4 text-primary" />
          Extracted Content
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{(output as any).contentLength ?? content.length} chars</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {content ? (
          <CodeBlock code={content} language="html">
            <CodeBlockCopyButton />
            <Button size="icon" variant="ghost" onClick={() => {
              const bytes = new TextEncoder().encode(content)
              const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
              const base64 = btoa(binaryString)
              downloadFileFromBase64('extracted.html', base64, 'text/html')
            }}>
              <Download className="size-4" />
            </Button>
          </CodeBlock>
        ) : (
          <div className="text-sm text-muted-foreground">No content</div>
        )}
      </CardContent>
    </Card>
  )
}

/* Fill Form */
interface FillFormCardProps {
  toolCallId: string
  input: FillFormUITool['input']
  output?: FillFormUITool['output']
  errorText?: string
}

export function FillFormCard({ input, output, errorText }: FillFormCardProps) {
  if (errorText) return <ErrorCard title="Fill Form Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Filling form on ${(input as any).url}...`} icon={<Loader2 className="size-4 animate-spin" />} />
  if ('error' in (output as any)) return <ErrorCard title="Fill Form Failed" message={(output as any).error ?? 'Unknown error'} />

  const finalUrl = (output as any).finalUrl ?? (output as any).message

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CheckCircle className="size-4 text-primary" />
          Fill Form
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{(output as any).success ? 'Success' : 'Result'}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {finalUrl ? (
          <div className="text-sm">
            <a href={String(finalUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
              <ExternalLink className="size-4" />
              {String(finalUrl)}
            </a>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{(output as any).message ?? 'No result available'}</div>
        )}
      </CardContent>
    </Card>
  )
}

/* Google Search */
interface GoogleSearchCardProps {
  toolCallId: string
  input: GoogleSearchUITool['input']
  output?: GoogleSearchUITool['output']
  errorText?: string
}

export function GoogleSearchCard({ input, output, errorText }: GoogleSearchCardProps) {
  const [query, setQuery] = useState('')
  if (errorText) return <ErrorCard title="Search Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Searching for ${(input as any).query}...`} icon={<Loader2 className="size-4 animate-spin" />} />
  if (output && typeof output === 'object' && 'error' in output) return <ErrorCard title="Search Failed" message={(output as any).error ?? 'Unknown error'} />

  // Some tools put results in different fields; try common ones
  const results = (output as any).organic_results || (output as any).results || (output as any).data || []

  const filtered = query ? results.filter((r: any) => JSON.stringify(r).toLowerCase().includes(query.toLowerCase())) : results

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Search className="size-4 text-primary" />
          Search Results
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{(results?.length ?? 0)} results</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <Input value={query} onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} placeholder="Filter results..." className="w-56 text-sm" />
          <Button size="sm" variant="ghost" onClick={() => setQuery('')}>Clear</Button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No results</div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {filtered.map((r: any, idx: number) => (
                <div key={idx} className="p-3 border rounded hover:bg-muted/30">
                  <div className="text-sm font-medium text-blue-600">{r.title ?? r.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.link ?? r.url ?? r.displayed_link}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.snippet ?? r.description ?? r.snippet}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

/* Monitor Page Card (basic) */
interface MonitorPageCardProps {
  toolCallId: string
  input: MonitorPageUITool['input']
  output?: MonitorPageUITool['output']
  errorText?: string
}

export function MonitorPageCard({ input, output, errorText }: MonitorPageCardProps) {
  if (errorText) return <ErrorCard title="Monitor Page Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Monitoring ${(input as any).url}...`} icon={<Loader2 className="size-4 animate-spin" />} />
  if ('error' in (output as any)) return <ErrorCard title="Monitor Page Failed" message={(output as any).error ?? 'Unknown error'} />

  const hasChanged = Boolean((output as any).changed)

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="size-4 text-primary" />
          Monitor Page
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`text-xs ${hasChanged ? 'text-destructive' : 'text-green-700'}`}>
            {hasChanged ? 'Changed' : 'No Change'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {hasChanged ? 'Page changed. Check the latest diffs or logs.' : 'Page is stable.'}
        </div>
      </CardContent>
    </Card>
  )
}
