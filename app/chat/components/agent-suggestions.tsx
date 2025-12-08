"use client"

import {
  Suggestions,
  Suggestion,
} from "@/src/components/ai-elements/suggestion"
import { cn } from "@/lib/utils"

export interface AgentSuggestionsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  disabled?: boolean
  className?: string
}

export function AgentSuggestions({
  suggestions,
  onSelect,
  disabled = false,
  className,
}: AgentSuggestionsProps) {
  if (suggestions.length === 0) {return null}

  return (
    <Suggestions className={cn("py-2", className)}>
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
    "Best outdoor activities for today in LA?",
  ],
  researchAgent: [
    "Research the latest AI developments",
    "Find papers on transformer architecture",
    "Summarize recent breakthroughs in quantum computing",
  ],
  stockAnalysisAgent: [
    "Analyze AAPL stock performance",
    "Compare TSLA vs RIVN fundamentals",
    "What are the top performing tech stocks?",
  ],
  reportAgent: [
    "Generate a research summary report",
    "Create an executive summary",
    "Synthesize findings into a report",
  ],
  copywriterAgent: [
    "Write a product description for a smart watch",
    "Create a tagline for a coffee brand",
    "Draft email copy for a product launch",
  ],
  editorAgent: [
    "Review and improve this text",
    "Check grammar and style",
    "Make this more concise",
  ],
  dataIngestionAgent: [
    "Parse this CSV data",
    "Validate data structure",
    "Import from JSON format",
  ],
  dataTransformationAgent: [
    "Transform this data format",
    "Normalize the data structure",
    "Convert between formats",
  ],
  documentProcessingAgent: [
    "Convert PDF to markdown",
    "Extract text from this document",
    "Chunk this content for RAG",
  ],
  researchPaperAgent: [
    "Find papers on machine learning",
    "Search arXiv for recent publications",
    "Download and parse research paper",
  ],
  calendarAgent: [
    "What meetings do I have today?",
    "Schedule a meeting for tomorrow",
    "Find available time slots",
  ],
  codeArchitectAgent: [
    "Design the system architecture",
    "Plan the component structure",
    "Review the codebase organization",
  ],
  codeReviewerAgent: [
    "Review this code for issues",
    "Check for security vulnerabilities",
    "Suggest improvements",
  ],
  imageAgent: [
    "Generate an image of a sunset",
    "Create a logo design",
    "Visualize this concept",
  ],
  sqlAgent: [
    "Query the database",
    "Generate SQL for this request",
    "Explain this query",
  ],
  default: [
    "What can you help me with?",
    "Tell me about your capabilities",
    "Show me an example",
  ],
}

export function getSuggestionsForAgent(agentId: string): string[] {
  return DEFAULT_SUGGESTIONS[agentId] ?? DEFAULT_SUGGESTIONS.default
}
