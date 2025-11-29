"use client"

import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/src/components/ai-elements/sources"
import type { Source as SourceType } from "@/app/chat/providers/chat-context"

export interface AgentSourcesProps {
  sources: SourceType[]
}

export function AgentSources({ sources }: AgentSourcesProps) {
  if (!sources || sources.length === 0) return null

  return (
    <Sources>
      <SourcesTrigger count={sources.length} />
      <SourcesContent>
        {sources.map((source, index) => (
          <Source
            key={`${source.url}-${index}`}
            href={source.url}
            title={source.title}
          />
        ))}
      </SourcesContent>
    </Sources>
  )
}
