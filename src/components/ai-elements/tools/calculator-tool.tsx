'use client'

import type {
  CalculatorUITool,
  MatrixCalculatorUITool,
  UnitConverterUITool,
} from './types'

import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import { CodeBlock, CodeBlockCopyButton } from '../code-block'

import {
  AlertCircle,
  ArrowRightCircle,
  Calculator as CalculatorIcon,
  CopyIcon,
  Download,
  Grid as GridIcon,
  Loader2,
} from 'lucide-react'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'

/* Helpers */

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
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

/* Calculator UI Components */

/* 1) Calculator card */
interface CalculatorCardProps {
  toolCallId: string
  input: CalculatorUITool['input']
  output?: CalculatorUITool['output']
  errorText?: string
}

export function CalculatorCard({ input, output, errorText }: CalculatorCardProps) {
  const [copied, setCopied] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  const exprInput = input && typeof input === 'object' && 'expression' in input ? (input as any).expression : undefined

  if (errorText) return <ErrorCard title="Calculation Failed" message={errorText} />
  if (!output) {
    return <LoadingCard title={`Calculating...`} subtitle={exprInput ?? (input as any)?.expression} icon={<Loader2 className="size-4 animate-spin" />} />
  }
  if (output && typeof output === 'object' && 'error' in output) {
    return <ErrorCard title="Calculation Error" message={(output as any).message ?? 'Error'} />
  }

  const result = (output as any).result
  const formatted = (output as any).formattedResult ?? String(result ?? '')
  const expr = (output as any).expression ?? exprInput ?? (input as any)?.expression
  const variables = (output as any).variables ?? ((input as any)?.variables ?? {})

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(formatted))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const jsonVars = JSON.stringify(variables, null, 2)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalculatorIcon className="size-4 text-primary" />
            Calculator
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{(output as any).success ? 'Success' : 'Ready'}</Badge>
            <Button size="sm" variant="ghost" onClick={copy}>
              <CopyIcon className="size-4 mr-2" />
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => downloadFile('calculation-result.txt', formatted)}>
              <Download className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="text-sm space-y-2">
            <div className="text-xs text-muted-foreground">Expression</div>
            <div className="font-mono text-sm">{expr}</div>

            <div className="pt-2">
              <div className="text-xs text-muted-foreground">Result</div>
              <div className="text-lg font-medium">{formatted}</div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowSteps((s) => !s)}>
                {showSteps ? 'Hide variables' : 'Show variables'}
              </Button>
            </div>

            {showSteps && (
              <div className="pt-2">
                <div className="text-xs text-muted-foreground">Variables</div>
                <CodeBlock code={jsonVars} language="json">
                  <CodeBlockCopyButton />
                </CodeBlock>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* 2) Unit Converter Card */
interface UnitConverterCardProps {
  toolCallId: string
  input: UnitConverterUITool['input']
  output?: UnitConverterUITool['output']
  errorText?: string
}

export function UnitConverterCard({ input, output, errorText }: UnitConverterCardProps) {
  const [copied, setCopied] = useState(false)

  const valInput = input && typeof input === 'object' && 'value' in input ? (input as any).value : undefined
  const fromInput = input && typeof input === 'object' && 'fromUnit' in input ? (input as any).fromUnit : undefined
  const toInput = input && typeof input === 'object' && 'toUnit' in input ? (input as any).toUnit : undefined

  if (errorText) return <ErrorCard title="Conversion Failed" message={errorText} />
  if (!output) {
    const subtitle = `${valInput ?? (input as any)?.value} ${fromInput ?? (input as any)?.fromUnit} → ${toInput ?? (input as any)?.toUnit}`
    return <LoadingCard title={`Converting ${valInput ?? (input as any)?.value}`} subtitle={subtitle} icon={<Loader2 className="size-4 animate-spin" />} />
  }
  if (output && typeof output === 'object' && 'error' in output) {
    return <ErrorCard title="Conversion Error" message={(output as any).message ?? 'Error'} />
  }

  const formatted = (output as any).formattedResult ?? String((output as any).result ?? '')
  const result = (output as any).result

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(formatted))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ArrowRightCircle className="size-4 text-primary" />
          Unit Converter
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{fromInput ?? (input as any)?.fromUnit} → {toInput ?? (input as any)?.toUnit}</Badge>
          <Button size="sm" variant="ghost" onClick={copy}>
            <CopyIcon className="size-4 mr-2" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => downloadFile('conversion.txt', `${formatted}`)}>
            <Download className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <div className="text-xs text-muted-foreground">Input</div>
          <div className="font-mono">{(input as any).value} {(input as any).fromUnit}</div>

          <div className="pt-2">
            <div className="text-xs text-muted-foreground">Result</div>
            <div className="text-lg font-medium">{formatted}</div>
            {result !== undefined && <div className="text-xs text-muted-foreground mt-1">Raw: {String(result)}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* 3) Matrix Calculator Card */
interface MatrixCalculatorCardProps {
  toolCallId: string
  input: MatrixCalculatorUITool['input']
  output?: MatrixCalculatorUITool['output']
  errorText?: string
}

export function MatrixCalculatorCard({ input, output, errorText }: MatrixCalculatorCardProps) {
  const [copied, setCopied] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const operationInput = input && typeof input === 'object' && 'operation' in input ? (input as any).operation : undefined

  if (errorText) return <ErrorCard title="Matrix Operation Failed" message={errorText} />
  if (!output) {
    return <LoadingCard title={`Computing matrix ${operationInput ?? 'operation'}`} icon={<Loader2 className="size-4 animate-spin" />} />
  }
  if (output && typeof output === 'object' && 'error' in output) {
    return <ErrorCard title="Matrix Error" message={(output as any).message ?? 'Error'} />
  }

  const result = (output as any).result
  const hasResult = Array.isArray(result) && result.length > 0

  const formatted = JSON.stringify(result ?? {}, null, 2)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GridIcon className="size-4 text-primary" />
          Matrix: {operationInput ?? (input as any)?.operation}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{hasResult ? 'Done' : 'No Result'}</Badge>
          <Button size="sm" variant="ghost" onClick={copy}>
            <CopyIcon className="size-4 mr-2" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => downloadFile('matrix-result.json', formatted)}>
            <Download className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowJson((s) => !s)}>{showJson ? 'Hide JSON' : 'Show JSON'}</Button>
        </div>
      </CardHeader>

      <CardContent>
        {hasResult ? (
          <div className="space-y-3">
            {!showJson ? (
              <ScrollArea className="h-[260px] pr-4">
                <div className="space-y-2">
                  {(result as any[]).map((row: any[], rIdx: number) => (
                    <div key={rIdx} className="flex gap-2">
                      {row.map((val, cIdx) => (
                        <div key={cIdx} className="p-2 border rounded text-sm min-w-[48px] text-center">
                          {String(val)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <CodeBlock code={formatted} language="json">
                <CodeBlockCopyButton />
              </CodeBlock>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No matrix result available</div>
        )}
      </CardContent>
    </Card>
  )
}
