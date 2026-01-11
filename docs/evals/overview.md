# Scorers overview

While traditional software tests have clear pass/fail conditions, AI outputs are non-deterministic — they can vary with the same input. **Scorers** help bridge this gap by providing quantifiable metrics for measuring agent quality.

Scorers are automated tests that evaluate Agents outputs using model-graded, rule-based, and statistical methods. Scorers return **scores**: numerical values (typically between 0 and 1) that quantify how well an output meets your evaluation criteria. These scores enable you to objectively track performance, compare different approaches, and identify areas for improvement in your AI systems. Scorers can be customized with your own prompts and scoring functions.

Scorers can be run in the cloud, capturing real-time results. But scorers can also be part of your CI/CD pipeline, allowing you to test and monitor your agents over time.

## Types of Scorers

- Textual Scorers — Evaluate accuracy, reliability, and context understanding
- Classification Scorers — Measure accuracy in categorizing data
- Prompt Engineering Scorers — Explore impact of different instructions and input formats

## Installation

```bash
npm install @mastra/evals@beta
```

## Live evaluations

Live evaluations run asynchronously alongside agents/workflows and optionally persist results for analysis. You can attach scorers to agents, to workflow steps, or run scorers against historical traces.

See also: docs/v1/evals/custom-scorers, docs/v1/evals/built-in-scorers

---

*Source: Mastra docs — evals/overview.mdx*