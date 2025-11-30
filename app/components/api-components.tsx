"use client"

import { ReactNode, useState } from "react"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import { CopyIcon, CheckIcon } from "lucide-react"

interface ApiEndpointProps {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  path: string
  description?: string
  children?: ReactNode
}

const METHOD_COLORS = {
  GET: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PATCH: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

export function ApiEndpoint({ method, path, description, children }: ApiEndpointProps) {
  const [copied, setCopied] = useState(false)

  const copyPath = () => {
    navigator.clipboard.writeText(path)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-6 rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`rounded px-2 py-1 text-xs font-bold ${METHOD_COLORS[method]}`}>
            {method}
          </span>
          <code className="text-sm font-medium text-foreground">{path}</code>
        </div>
        <Button variant="ghost" size="icon" onClick={copyPath}>
          {copied ? <CheckIcon className="size-4 text-green-500" /> : <CopyIcon className="size-4" />}
        </Button>
      </div>
      {description && (
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}
      {children && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  )
}

interface ApiParamProps {
  name: string
  type: string
  required?: boolean
  description: string
}

export function ApiParam({ name, type, required, description }: ApiParamProps) {
  return (
    <div className="flex items-start gap-4 py-2">
      <div className="flex items-center gap-2">
        <code className="text-sm font-medium text-foreground">{name}</code>
        <Badge variant="outline" className="text-xs">{type}</Badge>
        {required && <Badge variant="destructive" className="text-xs">Required</Badge>}
      </div>
      <p className="flex-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

interface CodeBlockProps {
  language?: string
  title?: string
  children: string
}

export function CodeBlock({ language = "json", title, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-4 rounded-lg border border-border overflow-hidden">
      {title && (
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <Button variant="ghost" size="sm" onClick={copyCode}>
            {copied ? <CheckIcon className="mr-2 size-4 text-green-500" /> : <CopyIcon className="mr-2 size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
      <pre className="overflow-x-auto bg-muted/30 p-4">
        <code className="text-sm">{children}</code>
      </pre>
    </div>
  )
}
