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

// Textual Difference scorer - sequence matching based similarity
export function createTextualDifferenceScorer() {
  return createScorer({ id: 'textual-difference', name: 'Textual Difference', description: 'Measures textual changes required between expected and actual text', type: 'agent' })
  .preprocess(({ run }) => {
    const outputText = getAssistantMessageFromRunOutput(run.output) ?? ''
    const groundTruth = (run as any).groundTruth ?? (Array.isArray(run.input) ? undefined : undefined)
    // groundTruth may be passed via run.groundTruth when using runEvals
    const gt = (run as any).groundTruth ?? undefined
    return { outputText, groundTruth: gt }
  })
  .analyze(({ results }) => {
    const outputText = results.preprocessStepResult.outputText ?? ''
    const groundTruth = results.preprocessStepResult.groundTruth ?? ''
    const maxLen = Math.max(outputText.length, (groundTruth as string).length, 1)
    const distance = levenshtein(outputText, (groundTruth as string))
    const ratio = 1 - distance / maxLen
    const confidence = 1 - Math.abs(outputText.length - (groundTruth as string).length) / Math.max(outputText.length, (groundTruth as string).length, 1)
    return { confidence, ratio, changes: distance, lengthDiff: outputText.length - (groundTruth as string).length }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult || { ratio: 0.0, confidence: 0.0 }
    const ratio = Math.max(0, Math.min(1, analysis.ratio ?? 0))
    const confidence = Math.max(0, Math.min(1, analysis.confidence ?? 0))
    return Math.max(0, Math.min(1, ratio * confidence))
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

export function createToneScorer() {
  // Simple heuristic tone scorer: uses basic sentiment lexicon approach
  const positives = ['good','great','excellent','happy','love','positive','pleased','satisfied','success']
  const negatives = ['bad','poor','terrible','hate','angry','sad','negative','unsatisfied','fail','unhappy','disappointed','frustrated']

  return createScorer({ id: 'tone-consistency', name: 'Tone Consistency', description: 'Evaluates tone consistency and stability', type: 'agent' })
  .preprocess(({ run }) => {
    const inputText = extractInputMessages(run.input).join('\n')
    const outputText = extractAgentResponseMessages(run.output).join('\n')
    return { inputText, outputText }
  })
  .analyze(({ results }) => {
    const inText = (results.preprocessStepResult.inputText ?? '').toLowerCase()
    const outText = (results.preprocessStepResult.outputText ?? '').toLowerCase()
    const inPos = positives.reduce((s, p) => s + (inText.includes(p) ? 1 : 0), 0)
    const inNeg = negatives.reduce((s, p) => s + (inText.includes(p) ? 1 : 0), 0)
    const outPos = positives.reduce((s, p) => s + (outText.includes(p) ? 1 : 0), 0)
    const outNeg = negatives.reduce((s, p) => s + (outText.includes(p) ? 1 : 0), 0)
    const inSent = inPos - inNeg
    const outSent = outPos - outNeg
    const diff = Math.abs(inSent - outSent)
    // normalize to 0-1
    const maxPossible = Math.max(1, Math.abs(inSent) + Math.abs(outSent))
    const score = Math.max(0, 1 - diff / maxPossible)
    return { responseSentiment: outSent, referenceSentiment: inSent, difference: diff, score }
  })
  .generateScore(({ results }) => {
    return results.analyzeStepResult.score
  })
}

export function createContextRelevanceScorerLLM(opts: { penalties?: any; scale?: number; context?: string[]; contextExtractor?: any } = {}) {
  // Lightweight heuristic implementation for local testing
  return createScorer({ id: 'context-relevance', name: 'Context Relevance', description: 'Weighted relevance and usage detection', type: 'agent' })
  .preprocess(({ run }) => {
    const ctx = opts.context ?? []
    const inputText = extractInputMessages(run.input).join('\n')
    const outputText = extractAgentResponseMessages(run.output).join('\n')
    return { ctx, inputText, outputText }
  })
  .analyze(({ results }) => {
    const ctx: string[] = results.preprocessStepResult.ctx ?? []
    const out = (results.preprocessStepResult.outputText ?? '').toLowerCase()
    let baseSum = 0
    const details: Array<{ piece: string; relevance: number; used: boolean }> = []
    for (const piece of ctx) {
      const norm = piece.toLowerCase()
      const used = out.includes(norm)
      // naive relevance: presence implies high relevance; partial overlap yields medium
      const relevance = used ? 1.0 : (out.split(' ').some(w => norm.includes(w)) ? 0.7 : 0.0)
      baseSum += relevance
      details.push({ piece, relevance, used })
    }
    const rCount = ctx.length
    const baseScore = rCount === 0 ? 0 : baseSum / (rCount * 1.0)
    // penalties (naive): unused high relevance pieces penalize score
    const unusedHigh = details.filter(d => d.relevance === 1.0 && !d.used).length
    const missing = details.filter(d => d.relevance === 0.0).length
    const unusedPenalty = (opts.penalties?.unusedHighRelevanceContext ?? 0.1) * unusedHigh
    const missingPenalty = Math.min(opts.penalties?.maxMissingContextPenalty ?? 0.5, (opts.penalties?.missingContextPerItem ?? 0.15) * missing)
    const finalScore = Math.max(0, baseScore - unusedPenalty - missingPenalty) * (opts.scale ?? 1)
    return { baseScore, finalScore, details, unusedHigh, missing }
  })
  .generateScore(({ results }) => results.analyzeStepResult.finalScore)
}

export function createContextPrecisionScorer(opts: { scale?: number; context?: string[]; contextExtractor?: any } = {}) {
  // MAP-based heuristic for local testing
  return createScorer({ id: 'context-precision', name: 'Context Precision (MAP)', description: 'Evaluates retrieval precision and ordering using MAP', type: 'agent' })
  .preprocess(({ run }) => {
    const ctx = opts.context ?? []
    const outputText = extractAgentResponseMessages(run.output).join('\n')
    const gt = (run as any).groundTruth ?? ''
    return { ctx, outputText, groundTruth: gt }
  })
  .analyze(({ results }) => {
    const ctx: string[] = results.preprocessStepResult.ctx ?? []
    const out = (results.preprocessStepResult.outputText ?? '').toLowerCase()

    // Determine relevance per position (binary: relevant if present in output)
    const relevance = ctx.map((c) => out.includes(c.toLowerCase()) ? 1 : 0)
    const R = relevance.reduce((s: number, v: number) => s + v, 0)
    if (R === 0) { return { map: 0, relevance, R } }
    let sumPrec = 0
    let relevantSoFar = 0
    for (let i = 0; i < relevance.length; i++) {
      if (relevance[i] === 1) {
        relevantSoFar++
        sumPrec += relevantSoFar / (i + 1)
      }
    }
    const map = sumPrec / R
    return { map, relevance, R }
  })
  .generateScore(({ results }) => {
    return Math.max(0, Math.min(1, results.analyzeStepResult.map * (opts.scale ?? 1)))
  })
}

export function createPromptAlignmentScorerLLM() {
  return createScorer({ id: 'prompt-alignment', name: 'Prompt Alignment', description: 'Evaluates prompt-response alignment', type: 'agent' })
}
