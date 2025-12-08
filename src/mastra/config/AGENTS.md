<!-- AGENTS-META {"title":"Mastra Config","version":"2.2.1","last_updated":"2025-12-08T00:00:00Z","applies_to":"/src/mastra/config","tags":["layer:backend","domain:infra","type:config","status":"stable"],"status":"stable"} -->

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
| `google.ts`         | Google AI model provider client setup     | Gemini models: Flash, Pro, Flash Lite, Image, Embedding |
| `openai.ts`         | OpenAI model provider client setup        | GPT-4, GPT-4o, GPT-5 series with reasoning      |
| `anthropic.ts`      | Anthropic model provider client setup     | Claude 3.5/4.0/4.5 series                       |
| `gemini-cli.ts`     | Gemini CLI provider setup                 | Local development with OAuth/API key auth       |
| `github-copilot.ts` | GitHub Copilot provider setup             | OpenAI-compatible interface for Copilot models  |
| `openrouter.ts`     | OpenRouter model provider client setup    | Routes to 50+ models from various providers     |
| `vertex.ts`         | Google Vertex AI model provider setup     | Google Cloud-based models                       |
| `pg-storage.ts`     | PostgreSQL storage & vector client config | **CRITICAL**: PgVector for embeddings, memory, threads |
| `mongodb.ts`        | MongoDB database configuration            | Alternative document storage                    |
| `upstash.ts`        | Upstash Redis configuration               | Caching and session storage                     |
| `upstashMemory.ts`  | Upstash Redis memory configuration        | Alternative memory provider                     |
| `logger.ts`         | Structured logging (Pino)                 | Standard log helpers & transports               |
| `tracing.ts`        | Distributed tracing configuration         | Performance monitoring and debugging           |
| `processors.ts`     | Data processors configuration             | Processing pipelines                            |
| `role-hierarchy.ts` | Supabase RBAC inheritance model         | JWT-based auth with RLS policies, subscription tiers |
| `README.md`         | Configuration documentation              | Setup guides and usage examples                |
| `AGENTS.md`         | This documentation file                   | Directory overview and responsibilities         |

## Vector Storage Providers

Located in `vector/` subdirectory:

| File         | Provider          | Notes                          |
| ------------ | ----------------- | ------------------------------ |
| `astra.ts`   | DataStax Astra    | Cassandra-based vector DB      |
| `chroma.ts`  | Chroma            | Open-source vector database    |
| `pinecone.ts`| Pinecone          | Managed vector database        |
| `qdrant.ts`  | Qdrant            | High-performance vector search |
| `lance.ts`   | LanceDB           | Embedded vector database       |
| `opensearch.ts`| OpenSearch       | Search engine with vectors     |
| `cloudflare.ts`| Cloudflare D1    | Serverless vector storage      |
| `couchbase.ts`| Couchbase        | Multi-model database           |
| `s3vectors.ts`| AWS S3           | Object storage vectors         |
| `registry.ts`| Model Registry    | Model versioning and storage   |

## Model Providers

| Provider       | Models Available                          | Env Variable                          | Notes |
| -------------- | ----------------------------------------- | ------------------------------------- | ----- |
| Google AI      | Gemini 2.5/3.0 Flash, Pro, Flash Lite, Image, Embedding | `GOOGLE_GENERATIVE_AI_API_KEY`        | Primary provider with image generation |
| OpenAI         | GPT-4, GPT-4o, GPT-5 series               | `OPENAI_API_KEY`                      | Standard GPT models with reasoning |
| Anthropic      | Claude 3.5/4.0/4.5 Sonnet, Opus, Haiku    | `ANTHROPIC_API_KEY`                   | Advanced reasoning models |
| GitHub Copilot | GPT-4, Claude, Gemini, Grok models        | `COPILOT_TOKEN`                       | OpenAI-compatible interface |
| OpenRouter     | 50+ models from various providers         | `OPENROUTER_API_KEY`                  | Model routing gateway |
| Gemini CLI     | Local Gemini models with CLI integration  | `GOOGLE_GENERATIVE_AI_API_KEY` or OAuth | Development and testing |
| Vertex AI      | Google Cloud hosted models                | GCP credentials                       | Enterprise Google models |
| AI Gateway     | Unified access to 20+ providers           | `AI_GATEWAY_API_KEY`                  | Vercel AI Gateway with OIDC support |

## Supabase Integration

The configuration system is designed to work seamlessly with Supabase authentication and authorization:

- **JWT-based Auth**: Compatible with Supabase's JSON Web Token system
- **Row Level Security (RLS)**: Role hierarchy integrates with database-level access control
- **User Metadata**: Roles can be stored in `auth.users.raw_user_meta_data`
- **Policy Helpers**: Pre-configured RLS policies for different access levels

### Supported Supabase Roles

- `anon` - Public/unauthenticated access
- `authenticated` - Logged-in users
- `admin` - Administrative access
- `service_role` - Backend service operations
- Subscription tiers: `free`, `pro`, `enterprise`

## Required Environment Variables

```env
# Database (Required)
SUPABASE=postgres://user:password@localhost:5432/mastra
DB_SCHEMA=mastra

# Database (Optional - Performance Tuning)
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# Memory Configuration (Optional)
MEMORY_LAST_MESSAGES=500
SEMANTIC_TOP_K=5
SEMANTIC_RANGE_BEFORE=3
SEMANTIC_RANGE_AFTER=2
LISTS=3072

# RAG Configuration (Optional)
GRAPH_THRESHOLD=0.7
GRAPH_RANDOM_WALK_STEPS=10
GRAPH_RESTART_PROB=0.15
PG_MIN_SCORE=0.7
PG_EF=100

# Embedding Configuration (Optional)
EMBEDDING_MAX_RETRIES=3

# Model Providers (at least one required)
GOOGLE_GENERATIVE_AI_API_KEY=your-key
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
COPILOT_TOKEN=github-copilot-token
OPENROUTER_API_KEY=sk-or-xxxxx
AI_GATEWAY_API_KEY=your-gateway-key

# Gemini CLI (Optional - for local development)
GEMINI_OAUTH_CACHE=/path/to/cache

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

# Storage
MONGODB_URI=mongodb://localhost:27017/mastra
UPSTASH_REDIS_URL=rediss://...
UPSTASH_REDIS_TOKEN=xxxxx
```

## Change Log

| Version | Date (UTC) | Change                                                  |
| ------- | ---------- | ------------------------------------------------------- |
| 2.3.0   | 2025-12-08 | Added AI Gateway provider for unified multi-provider access |
| 2.2.1   | 2025-12-08 | Fixed database environment variables (SUPABASE instead of PG_CONNECTION) |
| 2.1.0   | 2025-12-08 | Added GitHub Copilot, updated all providers, comprehensive model coverage |
| 2.0.0   | 2025-11-26 | Major update: added all providers, env vars documented  |
| 1.2.0   | 2025-10-15 | Enhanced pg-storage.ts description                      |
| 1.1.0   | 2025-10-08 | Verified content accuracy and updated metadata.         |
| 1.0.0   | 2025-09-24 | Standardized template applied                           |
