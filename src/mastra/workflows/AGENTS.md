<!-- AGENTS-META {"title":"Mastra Workflows","version":"2.0.0","applies_to":"/src/mastra/workflows","last_updated":"2025-11-26T00:00:00Z","status":"stable"} -->

# Workflows (`/src/mastra/workflows`)

## Persona

Workflow Engineer — objective: Orchestrate tools and agents into reliable, testable multi-step processes.

## Purpose

Workflows orchestrate agents and tools into multi-step scenarios (e.g., data ingestion → indexing → RAG retrieval → evaluation) and implement long-running or stateful operations where necessary.

## Key Files (10 Workflows)

| File                              | Export                      | Purpose                                                                             | Features                                    |
| --------------------------------- | --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| `weather-workflow.ts`             | `weatherWorkflow`           | Multi-step weather forecast with activity planning                                  | Basic sequential workflow                   |
| `content-studio-workflow.ts`      | `contentStudioWorkflow`     | Orchestrates content creation using research, strategy, and scripting agents        | Agent coordination                          |
| `content-review-workflow.ts`      | `contentReviewWorkflow`     | Content creation with iterative quality review                                      | `.dowhile()` loop for refinement            |
| `document-processing-workflow.ts` | `documentProcessingWorkflow`| Full document ingestion: load → convert → chunk → index                             | `.branch()` for conditional PDF handling    |
| `financial-report-workflow.ts`    | `financialReportWorkflow`   | Multi-source financial reports with parallel data fetching from Polygon/Finnhub     | `.parallel()` for concurrent API calls      |
| `learning-extraction-workflow.ts` | `learningExtractionWorkflow`| Extract learnings from content with human-in-the-loop approval                      | `suspend()`/`resume()` for human approval   |
| `research-synthesis-workflow.ts`  | `researchSynthesisWorkflow` | Multi-topic research with synthesis across topics                                   | `.foreach()` for concurrent topic research  |
| `stock-analysis-workflow.ts`      | `stockAnalysisWorkflow`     | Sequential stock analysis with data enrichment at each step                         | Sequential with API integrations            |
| `changelog.ts`                    | `changelogWorkflow`         | Generate changelogs from git diffs using AI                                         | Git integration, Slack notification         |
| `telephone-game.ts`               | `telephoneGameWorkflow`     | Interactive telephone game demonstrating user input workflows                       | User prompts, sequential steps              |

## Workflow Patterns Demonstrated

- **Sequential (`.then()`)**: weatherWorkflow, stockAnalysisWorkflow, changelogWorkflow
- **Parallel (`.parallel()`)**: financialReportWorkflow
- **Conditional Branch (`.branch()`)**: documentProcessingWorkflow
- **Loop (`.dowhile()`)**: contentReviewWorkflow
- **Iteration (`.foreach()`)**: researchSynthesisWorkflow
- **Human-in-the-Loop (`suspend()`/`resume()`)**: learningExtractionWorkflow

## How to add a workflow

1. Define the workflow using Mastra DSL patterns (see existing workflows).
2. Use tools and agents as building blocks; prefer composition over duplication.
3. Add tests and, where appropriate, add e2e test harnesses to validate integrations.
4. Register in `src/mastra/index.ts` workflows object.

## Agents and Tools events Workflows

```ts
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { weatherAgent } from "../agents/weather-agent";

const analyzeWeatherWithAgent = createStep({
  id: "analyze-weather",
  description:
    "Use an agent to analyze weather conditions and provide insights",
  inputSchema: z.object({
    location: z.string().describe("The location to analyze weather for"),
  }),
  outputSchema: z.object({
    analysis: z.string().describe("Weather analysis from the agent"),
    location: z.string(),
  }),
  execute: async ({ inputData, writer }) => {
    // Pipe the agent's stream to the step writer to enable text chunk streaming
    const response = await weatherAgent.stream(
      `Analyze the weather conditions in ${inputData.location} and provide detailed insights about temperature, conditions, and recommendations for outdoor activities.`,
    );

    await response.fullStream.pipeTo(writer);

    return {
      analysis: await response.text,
      location: inputData.location,
    };
  },
});

const calculateComfortScore = createStep({
  id: "calculate-comfort",
  description: "Calculate a comfort score based on the weather analysis",
  inputSchema: z.object({
    analysis: z.string(),
    location: z.string(),
  }),
  outputSchema: z.object({
    comfortScore: z.number().describe("Comfort score from 0-100"),
    summary: z.string(),
    location: z.string(),
  }),
  execute: async ({ inputData }) => {
    // Simple calculation based on analysis length and keywords
    const analysis = inputData.analysis.toLowerCase();
    let score = 50; // Base score

    // Adjust score based on positive keywords
    if (analysis.includes("sunny") || analysis.includes("clear")) score += 20;
    if (analysis.includes("warm") || analysis.includes("comfortable"))
      score += 15;
    if (analysis.includes("cool") || analysis.includes("pleasant")) score += 10;

    // Adjust score based on negative keywords
    if (analysis.includes("rain") || analysis.includes("storm")) score -= 20;
    if (analysis.includes("hot") || analysis.includes("humid")) score -= 15;
    if (analysis.includes("cold") || analysis.includes("freezing")) score -= 15;

    // Keep score within bounds
    score = Math.max(0, Math.min(100, score));

    const summary = `Based on the weather analysis for ${inputData.location}, the comfort score is ${score}/100. ${
      score >= 70
        ? "Great conditions for outdoor activities!"
        : score >= 40
          ? "Decent weather, but consider the conditions."
          : "Not ideal weather conditions today."
    }`;

    return {
      comfortScore: score,
      summary,
      location: inputData.location,
    };
  },
});

export const agentTextStreamWorkflow = createWorkflow({
  id: "agent-text-stream-workflow",
  description:
    "A workflow that uses an agent to analyze weather with text streaming, then calculates a comfort score",
  inputSchema: z.object({
    location: z.string().describe("The location to analyze weather for"),
  }),
  outputSchema: z.object({
    comfortScore: z.number(),
    summary: z.string(),
    location: z.string(),
  }),
})
  .then(analyzeWeatherWithAgent)
  .then(calculateComfortScore);

agentTextStreamWorkflow.commit();
```

```ts
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

// Step 1: Validate order
const validateOrder = createStep({
  id: "validate-order",
  description: "Validate the order details",
  inputSchema: z.object({
    orderId: z.string(),
    orderType: z.enum(["standard", "express"]),
    amount: z.number(),
  }),
  outputSchema: z.object({
    orderId: z.string(),
    orderType: z.enum(["standard", "express"]),
    amount: z.number(),
    isValid: z.boolean(),
  }),
  execute: async ({ inputData, writer }) => {
    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "in-progress",
        message: `Validating order ${inputData.orderId}...`,
        stage: "validation",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "done",
        message: `Order validated successfully`,
        stage: "validation",
      },
    });
    try {
      if (inputData.orderType === "standard" && inputData.amount < 50) {
        throw new Error("Standard orders must be at least $50");
      }
      if (inputData.orderType === "express" && inputData.amount < 100) {
        throw new Error("Express orders must be at least $100");
      }
    } catch (error) {
      await writer?.custom({
        type: 'data-tool-progress',
        data: {
          status: "error",
          message: error instanceof Error ? error.message : 'Unknown error',
          stage: "validation",
        },
        id: "validation",
      });
      throw error;
    }
    return {
      ...inputData,
      isValid: true,
    };
  },
});

// Nested Workflow 1: Standard Processing
const standardProcessStep = createStep({
  id: "standard-process",
  description: "Process standard order",
  inputSchema: z.object({
    orderId: z.string(),
    orderType: z.enum(["standard", "express"]),
    amount: z.number(),
    isValid: z.boolean(),
  }),
  outputSchema: z.object({
    orderId: z.string(),
    processingTime: z.string(),
    shippingMethod: z.string(),
  }),
  execute: async ({ inputData, writer }) => {
    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "in-progress",
        message: `Processing standard order ${inputData.orderId}...`,
        stage: "standard-processing",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "in-progress",
        message: `Preparing standard shipping (5-7 business days)...`,
        stage: "standard-processing",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "done",
        message: `Standard order processed successfully`,
        stage: "standard-processing",
      },
    });

    return {
      orderId: inputData.orderId,
      processingTime: "5-7 business days",
      shippingMethod: "Standard Ground",
    };
  },
});

const standardWorkflow = createWorkflow({
  id: "standard-shipping-workflow",
  description: "Workflow for standard shipping orders",
  inputSchema: z.object({
    orderId: z.string(),
    orderType: z.enum(["standard", "express"]),
    amount: z.number(),
    isValid: z.boolean(),
  }),
  outputSchema: z.object({
    orderId: z.string(),
    processingTime: z.string(),
    shippingMethod: z.string(),
  }),
}).then(standardProcessStep);

standardWorkflow.commit();

// Nested Workflow 2: Express Processing
const expressProcessStep = createStep({
  id: "express-process",
  description: "Process express order",
  inputSchema: z.object({
    orderId: z.string(),
    orderType: z.enum(["standard", "express"]),
    amount: z.number(),
    isValid: z.boolean(),
  }),
  outputSchema: z.object({
    orderId: z.string(),
    processingTime: z.string(),
    shippingMethod: z.string(),
  }),
  execute: async ({ inputData, writer }) => {
    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "in-progress",
        message: `Processing express order ${inputData.orderId}...`,
        stage: "express-processing",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "in-progress",
        message: `Priority handling activated...`,
        stage: "express-processing",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "in-progress",
        message: `Preparing express shipping (1-2 business days)...`,
        stage: "express-processing",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await writer?.custom({
      type: "data-tool-progress",
      data: {
        status: "done",
        message: `Express order processed successfully`,
        stage: "express-processing",
      },
    });

    return {
      orderId: inputData.orderId,
      processingTime: "1-2 business days",
      shippingMethod: "Express Overnight",
    };
  },
});

const expressWorkflow = createWorkflow({
  id: "express-shipping-workflow",
  description: "Workflow for express shipping orders",
  inputSchema: z.object({
    orderId: z.string(),
    orderType: z.enum(["standard", "express"]),
    amount: z.number(),
    isValid: z.boolean(),
  }),
  outputSchema: z.object({
    orderId: z.string(),
    processingTime: z.string(),
    shippingMethod: z.string(),
  }),
}).then(expressProcessStep);

expressWorkflow.commit();

// Main branching workflow
export const branchingWorkflow = createWorkflow({
  id: "branching-workflow",
  description:
    "A workflow that branches based on order type to different processing workflows",
  inputSchema: z.object({
    orderId: z.string().describe("The order ID"),
    orderType: z
      .enum(["standard", "express"])
      .describe("Type of shipping: standard or express"),
    amount: z.number().describe("The order amount"),
  }),
  outputSchema: z.object({
    orderId: z.string(),
    processingTime: z.string(),
    shippingMethod: z.string(),
  }),
})
  .then(validateOrder)
  .branch([
    [
      async ({ inputData }) => inputData.orderType === "standard",
      standardWorkflow,
    ],
    [
      async ({ inputData }) => inputData.orderType === "express",
      expressWorkflow,
    ],
  ]);

branchingWorkflow.commit();
```

# Sequence Diagram

```mermaid

```

---
## Change Log

| Version | Date (UTC) | Changes                                                                      |
| ------- | ---------- | ---------------------------------------------------------------------------- |
| 2.0.0   | 2025-11-26 | Major update: 10 workflows documented with pattern examples and API routes.  |
| 1.1.0   | 2025-11-19 | Added Content Studio workflow.                                               |
| 1.0.0   | 2025-11-14 | Initial version.                                                             |
