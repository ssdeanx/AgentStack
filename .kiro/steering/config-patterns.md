# Configuration Patterns

## Config Organization

Configuration is centralized in `src/mastra/config/` with barrel exports in `index.ts`:

```typescript
export * from './model-registry'
export * from './logger'
export * from './pg-storage'
export * from './role-hierarchy'
export * from './google'
export * from './openai'
// ... other providers
```

## Key Patterns from Codebase

### Logger
- Import: `import { log } from '../config/logger'`
- Methods: `log.info()`, `log.error()`, `log.warn()`
- Use for all logging throughout tools, agents, workflows

### Model Providers
- Each provider in separate file: `google.ts`, `openai.ts`, `anthropic.ts`, etc.
- Export model instances ready to use
- Example: `import { googleAIFlashLite } from '../config/google'`

### Storage
- PostgreSQL + PgVector in `pg-storage.ts`
- Provides vector storage for RAG workflows
- Used by agents for memory and embeddings

### Role Hierarchy
- Defined in `role-hierarchy.ts`
- Controls access and permissions
- Used in agent authorization

### Environment Variables
- Required: `PG_CONNECTION`, `OPENAI_API_KEY` (or other model keys)
- Optional: `SERPAPI_API_KEY`, financial API keys
- Load from `.env` file locally

## Import Pattern
- Import from config barrel: `import { log, googleAIFlashLite } from '../config'`
- Or specific imports: `import { log } from '../config/logger'`

## Adding New Providers
1. Create new file in `src/mastra/config/`
2. Initialize provider with API key from environment
3. Export model instance
4. Add export to `index.ts`
