"use client"

import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
  WebPreviewConsole,
} from "@/src/components/ai-elements/web-preview"
import { CodeBlock, CodeBlockCopyButton } from "@/src/components/ai-elements/code-block"
import { Button } from "@/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Textarea } from "@/ui/textarea"
import { Badge } from "@/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip"
import {
  ExternalLinkIcon,
  XIcon,
  CodeIcon,
  MonitorIcon,
  RefreshCwIcon,
  MaximizeIcon,
  MinimizeIcon,
  CopyIcon,
  DownloadIcon,
  CheckIcon,
  PlayIcon,
  RotateCcwIcon,
  Edit3Icon,
  EyeIcon,
  SplitIcon,
  WrapTextIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import type { BundledLanguage } from "shiki"

export interface WebPreviewData {
  id: string
  url: string
  title?: string
  code?: string
  language?: string
  html?: string
}

type EditorMode = "preview" | "code" | "split"
type PreviewStatus = "idle" | "running" | "success" | "error"

interface AgentWebPreviewProps {
  preview: WebPreviewData
  onClose?: () => void
  onCodeChange?: (code: string) => void
  defaultTab?: "preview" | "code"
  height?: string | number
  showConsole?: boolean
  editable?: boolean
}

export function AgentWebPreview({
  preview,
  onClose,
  onCodeChange,
  defaultTab = "preview",
  height = 400,
  showConsole = false,
  editable = true,
}: AgentWebPreviewProps) {
  const [mode, setMode] = useState<EditorMode>(defaultTab === "code" ? "code" : "preview")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [consoleLogs, setConsoleLogs] = useState<
    Array<{ level: "log" | "warn" | "error"; message: string; timestamp: Date }>
  >([])

  // Live editing state
  const [editedCode, setEditedCode] = useState((preview.code ?? preview.html) ?? "")
  const [originalCode] = useState((preview.code ?? preview.html) ?? "")
  const [isEditing, setIsEditing] = useState(false)
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [wordWrap, setWordWrap] = useState(true)
  const [autoRun, setAutoRun] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const hasCode = Boolean(preview.code ?? preview.html)
  const codeLanguage = (preview.language ?? ((preview.html) ? "html" : "tsx")) as BundledLanguage
  const hasChanges = editedCode !== originalCode

  // Generate preview URL from edited code
  const livePreviewUrl = useMemo(() => {
    if (!editedCode) {return preview.url}

    const sandboxHtml = generateSandboxHtml(editedCode, codeLanguage, preview.title)
    return `data:text/html;charset=utf-8,${encodeURIComponent(sandboxHtml)}`
  }, [editedCode, codeLanguage, preview.title, preview.url])

  // Auto-run preview when code changes (if enabled)
  useEffect(() => {
    if (autoRun && isEditing && hasChanges) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        handleRunPreview()
      }, 1000)
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [editedCode, autoRun, isEditing, hasChanges])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [editedCode])

  const handleDownload = useCallback(() => {
    const extensions: Record<string, string> = {
      tsx: "tsx",
      jsx: "jsx",
      html: "html",
      javascript: "js",
      typescript: "ts",
      css: "css",
      json: "json",
    }
    const ext = extensions[codeLanguage] || "txt"
    const filename = `${(preview.title ?? "generated-component").toLowerCase().replace(/\s+/g, "-")}.${ext}`

    const blob = new Blob([editedCode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [editedCode, codeLanguage, preview.title])

  const handleRunPreview = useCallback(() => {
    setPreviewStatus("running")
    setErrorMessage(null)
    setIframeKey((prev) => prev + 1)
    setConsoleLogs([])

    // Simulate a brief loading state
    setTimeout(() => {
      setPreviewStatus("success")
    }, 500)

    onCodeChange?.(editedCode)
  }, [editedCode, onCodeChange])

  const handleResetCode = useCallback(() => {
    setEditedCode(originalCode)
    setIsEditing(false)
    setErrorMessage(null)
    setPreviewStatus("idle")
  }, [originalCode])

  const handleRefresh = useCallback(() => {
    setIframeKey((prev) => prev + 1)
    setConsoleLogs([])
    setPreviewStatus("idle")
  }, [])

  const handleOpenInNewTab = useCallback(() => {
    window.open(livePreviewUrl, "_blank")
  }, [livePreviewUrl])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  const handleCodeChange = useCallback((value: string) => {
    setEditedCode(value)
    setIsEditing(true)
    setPreviewStatus("idle")
  }, [])

  const containerHeight = useMemo(() => {
    if (isFullscreen) {return "calc(100vh - 120px)"}
    return typeof height === "number" ? `${height}px` : height
  }, [height, isFullscreen])

  const editorHeight = useMemo(() => {
    if (isFullscreen) {return "calc(100vh - 200px)"}
    return typeof height === "number" ? `${height - 50}px` : height
  }, [height, isFullscreen])

  return (
    <Card className={`overflow-hidden ${isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">
            {preview.title ?? "Generated Preview"}
          </CardTitle>
          {hasChanges && (
            <Badge variant="outline" className="h-5 text-xs">
              Modified
            </Badge>
          )}
          {previewStatus === "success" && (
            <CheckCircle2Icon className="size-4 text-green-500" />
          )}
          {previewStatus === "error" && (
            <AlertCircleIcon className="size-4 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* View Mode Toggle */}
          {hasCode && (
            <div className="flex items-center rounded-md border bg-background p-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === "preview" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setMode("preview")}
                    >
                      <EyeIcon className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview only</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === "split" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setMode("split")}
                    >
                      <SplitIcon className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Split view</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={mode === "code" ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setMode("code")}
                    >
                      <CodeIcon className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Code only</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Action Buttons */}
          <div className="ml-2 flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <MinimizeIcon className="size-4" />
                    ) : (
                      <MaximizeIcon className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onClose}
              >
                <XIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          className={`flex ${mode === "split" ? "flex-row" : "flex-col"}`}
          style={{ height: containerHeight }}
        >
          {/* Code Editor Panel */}
          {(mode === "code" || mode === "split") && (
            <div
              className={`flex flex-col border-r ${mode === "split" ? "w-1/2" : "w-full"}`}
            >
              {/* Editor Toolbar */}
              <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="h-5 text-xs font-mono">
                    {codeLanguage}
                  </Badge>
                  {editable && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={autoRun ? "secondary" : "ghost"}
                            size="sm"
                            className="h-6 gap-1 px-2 text-xs"
                            onClick={() => setAutoRun(!autoRun)}
                          >
                            <PlayIcon className="size-3" />
                            Auto
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {autoRun ? "Disable auto-run" : "Enable auto-run on change"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={wordWrap ? "secondary" : "ghost"}
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setWordWrap(!wordWrap)}
                        >
                          <WrapTextIcon className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Toggle word wrap</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {hasChanges && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-xs"
                            onClick={handleResetCode}
                          >
                            <RotateCcwIcon className="size-3" />
                            Reset
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reset to original code</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-xs"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="size-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-3" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-xs"
                    onClick={handleDownload}
                  >
                    <DownloadIcon className="size-3" />
                  </Button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="relative flex-1 overflow-hidden">
                {editable ? (
                  <Textarea
                    value={editedCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className={`h-full w-full resize-none rounded-none border-0 bg-zinc-950 p-4 font-mono text-sm text-zinc-100 focus-visible:ring-0 ${wordWrap ? "" : "whitespace-pre overflow-x-auto"
                      }`}
                    style={{
                      height: editorHeight,
                      whiteSpace: wordWrap ? "pre-wrap" : "pre",
                    }}
                    spellCheck={false}
                  />
                ) : (
                  <div className="h-full overflow-auto">
                    <CodeBlock code={editedCode} language={codeLanguage}>
                      <CodeBlockCopyButton />
                    </CodeBlock>
                  </div>
                )}
              </div>

              {/* Run Button (when not in auto mode) */}
              {editable && !autoRun && hasChanges && mode === "code" && (
                <div className="flex items-center justify-end border-t bg-muted/30 px-2 py-1.5">
                  <Button
                    size="sm"
                    className="h-7 gap-1.5"
                    onClick={handleRunPreview}
                    disabled={previewStatus === "running"}
                  >
                    <PlayIcon className="size-3.5" />
                    Run Preview
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Preview Panel */}
          {(mode === "preview" || mode === "split") && (
            <div className={`flex flex-col ${mode === "split" ? "w-1/2" : "w-full"}`}>
              <WebPreview
                defaultUrl={hasChanges || isEditing ? livePreviewUrl : preview.url}
                className="flex-1 border-0"
              >
                <WebPreviewNavigation>
                  <WebPreviewNavigationButton onClick={handleRefresh} tooltip="Refresh">
                    <RefreshCwIcon className="size-4" />
                  </WebPreviewNavigationButton>
                  <WebPreviewUrl className="flex-1" />
                  <WebPreviewNavigationButton
                    onClick={handleOpenInNewTab}
                    tooltip="Open in new tab"
                  >
                    <ExternalLinkIcon className="size-4" />
                  </WebPreviewNavigationButton>
                  {editable && hasChanges && !autoRun && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={handleRunPreview}
                      disabled={previewStatus === "running"}
                    >
                      <PlayIcon className="size-3" />
                      Run
                    </Button>
                  )}
                </WebPreviewNavigation>
                <div className="flex-1">
                  <WebPreviewBody
                    key={iframeKey}
                    src={hasChanges || isEditing ? livePreviewUrl : preview.url}
                    className="h-full"
                  />
                </div>
                {showConsole && consoleLogs.length > 0 && (
                  <WebPreviewConsole logs={consoleLogs} />
                )}
              </WebPreview>

              {/* Error Message */}
              {(Boolean(errorMessage)) && (
                <div className="border-t bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">
                  <div className="flex items-start gap-2">
                    <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {errorMessage}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to generate sandbox HTML
function generateSandboxHtml(
  code: string,
  language: string,
  title?: string
): string {
  if (language === "html") {
    return code
  }

  // For React/TSX code, create a minimal runtime with common libraries
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title ?? "Code Preview"}</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/recharts@2/umd/Recharts.js"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      background: white;
      color: #111;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0a0a0a; color: #ededed; }
    }
    #root { min-height: 100vh; }
    .error {
      color: #dc2626;
      padding: 16px;
      background: #fef2f2;
      border-radius: 8px;
      border: 1px solid #fecaca;
      font-family: monospace;
      white-space: pre-wrap;
      font-size: 13px;
    }
    @media (prefers-color-scheme: dark) {
      .error { background: #450a0a; border-color: #7f1d1d; color: #fca5a5; }
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #666;
    }
  </style>
</head>
<body>
  <div id="root"><div class="loading">Loading...</div></div>
  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useMemo, useCallback, useRef, useContext, createContext, Fragment } = React;
    const {
      LineChart, Line, BarChart, Bar, PieChart, Pie,
      AreaChart, Area, ComposedChart, ScatterChart, Scatter,
      RadarChart, Radar, RadialBarChart, RadialBar,
      Treemap, Funnel, FunnelChart, Sankey,
      XAxis, YAxis, ZAxis, CartesianGrid,
      Tooltip, Legend, ResponsiveContainer, Cell,
      Brush, ReferenceLine, ReferenceArea, ReferenceDot,
      PolarGrid, PolarAngleAxis, PolarRadiusAxis,
      LabelList, Label, Text
    } = Recharts;

    // Color palette for charts
    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    // Sample data helper
    const generateSampleData = (count = 12) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.slice(0, count).map((month, i) => ({
        name: month,
        value: Math.floor(Math.random() * 5000) + 1000,
        value2: Math.floor(Math.random() * 3000) + 500,
        growth: (Math.random() * 40 - 10).toFixed(1),
      }));
    };

    try {
      // User code injection point
      ${code}

      // Try to find and render a component
      const componentNames = ['App', 'Component', 'Chart', 'Preview', 'Demo', 'Main', 'default'];
      let ComponentToRender = null;

      for (const name of componentNames) {
        try {
          const component = eval(name);
          if (typeof component === 'function' || (typeof component === 'object' && component !== null)) {
            ComponentToRender = component;
            break;
          }
        } catch (e) {
          // Component not found, continue
        }
      }

      if (ComponentToRender) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(ComponentToRender));
      } else {
        // Check if there's JSX at the top level that we can render
        document.getElementById('root').innerHTML = '<div class="error">No component found to render.\\n\\nExport a component named: App, Component, Chart, Preview, Demo, or Main.</div>';
      }
    } catch (err) {
      document.getElementById('root').innerHTML = '<div class="error">Error: ' + (err.message || err).toString().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
      console.error('Preview error:', err);
    }
  </script>
</body>
</html>`
}

// Minimal inline preview for use within messages
interface AgentWebPreviewInlineProps {
  url: string
  title?: string
  height?: number
  onExpand?: () => void
}

export function AgentWebPreviewInline({
  url,
  title,
  height = 200,
  onExpand,
}: AgentWebPreviewInlineProps) {
  return (
    <div className="my-2 overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {title || "Preview"}
        </span>
        <div className="flex items-center gap-1">
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onExpand}
              title="Expand preview"
            >
              <MaximizeIcon className="size-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => window.open(url, "_blank")}
            title="Open in new tab"
          >
            <ExternalLinkIcon className="size-3" />
          </Button>
        </div>
      </div>
      <iframe
        src={url}
        title={title ?? "Preview"}
        className="w-full border-0"
        style={{ height }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
      />
    </div>
  )
}

// Sandbox preview for React/HTML code execution
interface AgentCodeSandboxProps {
  code: string
  language?: string
  title?: string
  dependencies?: Record<string, string>
  onClose?: () => void
  onCodeChange?: (code: string) => void
  editable?: boolean
}

export function AgentCodeSandbox({
  code,
  language = "tsx",
  title,
  dependencies = {},
  onClose,
  onCodeChange,
  editable = true,
}: AgentCodeSandboxProps) {
  const sandboxHtml = useMemo(() => {
    return generateSandboxHtml(code, language, title)
  }, [code, language, title])

  const dataUrl = useMemo(() => {
    return `data:text/html;charset=utf-8,${encodeURIComponent(sandboxHtml)}`
  }, [sandboxHtml])

  return (
    <AgentWebPreview
      preview={{
        id: `sandbox-${Date.now()}`,
        url: dataUrl,
        title: title ?? "Code Sandbox",
        code,
        language,
      }}
      onClose={onClose}
      onCodeChange={onCodeChange}
      defaultTab="preview"
      height={500}
      editable={editable}
    />
  )
}
