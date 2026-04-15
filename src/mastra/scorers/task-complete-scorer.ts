import { createScorer } from '@mastra/core/evals'

export const taskCompleteScorer = createScorer({
  id: 'task-complete',
  name: 'Task Completeness',
  description: 'Checks if the research and writing task has been fully completed',
}).generateScore(async context => {
  const text = (context.run.output || '').toString()

  // Check if response contains required elements
  const hasSubstantialContent = text.length > 500
  const hasStructure = text.includes('\n\n') // Multiple paragraphs
  const hasContext = /\d{4}/.test(text) // Contains years/dates

  // Return 1 if complete, 0 if not
  if (hasSubstantialContent && hasStructure && hasContext) {
    return 1
  }

  return 0
})