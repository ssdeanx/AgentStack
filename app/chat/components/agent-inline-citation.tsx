"use client"

import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselHeader,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationCarouselIndex,
  InlineCitationSource,
  InlineCitationQuote,
} from "@/src/components/ai-elements/inline-citation"
import type { ReactNode } from "react"

export interface Citation {
  id: string
  number: string
  title: string
  url: string
  description?: string
  quote?: string
}

interface AgentInlineCitationProps {
  citations: Citation[]
  text: string
}

export function AgentInlineCitation({ citations, text }: AgentInlineCitationProps) {
  const citation = citations[0]
  if (!citation) return <span>{text}</span>

  return (
    <InlineCitation>
      <InlineCitationText>{text}</InlineCitationText>
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={citations.map((c) => c.url)} />
        <InlineCitationCardBody>
          <InlineCitationCarousel>
            <InlineCitationCarouselHeader>
              <InlineCitationCarouselPrev />
              <InlineCitationCarouselNext />
              <InlineCitationCarouselIndex />
            </InlineCitationCarouselHeader>
            <InlineCitationCarouselContent>
              {citations.map((c) => (
                <InlineCitationCarouselItem key={c.id}>
                  <InlineCitationSource
                    title={c.title}
                    url={c.url}
                    description={c.description}
                  />
                  {c.quote && (
                    <InlineCitationQuote>{c.quote}</InlineCitationQuote>
                  )}
                </InlineCitationCarouselItem>
              ))}
            </InlineCitationCarouselContent>
          </InlineCitationCarousel>
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  )
}

export function parseInlineCitations(
  content: string,
  sources: { url: string; title: string }[]
): ReactNode[] {
  if (!sources.length) return [content]

  const parts: ReactNode[] = []
  const citationRegex = /\[(\d+)\]/g
  let lastIndex = 0
  let match

  while ((match = citationRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    const citationNumber = match[1]
    const sourceIndex = parseInt(citationNumber, 10) - 1
    const source = sources[sourceIndex]

    if (source) {
      parts.push(
        <AgentInlineCitation
          key={`citation-${match.index}`}
          text={match[0]}
          citations={[
            {
              id: `cite-${sourceIndex}`,
              number: citationNumber,
              title: source.title,
              url: source.url,
            },
          ]}
        />
      )
    } else {
      parts.push(match[0])
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length ? parts : [content]
}
