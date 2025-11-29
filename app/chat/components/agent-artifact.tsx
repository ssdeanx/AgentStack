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
import { CopyIcon, DownloadIcon } from "lucide-react"
import { useCallback } from "react"
import { BundledLanguage } from "shiki"

export interface ArtifactData {
  id: string
  title: string
  description?: string
  type: "code" | "markdown" | "json" | "text"
  language?: string
  content: string
}

export interface AgentArtifactProps {
  artifact: ArtifactData
  onClose?: () => void
}

export function AgentArtifact({ artifact, onClose }: AgentArtifactProps) {
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(artifact.content)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [artifact.content])

  const handleDownload = useCallback(() => {
    const extensions: Record<string, string> = {
      code: artifact.language || "txt",
      markdown: "md",
      json: "json",
      text: "txt",
    }
    const ext = extensions[artifact.type] || "txt"
    const filename = `${artifact.title.toLowerCase().replace(/\s+/g, "-")}.${ext}`

    const blob = new Blob([artifact.content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [artifact])

  const language: BundledLanguage = (artifact.language || (artifact.type === "json" ? "json" : "plaintext")) as BundledLanguage

  return (
    <Artifact className="my-4">
      <ArtifactHeader>
        <div className="flex flex-col gap-0.5">
          <ArtifactTitle>{artifact.title}</ArtifactTitle>
          {artifact.description && (
            <ArtifactDescription>{artifact.description}</ArtifactDescription>
          )}
        </div>
        <ArtifactActions>
          <ArtifactAction
            tooltip="Copy"
            icon={CopyIcon}
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
        <CodeBlock code={artifact.content} language={language} />
      </ArtifactContent>
    </Artifact>
  )
}
