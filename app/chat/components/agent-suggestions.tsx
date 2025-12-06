"use client"

import {
  Suggestions,
  Suggestion,
} from "@/src/components/ai-elements/suggestion"

export interface AgentSuggestionsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  disabled?: boolean
}

export function AgentSuggestions({
  suggestions,
  onSelect,
  disabled = false,
}: AgentSuggestionsProps) {
  if (suggestions.length === 0) {return null}

  return (
    <Suggestions className="py-2">
      {suggestions.map((suggestion) => (
        <Suggestion
          key={suggestion}
          suggestion={suggestion}
          onClick={onSelect}
          disabled={disabled}
        />
      ))}
    </Suggestions>
  )
}

export const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  weatherAgent: [
    "What's the weather in Tokyo?",
    "Will it rain tomorrow in NYC?",
    "Weather forecast for London this week",
  ],
  researchAgent: [
    "Research the latest AI trends",
    "Find papers on transformer architecture",
    "Summarize recent developments in quantum computing",
  ],
  stockAnalysisAgent: [
    "Analyze AAPL stock performance",
    "Compare TSLA vs RIVN",
    "What are the top tech stocks today?",
  ],
  copywriterAgent: [
    "Write a product description for a smart watch",
    "Create a tagline for a coffee brand",
    "Draft an email subject line for a sale",
  ],
  dataIngestionAgent: [
    "Parse this CSV data",
    "Validate data structure",
    "Import from JSON format",
  ],
  documentProcessingAgent: [
    "Convert PDF to markdown",
    "Extract text from this document",
    "Chunk this content for RAG",
  ],
  default: [
    "What can you help me with?",
    "Tell me about your capabilities",
    "Show me an example",
  ],
}

export function getSuggestionsForAgent(agentId: string): string[] {
  return DEFAULT_SUGGESTIONS[agentId] || DEFAULT_SUGGESTIONS.default
}
