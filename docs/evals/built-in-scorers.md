# Built-in Scorers

Mastra includes a set of ready-to-use scorers for common evaluation categories.

## Accuracy & reliability

- answer-relevancy — how well responses address the query (0-1)
- answer-similarity — compares outputs vs ground-truth (CI-friendly)
- faithfulness — measures representation of provided context
- hallucination — detects unsupported claims (lower is better)
- completeness — checks for required information
- content-similarity — character-level similarity
- textual-difference — textual difference metric
- tool-call-accuracy — whether the correct tool was used
- prompt-alignment — alignment to user prompt intent (0-1)

## Context quality

- context-precision — IR-style precision (MAP-like)
- context-relevance — nuanced relevance and usage tracking

## Output quality

- tone-consistency — style/formality consistency
- toxicity — detects harmful content
- bias — detects bias in output
- keyword-coverage — coverage of expected terms

Use these built-in scorers directly from `@mastra/evals/scorers/prebuilt`.

*Source: Mastra docs — evals/built-in-scorers.mdx*