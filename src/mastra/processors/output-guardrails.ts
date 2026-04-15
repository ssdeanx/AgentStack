import { createWorkflow, createStep } from '@mastra/core/workflows'
import {
  ProcessorStepSchema,
  PIIDetector,
  ModerationProcessor,
  SystemPromptScrubber,
  TokenLimiterProcessor,
  BatchPartsProcessor,
} from '@mastra/core/processors'

export const outputGuardrails = createWorkflow({
  id: 'output-guardrails',
  inputSchema: ProcessorStepSchema,
  outputSchema: ProcessorStepSchema,
  type: 'processor'
})
  // Sequential: limit tokens first, then batch stream chunks
  .then(createStep(new TokenLimiterProcessor({ limit: 256000 })))
  .then(createStep(new BatchPartsProcessor(
    { batchSize: 10, emitOnNonText: false },

  )))
  // Parallel: run independent checks at the same time
  .parallel([
    createStep(
      new PIIDetector({
        strategy: 'redact',
        model: 'openrouter/google/gemma-4-31b-it:free',
      }),
    ),
    createStep(
      new ModerationProcessor({
        strategy: 'block',
        model: 'openrouter/google/gemma-4-31b-it:free',
      }),
    ),
  ])
  // Map to the redact branch to keep its transformed messages
  .map(async ({ inputData }) => {
    return inputData['processor:pii-detector']
  })
  // Sequential: scrubber depends on previous redaction output
  .then(
    createStep(
      new SystemPromptScrubber({
        strategy: 'redact',
        placeholderText: '[REDACTED]',
        model: 'openrouter/google/gemma-4-31b-it:free',
      }),
    ),
  )
  .commit()