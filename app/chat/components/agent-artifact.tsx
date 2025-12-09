"use client"

import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactClose,
  ArtifactContent,
} from "@/src/components/ai-elements/artifact"
import { CodeBlock } from "@/src/components/ai-elements/code-block"
import { Button } from "@/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog"
import {
  CopyIcon,
  DownloadIcon,
  PlayIcon,
  MaximizeIcon,
  CheckIcon,
  Code2Icon,
} from "lucide-react"
import { useState, useCallback } from "react"
import type { BundledLanguage } from "shiki"
import { AgentCodeSandbox } from "./agent-web-preview"

export interface ArtifactData {
  id: string
  title: string
  description?: string
  type: "code" | "markdown" | "json" | "text" | "html" | "react"
  language?: string
  content: string
}

export interface AgentArtifactProps {
  artifact: ArtifactData
  onClose?: () => void
  onCodeUpdate?: (artifactId: string, newCode: string) => void
}

// Languages that support live preview
const PREVIEWABLE_LANGUAGES = [
  "tsx",
  "jsx",
  "typescript",
  "javascript",
  "html",
  "react",
]

const normalizeLanguage = (lang?: string): string => lang?.toLowerCase() ?? ""

export function AgentArtifact({
  artifact,
  onClose,
  onCodeUpdate,
}: AgentArtifactProps) {
  const [copied, setCopied] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editedCode, setEditedCode] = useState(artifact.content)

  const isPreviewable =
    artifact.type === "code" &&
    PREVIEWABLE_LANGUAGES.includes(normalizeLanguage(artifact.language))

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
      code: artifact.language ?? "txt",
      markdown: "md",
      json: "json",
      text: "txt",
      html: "html",
      react: "tsx",
    }
    const ext = extensions[artifact.type] || "txt"
    const filename = `${artifact.title.toLowerCase().replace(/\s+/g, "-")}.${ext}`

    const blob = new Blob([editedCode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [editedCode, artifact])

  const handleOpenEditor = useCallback(() => {
    setIsEditorOpen(true)
  }, [])

  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false)
  }, [])

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setEditedCode(newCode)
      onCodeUpdate?.(artifact.id, newCode)
    },
    [artifact.id, onCodeUpdate]
  )

  const language: BundledLanguage = (artifact.language ??
    (artifact.type === "json"
      ? "json"
      : artifact.type === "html"
        ? "html"
        : artifact.type === "react"
          ? "tsx"
          : "plaintext")) as BundledLanguage

  return (
    <>
      <Artifact className="my-4">
        <ArtifactHeader>
          <div className="flex flex-col gap-0.5">
            <ArtifactTitle>{artifact.title}</ArtifactTitle>
            {(Boolean(artifact.description)) && (
              <ArtifactDescription>{artifact.description}</ArtifactDescription>
            )}
          </div>
          <ArtifactActions>
            {isPreviewable && (
              <ArtifactAction
                tooltip="Open in Live Editor"
                icon={PlayIcon}
                onClick={handleOpenEditor}
              />
            )}
            <ArtifactAction
              tooltip={copied ? "Copied!" : "Copy"}
              icon={copied ? CheckIcon : CopyIcon}
              onClick={handleCopy}
            />
            <ArtifactAction
              tooltip="Download"
              icon={DownloadIcon}
              onClick={handleDownload}
            />
            {onClose && <ArtifactClose onClick={onClose} />}
          </ArtifactActions>
        </ArtifactHeader>
        <ArtifactContent className="p-0">
          <div className="relative">
            <CodeBlock code={editedCode} language={language} />
            {isPreviewable && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-3 right-3 gap-1.5 shadow-md"
                onClick={handleOpenEditor}
              >
                <Code2Icon className="size-3.5" />
                Open Live Editor
              </Button>
            )}
          </div>
        </ArtifactContent>
      </Artifact>

      {/* Live Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Live Code Editor - {artifact.title}</DialogTitle>
          </DialogHeader>
          <div className="h-full">
            <AgentCodeSandbox
              code={editedCode}
              language={artifact.language ?? "tsx"}
              title={artifact.title}
              onClose={handleCloseEditor}
              onCodeChange={handleCodeChange}
              editable={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Compact artifact card for inline display
interface AgentArtifactCompactProps {
  artifact: ArtifactData
  onClick?: () => void
}

export function AgentArtifactCompact({
  artifact,
  onClick,
}: AgentArtifactCompactProps) {
  const isPreviewable =
    artifact.type === "code" &&
    PREVIEWABLE_LANGUAGES.includes(artifact.language?.toLowerCase() ?? "")

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Code2Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{artifact.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {artifact.language ?? artifact.type} •{" "}
          {artifact.content.split("\n").length} lines
        </p>
      </div>
      {isPreviewable && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <PlayIcon className="size-3" />
          Preview
        </div>
      )}
      <MaximizeIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

// Floating action button for quick access to editor
interface ArtifactEditorFABProps {
  artifact: ArtifactData
  onCodeChange?: (newCode: string) => void
}

export function ArtifactEditorFAB({
  artifact,
  onCodeChange,
}: ArtifactEditorFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [code, setCode] = useState(artifact.content)

  const isPreviewable =
    artifact.type === "code" &&
    PREVIEWABLE_LANGUAGES.includes(artifact.language?.toLowerCase() ?? "")

  if (!isPreviewable) {return null}

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    onCodeChange?.(newCode)
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 z-50 size-12 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <PlayIcon className="size-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Live Code Editor</DialogTitle>
          </DialogHeader>
          <div className="h-full">
            <AgentCodeSandbox
              code={code}
              language={artifact.language ?? "tsx"}
              title={artifact.title}
              onClose={() => setIsOpen(false)}
              onCodeChange={handleCodeChange}
              editable={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
