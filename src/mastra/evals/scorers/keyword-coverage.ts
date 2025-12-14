import { createScorer } from '@mastra/core/evals'

export const keywordCoverageScorer = createScorer({ id: 'keyword-coverage', name: 'Keyword Coverage', description: 'Measures coverage of required keywords in output', type: 'agent' })
.generateScore(({ run }) => {
  const input = (run.input && JSON.stringify(run.input)) || ''
  const output = (run.output && JSON.stringify(run.output)) || ''
  const required = (run.requestContext && (run.requestContext as any).requiredKeywords) ?? []
  if (!required || required.length === 0) {return 1}
  const matched = required.filter((k: string) => output.toLowerCase().includes(k.toLowerCase())).length
  return matched / required.length
})
