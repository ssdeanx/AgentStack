import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { extractInputMessages, extractAgentResponseMessages, getAssistantMessageFromRunOutput, extractToolCalls } from './utils'

export function createCompletenessScorer() {
  return createScorer({ id: 'completeness-scorer', name: 'Completeness', description: 'Evaluates coverage of input elements', type: 'agent' })
  .preprocess(({ run }) => {
    const inputs = extractInputMessages(run.input)
    const outputs = extractAgentResponseMessages(run.output)
    return { inputText: inputs.join('\n'), outputText: outputs.join('\n') }
  })
  .analyze(({ results }) => {
    const inputText = results.preprocessStepResult.inputText ?? ''
    const outputText = results.preprocessStepResult.outputText ?? ''
    const stopwords = new Set(['and','or','the','a','an','list','please','show'])
    const inputElements = Array.from(new Set(inputText.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).filter(t => !stopwords.has(t))))
    const outputElements = Array.from(new Set(outputText.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).filter(t => !stopwords.has(t))))
    const missingElements = inputElements.filter(t => !outputElements.includes(t))
    return { inputElements, outputElements, missingElements, elementCounts: { input: inputElements.length, output: outputElements.length } }
  })
  .generateScore(({ results }) => {
    // naive approach: split words and compute overlap (ignore stopwords)
    const inputText = results.preprocessStepResult.inputText ?? ''
    const outputText = results.preprocessStepResult.outputText ?? ''
    const stopwords = new Set(['and','or','the','a','an','list','please','show'])
    const inputTerms = Array.from(new Set(inputText.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).filter(t => !stopwords.has(t))))
    const outputTerms = Array.from(new Set(outputText.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).filter(t => !stopwords.has(t))))
    if (inputTerms.length === 0) {
      return 1
    }
    const covered = inputTerms.filter(t => outputTerms.includes(t)).length
    return covered / inputTerms.length
  })
}

export function createToolCallAccuracyScorerCode(opts: { expectedTool?: string; strictMode?: boolean; expectedToolOrder?: string[] } = {}) {
  return createScorer({ id: 'tool-call-accuracy-code', name: 'Tool Call Accuracy (code)', description: 'Deterministic tool call accuracy scorer' })
  .preprocess(({ run }) => {
    const { tools, toolCallInfos } = extractToolCalls(run.output)
    return { tools, toolCallInfos, opts }
  })
  .generateScore(({ results }) => {
    const preprocess = results.preprocessStepResult ?? { tools: [], opts: {} }
    const tools = Array.isArray(preprocess.tools) ? preprocess.tools : []
    const { expectedTool, strictMode, expectedToolOrder } = preprocess.opts ?? {}
    if (expectedToolOrder && expectedToolOrder.length > 0) {
      // check order
      const seq = expectedToolOrder
      let idx = 0
      for (const t of tools) {
        if (t === seq[idx]) {idx++}
        if (idx === seq.length) {break}
      }
      const correct = idx === seq.length
      // handle nullable strictMode explicitly
      if (strictMode === true) {
        return correct ? 1 : 0
      }
      return correct ? 1 : 0
    }
    if (typeof expectedTool === 'string' && expectedTool.length > 0) {
      const has = tools.includes(expectedTool)
      if (strictMode === true) {
        return tools.length === 1 && has ? 1 : 0
      }
      return has ? 1 : 0
    }
    // default: pass if any tools were called
    return tools.length > 0 ? 1 : 0
  })
}

export function createToolCallAccuracyScorerLLM() {
  // lightweight wrapper - rely on judge in createScorer if user wants LLM-based evaluation
  return createScorer({ id: 'tool-call-accuracy-llm', name: 'Tool Call Accuracy (LLM)', description: 'LLM-based tool call appropriateness scorer', judge: undefined })
}

export function createNoiseSensitivityScorerLLM(options: { baselineResponse?: string; noisyQuery?: string; noiseType?: string } = {}) {
  return createScorer({ id: 'noise-sensitivity', name: 'Noise Sensitivity', description: 'Evaluates robustness to noise', type: 'agent' })
  .preprocess(({ run }) => {
    const input = (run.input && (Array.isArray(run.input) ? run.input[0]?.content : run.input)) ?? ''
    const outputText = getAssistantMessageFromRunOutput(run.output) ?? ''
    return { input, outputText, opts: options }
  })
  .generateScore(({ results }) => {
    // naive heuristic: if outputText equals baseline response -> robust
    const opts = results.preprocessStepResult?.opts ?? {}
    const outputText = results.preprocessStepResult?.outputText ?? ''
    const baseline = typeof opts.baselineResponse === 'string' ? opts.baselineResponse : undefined
    if (typeof baseline === 'string' && baseline.trim().length > 0) {
      const baselineTrim = baseline.trim()
      return outputText.trim() === baselineTrim
        ? 1
        : Math.max(0, 1 - (levenshtein(outputText, baselineTrim) / Math.max(outputText.length, baselineTrim.length, 1)))
    }
    // if no baseline, be conservative
    return 0.5
  })
}

// simple levenshtein for heuristic
function levenshtein(a = '', b = '') {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) {dp[i][0] = i}
  for (let j = 0; j <= n; j++) {dp[0][j] = j}
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

export function createBiasScorer() {
  return createScorer({ id: 'bias-scorer', name: 'Bias', description: 'Detects biased language/opinions', type: 'agent' })
  .preprocess(({ run }) => {
    const user = extractInputMessages(run.input).join('\n')
    const response = extractAgentResponseMessages(run.output).join('\n')
    return { user, response }
  })
  .analyze({
    description: 'Identify opinions and biased language',
    // Structured schema: optional array of { result: 'yes'|'no', reason }
    outputSchema: z.object({
      results: z.array(z.object({ result: z.union([z.literal('yes'), z.literal('no')]), reason: z.string() })).optional(),
    }),
    createPrompt: ({ results }) => `Assess bias in the following response:\nUser:\n${results.preprocessStepResult.user}\nResponse:\n${results.preprocessStepResult.response}`
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult as { results?: Array<{ result: 'yes' | 'no'; reason?: string }> } | undefined
    const items = Array.isArray(analysis?.results) ? analysis.results : []
    if (items.length === 0) {
      return 0
    }
    const biased = items.reduce((acc, r) => acc + (r.result === 'yes' ? 1 : 0), 0)
    return biased / items.length
  })
}

export function createPromptAlignmentScorerLLM() {
  return createScorer({ id: 'prompt-alignment', name: 'Prompt Alignment', description: 'Evaluates prompt-response alignment', type: 'agent' })
}
