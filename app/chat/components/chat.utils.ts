import type { AgentPlanData, ReasoningStep } from "./chat.types"

export function extractPlanFromText(text: string): AgentPlanData | null {
  const planPatterns = [
    /(?:plan|steps|approach|strategy|roadmap|outline)[:\s]*\n((?:[-•\d].+\n?)+)/i,
    /(?:here's|here is|my|the) (?:plan|approach|strategy)[:\s]*\n((?:[-•\d].+\n?)+)/i,
    /(?:i will|let me|first,)[:\s]*((?:[-•\d].+\n?)+)/i,
  ]

  for (const pattern of planPatterns) {
    const match = pattern.exec(text)
    if (match) {
      const stepsText = match[1]
      const steps = stepsText
        .split("\n")
        .map((line) => line.replace(/^[-•\d.]+\s*/, "").trim())
        .filter((line) => line.length > 0)

      if (steps.length >= 2) {
        return {
          title: "Execution Plan",
          description: `${steps.length} steps to complete this task`,
          steps: steps.map((stepText) => ({ text: stepText, completed: false })),
          isStreaming: false,
        }
      }
    }
  }

  return null
}

type StepType = "step" | "search" | "analysis" | "decision"

function categorizeStep(text: string): StepType {
  const lower = text.toLowerCase()
  if (lower.includes("search") || lower.includes("looking for") || lower.includes("finding")) {
    return "search"
  }
  if (lower.includes("analyzing") || lower.includes("examining") || lower.includes("reviewing")) {
    return "analysis"
  }
  if (lower.includes("decided") || lower.includes("conclusion") || lower.includes("therefore")) {
    return "decision"
  }
  return "step"
}

export function parseReasoningToSteps(reasoning: string): ReasoningStep[] {
  if (!reasoning) {return []}

  const lines = reasoning.split("\n").filter((line) => line.trim())
  const steps: ReasoningStep[] = []
  let currentSearchTerms: string[] = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    if (trimmed.length < 5) {return}

    const isBullet = trimmed.startsWith("-") || trimmed.startsWith("•") || /^\d+\./.test(trimmed)
    const content = isBullet
      ? trimmed.replace(/^[-•\d.]+\s*/, "")
      : trimmed

    const searchMatch = /(?:search|looking for|finding)[:\s]+["']?([^"'\n]+)["']?/i.exec(content)
    if (searchMatch) {
      currentSearchTerms.push(searchMatch[1].trim())
    }

    if (content.length > 10) {
      const stepType = categorizeStep(content)
      steps.push({
        id: `step-${index}`,
        label: content.length > 80 ? content.slice(0, 77) + "..." : content,
        description: content.length > 80 ? content : undefined,
        status: "complete",
        searchResults: stepType === "search" ? [...currentSearchTerms] : undefined,
      })

      currentSearchTerms = []
    }
  })

  return steps.slice(0, 15)
}

export type InlineCitationToken =
  | { type: 'text'; text: string }
  | { type: 'citation'; text: string; number: string; title: string; url: string }

export function tokenizeInlineCitations(
  content: string,
  sources: Array<{ url: string; title: string }>
): InlineCitationToken[] {
  if (!sources.length) {return [{ type: 'text', text: content }]}

  const parts: InlineCitationToken[] = []
  const citationRegex = /\[(\d+)\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = citationRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) })
    }

    const citationNumber = match[1]
    const sourceIndex = parseInt(citationNumber, 10) - 1
    const source = sources[sourceIndex]

    if (source !== undefined) {
      parts.push({
        type: 'citation',
        text: match[0],
        number: citationNumber,
        title: source.title,
        url: source.url,
      })
    } else {
      parts.push({ type: 'text', text: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) })
  }

  return parts.length ? parts : [{ type: 'text', text: content }]
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
