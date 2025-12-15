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
import type { Citation } from "./chat.types"

interface AgentInlineCitationProps {
  citations: Citation[]
  text: string
}

export function AgentInlineCitation({ citations, text }: AgentInlineCitationProps) {
  const citation = citations[0]
  if (!citation) {return <span>{text}</span>}

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
                  {(Boolean(c.quote)) && (
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
