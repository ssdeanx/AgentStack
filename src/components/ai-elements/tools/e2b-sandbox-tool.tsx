'use client'

/**
 * E2B Sandbox UI helpers
 *
 * This file exposes a small component (Card-style) per E2B UI tool.
 * Each component uses its corresponding tool type from `./types` so that
 * all imported types are actually referenced and the UI matches the
 * tool's input/output shapes.
 *
 * Pattern follows other tool components (web-scraper, research-tools, site-map).
 */

import type {
  CheckFileExistsUITool,
  CreateDirectoryUITool,
  CreateSandboxUITool,
  DeleteFileUITool,
  GetFileInfoUITool,
  GetFileSizeUITool,
  ListFilesUITool,
  RunCodeUITool,
  RunCommandUITool,
  WatchDirectoryUITool,
  WriteFileUITool,
  WriteFilesUITool,
} from './types'

import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Code as CodeIcon,
  CopyIcon,
  Download,
  FileText,
  Folder,
  List,
  Loader2,
  Play,
  Terminal,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CodeBlock, CodeBlockCopyButton } from '../code-block'

/* Generic helpers */
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

/* Small UI helpers */

// Nicely format bytes for human-oriented display
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
  // fewer decimals for larger numbers
  return `${num >= 10 ? Math.round(num) : num.toFixed(2)} ${units[i]}`
}

// Map a loose language name to a shiki BundledLanguage we support
function mapToBundledLanguage(lang?: string): any {
  if (!lang) return 'bash'
  const l = lang.toLowerCase()
  if (l.includes('ts')) return 'typescript'
  if (l.includes('js') || l.includes('javascript')) return 'javascript'
  if (l.includes('py') || l.includes('python')) return 'python'
  if (l.includes('json')) return 'json'
  if (l.includes('html')) return 'html'
  return 'bash'
}

// Download helper - create and trigger a file download in the browser
function downloadFile(filename: string, content: string, mime = 'text/plain') {
  try {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Failed to download file', err)
  }
}

/* Create Sandbox Card */
interface CreateSandboxCardProps {
  toolCallId: string
  input: CreateSandboxUITool['input']
  output?: CreateSandboxUITool['output']
  errorText?: string
}

export function CreateSandboxCard(props: CreateSandboxCardProps) {
  const { input, output, errorText } = props
  const [copied, setCopied] = useState(false)

  if (errorText) return <ErrorCard title="Create Sandbox Failed" message={errorText} />

  if (!output) {
    return <LoadingCard title="Creating sandbox..." subtitle={(input as any).metadata?.name ?? undefined} icon={<Play className="size-4 animate-pulse" />} />
  }

  const copyId = async () => {
    if (!(output as any)?.sandboxId) return
    try {
      await navigator.clipboard.writeText((output as any)!.sandboxId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Play className="size-4 text-green-600" />
          Sandbox Created
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={copyId}>
            <CopyIcon className="size-4 mr-2" />
            {copied ? 'Copied' : 'Copy ID'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <div>
            <span className="font-medium">Sandbox ID:</span> {(output as any).sandboxId}
          </div>
          {(input as any).timeoutMS !== undefined && <div>Timeout: {(input as any).timeoutMS}ms</div>}
        </div>
      </CardContent>
    </Card>
  )
}

/* Write File Card */
interface WriteFileCardProps {
  toolCallId: string
  input: WriteFileUITool['input']
  output?: WriteFileUITool['output']
  errorText?: string
}

export function WriteFileCard({ input, output, errorText }: WriteFileCardProps) {
  if (errorText) return <ErrorCard title="Write File Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Writing file to ${(input as any).path}...`} icon={<FileText className="size-4 animate-pulse" />} />

  if ('error' in (output as any)) {
    return <ErrorCard title="Write File Failed" message={String((output as any).error)} />
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4" />
          File Written
        </CardTitle>
        <Badge variant="secondary" className={`text-xs ${(output as any).success ? 'text-green-700' : 'text-destructive'}`}>
          {(output as any).success ? 'Success' : 'Failed'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <div>Path: {(output as any).path}</div>
          <div>Success: {String((output as any).success)}</div>
        </div>
      </CardContent>
    </Card>
  )
}

/* Write Files Card */
interface WriteFilesCardProps {
  toolCallId: string
  input: WriteFilesUITool['input']
  output?: WriteFilesUITool['output']
  errorText?: string
}

export function WriteFilesCard({ input, output, errorText }: WriteFilesCardProps) {
  if (errorText) return <ErrorCard title="Write Files Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Writing ${(input as any).files?.length ?? 'files'}...`} icon={<FileText className="size-4 animate-pulse" />} />

  if ('error' in (output as any)) {
    return <ErrorCard title="Write Files Failed" message={String((output as any).error)} />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="size-4 text-green-600" />
            Files Written
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <div>Success: {String((output as any).success)}</div>
            <div>Files Written: {(output as any).filesWritten ?? (input as any).files?.length ?? 0}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Files</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[180px] pr-4">
            <div className="space-y-2">
              {((input as any).files || []).map((f: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded border">
                  <FileText className="size-4" />
                  <div className="text-sm truncate">{f.path}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

/* List Files Card */
interface ListFilesCardProps {
  toolCallId: string
  input: ListFilesUITool['input']
  output?: ListFilesUITool['output']
  errorText?: string
}

export function ListFilesCard({ input, output, errorText }: ListFilesCardProps) {
  if (errorText) return <ErrorCard title="List Files Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Listing files in ${(input as any).path ?? '/'}...`} icon={<List className="size-4 animate-pulse" />} />

  const files = (output as any).files || []
  const fileCount = files.length
  const dirCount = files.filter((f: any) => f.isDirectory).length

  // Search / filter state for better UX
  const [fileQuery, setFileQuery] = useState('')
  const filteredFiles = fileQuery
    ? files.filter(
      (f: any) =>
        (f.name || '').toLowerCase().includes(fileQuery.toLowerCase()) ||
        (f.path || '').toLowerCase().includes(fileQuery.toLowerCase())
    )
    : files

  return (
    <div className="space-y-4">
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <List className="size-4 text-blue-600" />
            Directory: {(output as any).path}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="text-blue-700">
              {fileCount} entries
            </Badge>
            <Badge variant="secondary" className="text-purple-700">
              {dirCount} directories
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search + Contents */}
      <Card>
        <CardHeader className="pb-3 flex items-center gap-2">
          <CardTitle className="text-sm flex-1">Contents</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              className="w-56"
              placeholder="Filter files..."
              value={fileQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFileQuery(e.target.value)}
              aria-label="Filter files"
            />
            <Button size="sm" variant="ghost" onClick={() => setFileQuery('')}>Clear</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[240px] pr-4">
            <div className="space-y-2">
              {filteredFiles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No files match your filter</div>
              ) : (
                filteredFiles.map((f: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded border hover:bg-muted/30">
                    {f.isDirectory ? <Folder className="size-4 text-muted-foreground" /> : <FileText className="size-4 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{f.path}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(f.path)}>
                        <CopyIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

/* Delete File Card */
interface DeleteFileCardProps {
  toolCallId: string
  input: DeleteFileUITool['input']
  output?: DeleteFileUITool['output']
  errorText?: string
}

export function DeleteFileCard({ input, output, errorText }: DeleteFileCardProps) {
  if (errorText) return <ErrorCard title="Delete File Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Deleting ${(input as any).path}...`} icon={<Trash2 className="size-4 animate-pulse" />} />
  if ('error' in (output as any)) return <ErrorCard title="Delete File Failed" message={String((output as any).error)} />

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Trash2 className="size-4 text-red-600" />
          File Deleted
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">Path: {(output as any).path}</div>
        <div className="text-sm">Success: {String((output as any).success)}</div>
      </CardContent>
    </Card>
  )
}

/* Create Directory Card */
interface CreateDirectoryCardProps {
  toolCallId: string
  input: CreateDirectoryUITool['input']
  output?: CreateDirectoryUITool['output']
  errorText?: string
}

export function CreateDirectoryCard({ input, output, errorText }: CreateDirectoryCardProps) {
  if (errorText) return <ErrorCard title="Create Directory Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Creating directory ${(input as any).path}...`} icon={<Folder className="size-4 animate-pulse" />} />
  if ('error' in (output as any)) return <ErrorCard title="Create Directory Failed" message={String((output as any).error)} />

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Folder className="size-4 text-green-600" />
          Directory Created
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">Path: {(output as any).path}</div>
        <div className="text-sm">Success: {String((output as any).success)}</div>
      </CardContent>
    </Card>
  )
}

/* Get File Info Card */
interface GetFileInfoCardProps {
  toolCallId: string
  input: GetFileInfoUITool['input']
  output?: GetFileInfoUITool['output']
  errorText?: string
}

export function GetFileInfoCard({ input, output, errorText }: GetFileInfoCardProps) {
  if (errorText) return <ErrorCard title="Get File Info Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Fetching info for ${(input as any).path}...`} icon={<FileText className="size-4 animate-pulse" />} />
  if ('error' in (output as any)) return <ErrorCard title="Get File Info Failed" message={String((output as any).error)} />

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4" />
          File Info
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-1">
          <div><span className="font-medium">Name:</span> {(output as any).name}</div>
          <div className="flex items-center gap-2">
            <div><span className="font-medium">Path:</span> {(output as any).path}</div>
            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(String((output as any).path))}>
              <CopyIcon className="size-4" />
            </Button>
          </div>
          <div><span className="font-medium">Type:</span> {(output as any).type}</div>
          <div><span className="font-medium">Size:</span> {formatBytes((output as any).size)} ({(output as any).size} bytes)</div>
          {(output as any).mode && <div><span className="font-medium">Mode:</span> {(output as any).mode}</div>}
          {(output as any).permissions && <div><span className="font-medium">Permissions:</span> {(output as any).permissions}</div>}
          {(output as any).owner && <div><span className="font-medium">Owner:</span> {(output as any).owner}</div>}
          {(output as any).modifiedTime && <div><span className="font-medium">Modified:</span> {String((output as any).modifiedTime)}</div>}
          {(output as any).symlinkTarget && <div><span className="font-medium">Symlink:</span> {(output as any).symlinkTarget}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

/* Check File Exists Card */
interface CheckFileExistsCardProps {
  toolCallId: string
  input: CheckFileExistsUITool['input']
  output?: CheckFileExistsUITool['output']
  errorText?: string
}

export function CheckFileExistsCard({ input, output, errorText }: CheckFileExistsCardProps) {
  if (errorText) return <ErrorCard title="Check File Exists Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Checking ${(input as any).path}...`} icon={<Loader2 className="size-4 animate-pulse" />} />
  if ('error' in (output as any)) return <ErrorCard title="Check File Exists Failed" message={String((output as any).error)} />

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CheckCircle className={`size-4 ${(output as any).exists ? 'text-green-600' : 'text-destructive'}`} />
          File Existence
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <div>Path: {(output as any).path}</div>
          <div>Exists: {String((output as any).exists)}</div>
          {(output as any).type && <div>Type: {(output as any).type}</div>}
        </div>
      </CardContent>
    </Card>
  )
}

/* Get File Size Card (keeps original behavior but aligned style) */
interface GetFileSizeCardProps {
  toolCallId: string
  input: GetFileSizeUITool['input']
  output?: GetFileSizeUITool['output']
  errorText?: string
}

export function GetFileSizeCard({ input, output, errorText }: GetFileSizeCardProps) {
  if (errorText) {
    return <ErrorCard title="Get File Size Failed" message={errorText} />
  }

  if (!output) {
    return <LoadingCard title={`Getting file size for ${(input as any).path}...`} icon={<FileText className="size-4 animate-pulse" />} />
  }

  if ('error' in (output as any)) {
    return <ErrorCard title="Get File Size Failed" message={String((output as any).error)} />
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="size-4" />
          File Size
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <p>Path: {(output as any).path}</p>
          <p>Size: {(output as any).size} bytes</p>
          {(output as any).humanReadableSize && <p>Human Readable: {(output as any).humanReadableSize}</p>}
          {(output as any).type && <p>Type: {(output as any).type}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

/* Watch Directory Card */
interface WatchDirectoryCardProps {
  toolCallId: string
  input: WatchDirectoryUITool['input']
  output?: WatchDirectoryUITool['output']
  errorText?: string
}

export function WatchDirectoryCard({ input, output, errorText }: WatchDirectoryCardProps) {
  type WatchEvent = { type: string; name: string; timestamp: string }

  const [visibleEvents, setVisibleEvents] = useState<WatchEvent[]>(() =>
    output && 'events' in (output as any) && Array.isArray((output as any).events) ? ((output as any).events as WatchEvent[]) : []
  )

  // Search and auto-scroll UX enhancements
  const [eventQuery, setEventQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (output && 'events' in (output as any) && Array.isArray((output as any).events)) {
      setVisibleEvents((output as any).events as WatchEvent[])
    } else {
      setVisibleEvents([])
    }
  }, [output])

  // when events update, optionally auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [visibleEvents, autoScroll])

  const copyEvents = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(visibleEvents, null, 2))
    } catch {
      // ignore
    }
  }

  if (errorText) return <ErrorCard title="Watch Directory Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Watching ${(input as any).path}...`} icon={<Clock className="size-4 animate-pulse" />} />
  if ('error' in (output as any)) return <ErrorCard title="Watch Directory Failed" message={String((output as any).error)} />

  const filteredEvents = eventQuery
    ? visibleEvents.filter(
      (e) =>
        e.name.toLowerCase().includes(eventQuery.toLowerCase()) ||
        e.type.toLowerCase().includes(eventQuery.toLowerCase())
    )
    : visibleEvents

  return (
    <div className="space-y-4">
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <List className="size-4 text-green-600" />
            Watch Started
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Events: {visibleEvents.length}</Badge>
            <Button size="sm" variant="ghost" onClick={() => setAutoScroll((s) => !s)}>{autoScroll ? 'Auto-scroll On' : 'Auto-scroll Off'}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm">Path: {(output as any).path}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-sm flex-1">Events</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              className="w-40"
              placeholder="Filter events..."
              value={eventQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEventQuery(e.target.value)}
            />
            <Button size="sm" variant="ghost" onClick={() => setVisibleEvents([])}>Clear</Button>
            <Button size="sm" variant="ghost" onClick={copyEvents}><CopyIcon className="size-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[240px] pr-4">
            <div aria-live="polite" aria-atomic="true" className="space-y-2">
              {filteredEvents.map((e: WatchEvent, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded border">
                  <Clock className="size-4" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(String(e.timestamp)).toLocaleString()}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{e.type}</Badge>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

/* Run Command Card */
interface RunCommandCardProps {
  toolCallId: string
  input: RunCommandUITool['input']
  output?: RunCommandUITool['output']
  errorText?: string
}

export function RunCommandCard({ input, output, errorText }: RunCommandCardProps) {
  if (errorText) return <ErrorCard title="Run Command Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Running command: ${(input as any).command}`} icon={<Terminal className="size-4 animate-pulse" />} />
  if ('error' in (output as any)) return <ErrorCard title="Run Command Failed" message={String((output as any).error)} />

  const stdout = (output as any).stdout ?? ''
  const stderr = (output as any).stderr ?? ''

  // UX: filtering, line numbers, and auto-scroll toggles for stdout/stderr
  const [stdoutQuery, setStdoutQuery] = useState('')
  const [stderrQuery, setStderrQuery] = useState('')
  const [showLineNumbers, setShowLineNumbers] = useState(false)
  const [autoScrollStdout, setAutoScrollStdout] = useState(true)
  const [autoScrollStderr, setAutoScrollStderr] = useState(true)
  const stdoutFiltered = stdoutQuery ? stdout.split('\n').filter((l: string) => l.toLowerCase().includes(stdoutQuery.toLowerCase())).join('\n') : stdout
  const stderrFiltered = stderrQuery ? stderr.split('\n').filter((l: string) => l.toLowerCase().includes(stderrQuery.toLowerCase())).join('\n') : stderr
  const stdoutBottomRef = useRef<HTMLDivElement | null>(null)
  const stderrBottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (autoScrollStdout && stdoutBottomRef.current) stdoutBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [stdoutFiltered, autoScrollStdout])

  useEffect(() => {
    if (autoScrollStderr && stderrBottomRef.current) stderrBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [stderrFiltered, autoScrollStderr])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Terminal className="size-4 text-primary" />
            Command Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <div>Command: {(output as any).command ?? (input as any).command}</div>
            <div>
              <Badge variant="secondary" className={`text-xs ${(output as any).exitCode === 0 ? 'text-green-700' : 'text-destructive'}`}>
                Exit: {(output as any).exitCode ?? 'N/A'}
              </Badge>
              <Badge variant="secondary" className="text-xs ml-2">Time: {(output as any).executionTime ?? 'N/A'} ms</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="stdout" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stdout" className="text-xs">Stdout</TabsTrigger>
          <TabsTrigger value="stderr" className="text-xs">Stderr</TabsTrigger>
        </TabsList>

        <TabsContent value="stdout" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-sm">Stdout</CardTitle>
              <div className="flex items-center gap-2">
                <Input value={stdoutQuery} onChange={(e: ChangeEvent<HTMLInputElement>) => setStdoutQuery(e.target.value)} placeholder="Filter stdout..." className="w-40 text-xs" />
                <Button size="sm" variant="ghost" onClick={() => setStdoutQuery('')}>Clear</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowLineNumbers((s) => !s)}>{showLineNumbers ? 'Line #' : 'No lines'}</Button>
                <Button size="sm" variant="ghost" onClick={() => setAutoScrollStdout((s) => !s)}>{autoScrollStdout ? 'Auto-scroll On' : 'Auto-scroll Off'}</Button>
              </div>
            </CardHeader>
            <CardContent aria-live="polite" aria-atomic="true">
              {stdout ? (
                <>
                  <CodeBlock code={stdoutFiltered} language="bash" showLineNumbers={showLineNumbers}>
                    <CodeBlockCopyButton />
                    <Button size="icon" variant="ghost" onClick={() => downloadFile('stdout.txt', stdoutFiltered)}>
                      <Download className="size-4" />
                    </Button>
                  </CodeBlock>
                  <div ref={stdoutBottomRef} />
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No stdout</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stderr" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-sm">Stderr</CardTitle>
              <div className="flex items-center gap-2">
                <Input value={stderrQuery} onChange={(e: ChangeEvent<HTMLInputElement>) => setStderrQuery(e.target.value)} placeholder="Filter stderr..." className="w-40 text-xs" />
                <Button size="sm" variant="ghost" onClick={() => setStderrQuery('')}>Clear</Button>
                <Button size="sm" variant="ghost" onClick={() => setAutoScrollStderr((s) => !s)}>{autoScrollStderr ? 'Auto-scroll On' : 'Auto-scroll Off'}</Button>
              </div>
            </CardHeader>
            <CardContent aria-live="polite" aria-atomic="true">
              {stderr ? (
                <>
                  <CodeBlock code={stderrFiltered} language="bash" showLineNumbers={showLineNumbers}>
                    <CodeBlockCopyButton />
                    <Button size="icon" variant="ghost" onClick={() => downloadFile('stderr.txt', stderrFiltered)}>
                      <Download className="size-4" />
                    </Button>
                  </CodeBlock>
                  <div ref={stderrBottomRef} />
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No stderr</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* Run Code Card */
interface RunCodeCardProps {
  toolCallId: string
  input: RunCodeUITool['input']
  output?: RunCodeUITool['output']
  errorText?: string
}

export function RunCodeCard({ input, output, errorText }: RunCodeCardProps) {
  if (errorText) return <ErrorCard title="Run Code Failed" message={errorText} />
  if (!output) return <LoadingCard title={`Executing code (${(input as any).runCodeOpts?.language || 'unknown'})...`} icon={<CodeIcon className="size-4 animate-pulse" />} />
  if ('error' in (output as any)) return <ErrorCard title="Run Code Failed" message={String((output as any).error)} />

  const execution: any = (output as any).execution || {}
  const logs: any = execution.logs || {}

  const stdout = logs.stdout || ''
  const stderr = logs.stderr || ''

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CodeIcon className="size-4 text-primary" />
            Execution Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <div>Language: {(input as any).runCodeOpts?.language ?? 'unknown'}</div>
            <div>Success: {String(execution.success ?? false)}</div>
            <div>Exit Code: {execution.exitCode ?? 'N/A'}</div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs" className="text-xs">Stdout</TabsTrigger>
          <TabsTrigger value="error" className="text-xs">Stderr</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Stdout</CardTitle></CardHeader>
            <CardContent aria-live="polite" aria-atomic="true">
              {stdout ? (
                <CodeBlock code={stdout} language={mapToBundledLanguage((input as any).runCodeOpts?.language ?? 'bash')}>
                  <CodeBlockCopyButton />
                </CodeBlock>
              ) : (
                <div className="text-sm text-muted-foreground">No stdout</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="error" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Stderr</CardTitle></CardHeader>
            <CardContent aria-live="polite" aria-atomic="true">
              {stderr ? (
                <CodeBlock code={stderr} language={mapToBundledLanguage((input as any).runCodeOpts?.language ?? 'bash')}>
                  <CodeBlockCopyButton />
                </CodeBlock>
              ) : (
                <div className="text-sm text-muted-foreground">No stderr</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
