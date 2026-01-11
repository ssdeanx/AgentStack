# Tool Call Accuracy Scorers

Mastra provides two tool call accuracy scorers for evaluating whether an LLM selects the correct tools from available options:

1. Code-based scorer - Deterministic evaluation using exact tool matching
2. LLM-based scorer - Semantic evaluation using AI to assess appropriateness

## Code-Based Tool Call Accuracy Scorer

Use `createToolCallAccuracyScorerCode()` from `@mastra/evals/scorers/prebuilt` for deterministic binary scoring (0 or 1). Typical parameters:

- expectedTool: string — The name of the expected tool to be called (ignored when expectedToolOrder is set)
- strictMode: boolean — If true, require exact single tool match (or exact order when expectedToolOrder is used)
- expectedToolOrder: string[] — When provided, validates tool calling sequence

Evaluation modes:
- Single Tool Mode (expectedTool):
  - lenient (strictMode: false): pass if expected tool appears among calls
  - strict (strictMode: true): pass only if exactly one tool was called and it matches
- Order Checking Mode (expectedToolOrder):
  - strict (strictMode: true): tools must match sequence exactly with no extras
  - flexible (strictMode: false): expected sequence must appear in order (extras allowed)

Code-based scorers are fast, deterministic and do not require LLM calls — ideal for CI tests.

## LLM-Based Tool Call Accuracy Scorer

Use `createToolCallAccuracyScorerLLM()` for semantic evaluation when tool appropriateness depends on context. Parameters include:

- model: MastraModelConfig — The LLM to use for judging appropriateness
- availableTools: Array<{ name: string; description: string }> — Tool catalog provided to the judge

Features:
- Semantic evaluation of appropriateness
- Detects missing tools and clarifying behavior
- Produces fractional scores (0.0–1.0) and human-readable reasons

## Examples

- Code-based: Validate that `weather-tool` was called in a weather query (strict or lenient modes)
- LLM-based: Provide a catalog of tools and ask the judge to rate whether the assistant used appropriate tools for the user request

*Source: Mastra docs — reference/v1/evals/tool-call-accuracy*