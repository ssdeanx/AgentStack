"use client"

import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/src/components/ai-elements/sources"
import type { Source as SourceType } from "@/app/chat/providers/chat-context-types"
import { ExternalLinkIcon } from "lucide-react"
import { useMemo } from "react"
import type { AgentSourcesProps } from "./chat.types"

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

function getFavicon(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ""
  }
}

export function AgentSources({
  sources,
  className,
  maxVisible = 10,
}: AgentSourcesProps) {
  const uniqueSources = useMemo(() => {
    if (sources.length === 0) {
      return []
    }
    const seen = new Set<string>()
    return sources.filter((source) => {
      if (seen.has(source.url)) {return false}
      seen.add(source.url)
      return true
    }).slice(0, maxVisible)
  }, [sources, maxVisible])

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    uniqueSources.forEach((s) => {
      const domain = getDomain(s.url)
      counts[domain] = (counts[domain] || 0) + 1
    })
    return counts
  }, [uniqueSources])

  const primaryDomains = Object.entries(domainCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([domain]) => domain)

  return (
    <Sources className={className}>
      <SourcesTrigger count={uniqueSources.length}>
        <span className="text-xs text-muted-foreground truncate max-w-48">
          {primaryDomains.join(", ")}
          {Object.keys(domainCounts).length > 3 && " +more"}
        </span>
      </SourcesTrigger>
      <SourcesContent>
        {uniqueSources.map((source, index) => (
          <Source
            key={`${source.url}-${index}`}
            href={source.url}
            title={source.title || getDomain(source.url)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={getFavicon(source.url)}
                alt=""
                className="size-4 rounded-sm shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
              <span className="truncate flex-1">{source.title || getDomain(source.url)}</span>
              <ExternalLinkIcon className="size-3 shrink-0 opacity-50" />
            </div>
          </Source>
        ))}
      </SourcesContent>
    </Sources>
  )
}
