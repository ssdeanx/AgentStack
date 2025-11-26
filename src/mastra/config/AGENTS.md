<!-- AGENTS-META {"title":"Mastra Config","version":"2.0.0","last_updated":"2025-11-26T00:00:00Z","applies_to":"/src/mastra/config","tags":["layer:backend","domain:infra","type:config","status":"stable"],"status":"stable"} -->

# Config Directory (`/src/mastra/config`)

## Persona

**Name:** DevOps & Cloud Engineer
**Role Objective:** Centralize secure initialization of external services (models, vector store, databases, logging, role hierarchy) with environment-driven configuration.

## Purpose

Establish consistent, testable, and secure entry points for all external dependencies consumed by Mastra agents, tools, and workflows.

## Key Files

| File                | Responsibility                            | Notes                                           |
| ------------------- | ----------------------------------------- | ----------------------------------------------- |
| `index.ts`          | Main exports for all config modules       | Aggregates all providers                        |
| `google.ts`         | Google AI model provider client setup     | `googleAI`, `googleAI3`, `googleAIFlashLite`    |
| `openai.ts`         | OpenAI model provider client setup        | API keys pulled from env                        |
| `anthropic.ts`      | Anthropic model provider client setup     | API keys pulled from env                        |
| `gemini-cli.ts`     | Gemini CLI provider setup                 | For local development and testing               |
| `openrouter.ts`     | OpenRouter model provider client setup    | For routing to various models                   |
| `vertex.ts`         | Google Vertex AI model provider setup     | For Google Cloud-based models                   |
| `pg-storage.ts`     | PostgreSQL storage & vector client config | **CRITICAL**: PgVector for 3072D embeddings, semantic recall, memory, threads |
| `upstashMemory.ts`  | Upstash Redis memory configuration        | Alternative memory provider                     |
| `logger.ts`         | Structured logging (Pino)                 | Standard log helpers & transports               |
| `processors.ts`     | Data processors configuration             | Processing pipelines                            |
| `role-hierarchy.ts` | RBAC inheritance model                    | Drives policy & access filters                  |

## Model Providers

| Provider    | Models Available                    | Env Variable                          |
| ----------- | ----------------------------------- | ------------------------------------- |
| Google AI   | Gemini 2.5 Flash, Pro, Flash Lite   | `GOOGLE_GENERATIVE_AI_API_KEY`        |
| OpenAI      | GPT-4, GPT-4o, GPT-3.5              | `OPENAI_API_KEY`                      |
| Anthropic   | Claude 3.5 Sonnet, Opus, Haiku      | `ANTHROPIC_API_KEY`                   |
| OpenRouter  | Multiple models via routing         | `OPENROUTER_API_KEY`                  |
| Vertex AI   | Google Cloud models                 | GCP credentials                       |

## Required Environment Variables

```env
# Database (Required)
PG_CONNECTION=postgres://user:password@localhost:5432/mastra

# Model Providers (at least one required)
GOOGLE_GENERATIVE_AI_API_KEY=your-key
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Financial APIs (for financial tools)
POLYGON_API_KEY=xxxxx
FINNHUB_API_KEY=xxxxx
ALPHA_VANTAGE_API_KEY=xxxxx

# Search APIs
SERPAPI_API_KEY=xxxxx

# Observability
PHOENIX_ENDPOINT=https://...
PHOENIX_API_KEY=xxxxx
PHOENIX_PROJECT_NAME=mastra
```

## Change Log

| Version | Date (UTC) | Change                                                  |
| ------- | ---------- | ------------------------------------------------------- |
| 2.0.0   | 2025-11-26 | Major update: added all providers, env vars documented  |
| 1.2.0   | 2025-10-15 | Enhanced pg-storage.ts description                      |
| 1.1.0   | 2025-10-08 | Verified content accuracy and updated metadata.         |
| 1.0.0   | 2025-09-24 | Standardized template applied                           |
