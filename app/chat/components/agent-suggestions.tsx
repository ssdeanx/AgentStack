"use client"

import {
  Suggestions,
  Suggestion,
} from "@/src/components/ai-elements/suggestion"
import { cn } from "@/lib/utils"
import type { AgentSuggestionsProps } from "./chat.types"

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
