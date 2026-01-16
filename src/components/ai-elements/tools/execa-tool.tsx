'use client'

import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import {
  AlertCircle,
  CopyIcon,
  Download,
  FileText,
  Loader2,
  Terminal,
} from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { CodeBlock, CodeBlockCopyButton } from '../code-block'
import type { ExecaUITool } from './types'

interface ExecaToolCardProps {
  toolCallId: string
  input: ExecaUITool['input']
  output?: ExecaUITool['output']
  errorText?: string
}

/* Small helpers */
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
    // ignore
  }
}

export function ExecaToolCard({ input, output, errorText }: ExecaToolCardProps) {
  const [displayText, setDisplayText] = useState<string>((output as { message?: string })?.message ?? '')
  const [query, setQuery] = useState<string>('')
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(false)
  const contentBottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Update display text when output changes
    setDisplayText((output as { message?: string })?.message ?? '')
  }, [(output as { message?: string })?.message])

  // Auto-scroll when display text updates
  useEffect(() => {
    if (contentBottomRef.current) {
      contentBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [displayText])

  const filteredText = query
    ? displayText
      .split('\n')
      .filter((l) => l.toLowerCase().includes(query.toLowerCase()))
      .join('\n')
    : displayText

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(`${(input as { command: string, args?: string[], cwd?: string }).command} ${(input as { command: string, args?: string[], cwd?: string }).args?.join(' ') ?? ''}`)
    } catch {
      // ignore
    }
  }

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(displayText)
    } catch {
      // ignore
    }
  }

  if (errorText) {
    return <ErrorCard title="Command Execution Failed" message={errorText} />
  }

  if (!output) {
    return (
      <LoadingCard
        title={`Executing: ${(input as { command: string, args?: string[], cwd?: string }).command} ${(input as { command: string, args?: string[], cwd?: string }).args?.join(' ') ?? ''}`}
        subtitle={(input as { command: string, args?: string[], cwd?: string }).cwd ? `cwd: ${(input as { command: string, args?: string[], cwd?: string }).cwd}` : undefined}
        icon={<Loader2 className="size-4 animate-spin" />}
      />
    )
  }

  // Determine a naive success indicator from message content (best-effort)
  const isLikelySuccess = ((output as { message?: string })?.message || '').toLowerCase().includes('success') || !((output as { message?: string })?.message || '').toLowerCase().includes('error')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Terminal className="size-4 text-primary" />
            Command Output
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-xs ${isLikelySuccess ? 'text-green-700' : 'text-destructive'}`}>
              {isLikelySuccess ? 'Likely Success' : 'Possible Error'}
            </Badge>
            <Button size="sm" variant="ghost" onClick={copyCommand}>
              <CopyIcon className="size-4 mr-2" />
              Copy Command
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">
            <div>
              <span className="font-medium">Command:</span> <span className="font-mono">{(input as { command: string, args?: string[], cwd?: string }).command}</span>
            </div>
            {(input as { command: string, args?: string[], cwd?: string }).args && (input as { command: string, args?: string[], cwd?: string }).args!.length > 0 && (
              <div className="mt-1 flex items-center gap-2">
                {(input as { command: string, args?: string[], cwd?: string }).args!.map((a: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-sm">Output</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Filter lines..."
              className="w-56 text-sm"
            />
            <Button size="sm" variant="ghost" onClick={() => setQuery('')}>
              Clear
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowLineNumbers((s) => !s)}>
              {showLineNumbers ? 'Line #' : 'No lines'}
            </Button>
            <Button size="sm" variant="ghost" onClick={copyOutput}>
              <CopyIcon className="size-4 mr-2" />
              Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => downloadFile('command-output.txt', displayText)}>
              <Download className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDisplayText('')}>
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {filteredText ? (
              <div aria-live="polite" aria-atomic="true">
                <CodeBlock code={filteredText} language="bash" showLineNumbers={showLineNumbers}>
                  <CodeBlockCopyButton />
                  <Button size="icon" variant="ghost" onClick={() => downloadFile('command-output-filtered.txt', filteredText)}>
                    <Download className="size-4" />
                  </Button>
                </CodeBlock>
                <div ref={contentBottomRef} />
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No output</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExecaToolCard
