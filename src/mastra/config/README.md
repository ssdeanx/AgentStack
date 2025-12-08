# Mastra Configuration System

A comprehensive, production-ready configuration system for Mastra that centralizes AI model providers, database storage, authentication, and role-based access control.

## 🏗️ Architecture Overview

The config system follows a modular architecture with clear separation of concerns:

- **Model Providers** - AI model integrations (Google, OpenAI, Anthropic, etc.)
- **Vector Storage** - Multiple vector database backends for embeddings
- **Database Storage** - PostgreSQL with PgVector for persistent storage
- **Authentication** - Supabase-compatible role hierarchy and permissions
- **Infrastructure** - Logging, tracing, and utility configurations

## 📁 Directory Structure

```text
src/mastra/config/
├── index.ts              # Main exports aggregator
├── AGENTS.md             # Comprehensive documentation
├── README.md             # This file
│
├── Providers/
│   ├── google.ts         # Google AI (Gemini models)
│   ├── openai.ts         # OpenAI (GPT models)
│   ├── anthropic.ts      # Anthropic (Claude models)
│   ├── github-copilot.ts # GitHub Copilot integration
│   ├── openrouter.ts     # OpenRouter gateway (50+ models)
│   ├── gemini-cli.ts     # Local Gemini CLI
│   └── vertex.ts         # Google Cloud Vertex AI
│
├── Storage/
│   ├── pg-storage.ts     # PostgreSQL + PgVector
│   ├── mongodb.ts        # MongoDB integration
│   ├── upstash.ts        # Redis caching
│   └── upstashMemory.ts  # Redis memory store
│
├── Auth/
│   └── role-hierarchy.ts # Supabase RBAC system
│
├── Infrastructure/
│   ├── logger.ts         # Structured logging (Pino)
│   ├── tracing.ts        # Distributed tracing
│   └── processors.ts     # Data processing pipelines
│
└── Vector/
    ├── astra.ts          # DataStax Astra
    ├── chroma.ts         # Chroma DB
    ├── pinecone.ts       # Pinecone
    ├── qdrant.ts         # Qdrant
    ├── lance.ts          # LanceDB
    ├── opensearch.ts     # OpenSearch
    ├── cloudflare.ts     # Cloudflare D1
    ├── couchbase.ts      # Couchbase
    ├── s3vectors.ts      # AWS S3
    └── registry.ts       # Model registry
```

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env
```

### 2. Basic Usage

```typescript
import {
  // Model providers
  googleAI,
  openAIModel,
  anthropicClaude45,

  // Storage
  pgMemory,
  pgVector,

  // Auth
  hasRoleAccess,
  getTierConfig,

  // Tools
  pgQueryTool,
  graphQueryTool
} from './index'
```

### 3. Advanced Configuration

```typescript
// Custom model selection
import { getOpenRouterModel } from './openrouter'
const model = getOpenRouterModel('anthropicClaudeSonnet45')

// Role-based access control
import { hasRoleAccess } from './role-hierarchy'
if (hasRoleAccess(userRole, 'admin')) {
  // Admin-only operations
}

// Memory with custom settings
import { pgMemory } from './pg-storage'
// Configured with PgVector, semantic recall, and working memory
```

## 🔧 Model Providers

### Supported Providers

| Provider | Models | Key Features |
|----------|--------|--------------|
| **Google AI** | Gemini 2.5/3.0 Flash, Pro | Image generation, embeddings |
| **OpenAI** | GPT-4, GPT-4o, GPT-5 series | Reasoning, vision, coding |
| **Anthropic** | Claude 3.5/4.0/4.5 | Advanced reasoning |
| **GitHub Copilot** | GPT, Claude, Gemini models | OpenAI-compatible interface |
| **OpenRouter** | 50+ models from providers | Unified API gateway |
| **Gemini CLI** | Local Gemini models | OAuth/API key auth |
| **Vertex AI** | Google Cloud models | Enterprise-grade |

### Provider Configuration

Each provider follows a consistent pattern:

```typescript
// Individual models
export const providerModel = provider('model-id')

// Model collections
export const providerModels = {
  model1: provider('model-1'),
  model2: provider('model-2'),
}

// Selector functions
export function getProviderModel(modelId: keyof typeof providerModels) {
  return providerModels[modelId]
}
```

## 🗄️ Storage Systems

### PostgreSQL + PgVector (Primary)

```typescript
import { pgMemory, pgVector, pgQueryTool } from './pg-storage'

// Memory with semantic recall
await pgMemory.addMessages(messages, { resourceId: 'chat-123' })

// Vector similarity search
const results = await pgQueryTool.execute({
  query: 'Find relevant documents',
  topK: 5
})
```

**Features:**

- 3072D embeddings (Gemini)
- Semantic recall with HNSW indexing
- Working memory with task management
- Thread-based conversation storage
- Graph-based RAG queries

### Alternative Storage

```typescript
// MongoDB
import { mongoStore } from './mongodb'

// Upstash Redis
import { upstashMemory } from './upstashMemory'

// Vector databases
import { pineconeStore, chromaStore } from './vector'
```

## 🔐 Authentication & Authorization

### Supabase-Compatible RBAC

```typescript
import {
  hasRoleAccess,
  getTierConfig,
  ROLE_HIERARCHY
} from './role-hierarchy'

// Check permissions
const canAccess = hasRoleAccess(userRole, 'admin')

// Get tier limits
const tier = getTierConfig('pro') // { maxRequests: 10000, features: [...] }
```

**Supported Roles:**

- `anon` - Public access
- `authenticated` - Logged-in users
- `admin` - Administrative access
- `service_role` - Backend operations
- Subscription tiers: `free`, `pro`, `enterprise`

### Row Level Security (RLS)

The system integrates with Supabase RLS policies:

```sql
-- Example RLS policy
CREATE POLICY "Users can view own data" ON user_data
FOR SELECT USING (auth.uid() = user_id);
```

## 📊 Environment Variables

### Required

```env
# Database
SUPABASE=postgres://user:password@localhost:5432/mastra
DB_SCHEMA=mastra

# At least one AI provider
GOOGLE_GENERATIVE_AI_API_KEY=your-key
# OR
OPENAI_API_KEY=sk-xxxxx
# OR
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### Optional (Performance Tuning)

```env
# Database performance
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# Memory configuration
MEMORY_LAST_MESSAGES=500
SEMANTIC_TOP_K=5

# RAG settings
GRAPH_THRESHOLD=0.7
PG_MIN_SCORE=0.7
PG_EF=100

# Provider-specific
OPENROUTER_API_KEY=sk-or-xxxxx
COPILOT_TOKEN=github-token
GEMINI_OAUTH_CACHE=/path/to/cache
```

## 🛠️ Development

### Adding a New Provider

1. Create `new-provider.ts` in the config directory
2. Follow the established pattern:

   ```typescript
   import { createProvider } from '@ai-sdk/provider'

   const provider = createProvider({ apiKey: process.env.API_KEY })

   export const newProviderModels = {
     model1: provider('model-1'),
     model2: provider('model-2'),
   }

   export function getNewProviderModel(modelId: keyof typeof newProviderModels) {
     return newProviderModels[modelId]
   }
   ```

3. Add exports to `index.ts`
4. Update `AGENTS.md` documentation

### Testing Configuration

```typescript
// Test model availability
import { googleAI } from './google'

const response = await googleAI.generateText({
  prompt: 'Hello, world!'
})
console.log(response.text)
```

### Debugging

```typescript
// Enable detailed logging
import { log } from './logger'

log.info('Configuration loaded', {
  providers: ['google', 'openai'],
  storage: 'postgresql'
})
```

## 📈 Performance Optimization

### Connection Pooling

```env
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

### Embedding Configuration

```env
EMBEDDING_MAX_RETRIES=3
LISTS=3072  # IVF lists for vector indexing
```

### Memory Tuning

```env
MEMORY_LAST_MESSAGES=500
SEMANTIC_TOP_K=5
SEMANTIC_RANGE_BEFORE=3
SEMANTIC_RANGE_AFTER=2
```

## 🔍 Monitoring & Observability

### Logging

```typescript
import { log } from './logger'

log.info('Operation completed', { duration: 150, items: 25 })
log.error('Database connection failed', { error: err.message })
```

### Tracing

```typescript
import { tracing } from './tracing'

const span = tracing.createSpan('ai-generation', {
  model: 'gemini-pro',
  tokens: 150
})
```

## 🤝 Contributing

1. Follow the established patterns for new providers
2. Update `AGENTS.md` with comprehensive documentation
3. Add appropriate environment variables
4. Include usage examples and error handling
5. Test with multiple model configurations

## 📚 Additional Resources

- [AGENTS.md](./AGENTS.md) - Comprehensive component documentation
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth) - Authentication setup
- [PgVector Documentation](https://github.com/pgvector/pgvector) - Vector storage
- [AI SDK Documentation](https://sdk.vercel.ai) - Model provider integration
