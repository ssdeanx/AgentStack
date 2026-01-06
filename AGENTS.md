<!-- AGENTS-META {"title":"Mastra Root","version":"2.4.0","applies_to":"/","last_updated":"2025-12-15T00:00:00Z","status":"stable"} -->

# AGENTS

## Project Overview

Mastra is a production-grade multi-agent framework for building agent-driven applications and RAG (retrieval-augmented generation) workflows. It provides **60+ enterprise tools**, **31+ specialized agents**, **15+ workflows**, **13 agent networks**, **A2A/MCP orchestration**, and a **complete UI component library** (65 components: 30 AI Elements + 35 base UI) for scalable AI systems. Key capabilities include **financial intelligence**, **RAG pipelines**, **observability**, **secure governance**, and **AI chat interfaces**.

This repo is structured to keep tools, agents, workflows, networks, UI components, and configs separated, with strict Zod schemas for tool inputs/outputs and strong environment-based configuration in `src/mastra/config`.

## Quick Setup

Install dependencies:

```bash
npm install
```

Start development server (Mastra CLI is used by default):

```bash
npm run dev
```

Build and start production:

```bash
npm run build
npm run start
```

Run unit tests (Vitest):

```bash
npm test
```

Run a specific test with a pattern:

```bash
npx vitest -t "pattern"
```

## Runtime requirements & env vars

Node >= 20.9.0 is required (see `package.json` engine field).

At minimum, a local development environment should provide:

- `SUPABASE` / `DATABASE_URL` (for Postgres + PgVector in pg-storage)
- `GOOGLE_GENERATIVE_AI_API_KEY` / `GOOGLE_API_KEY` (primary model provider)
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY` (alternative providers)
- `SERPAPI_API_KEY` (if running SerpAPI-based tools)
- `ALPHA_VANTAGE_API_KEY` / `FINNHUB_API_KEY` / `POLYGON_API_KEY` for financial tools

Create a `.env` file for local development. Example `.env`:

```env
# Database
SUPABASE=postgresql://user:password@localhost:5432/mastra
DATABASE_URL=postgresql://user:password@localhost:5432/mastra
DB_SCHEMA=mastra

# AI Providers (Google Gemini is primary)
GOOGLE_GENERATIVE_AI_API_KEY=your-key
GOOGLE_API_KEY=your-key

# Optional providers
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=xxxxx
OPENROUTER_API_KEY=xxxxx

# Tools
SERPAPI_API_KEY=xxxx
ALPHA_VANTAGE_API_KEY=xxxx
FINNHUB_API_KEY=xxxx
POLYGON_API_KEY=xxxx

# Mastra API
NEXT_PUBLIC_MASTRA_API_URL=http://localhost:4111
```

## Development Workflow

- Start dev server: `npm run dev` (uses Mastra CLI to run in developer mode)
- Build: `npm run build`
- Start production server: `npm run start`
- Run tests: `npm test` (Vitest)
- Run linters/formatting: `npm run lint` and `npm run format`
- Type checking: `npm run typecheck`

## Code Style Guidelines

### Build & Test Commands

**Building:**

- `npm run build` - Concurrent build (Next.js + Mastra)
- `npm run build:next` - Next.js build only
- `npm run build:mastra` - Mastra build only

**Development:**

- `npm run dev` - Concurrent dev servers (Next.js + Mastra)
- `npm run dev:next` - Next.js dev server only
- `npm run dev:mastra` - Mastra dev server only

**Testing:**

- `npm test` - Run all tests (Vitest)
- `npm run coverage` - Run tests with coverage report
- `npx vitest -t "pattern"` - Run tests matching pattern
- `npx vitest src/mastra/tools/tests/your-test-file.test.ts` - Run specific test file

**Linting & Formatting:**

- `npm run lint` - ESLint check
- `npm run lint:fix` - ESLint with auto-fix
- `npm run format` - Prettier formatting
- `npm run typecheck` - TypeScript type checking

### Import Organization

```typescript
// 1. External framework imports (React, Next.js, Mastra)
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

// 2. Type imports (always use type-only imports)
import type { RuntimeContext } from '@mastra/core/runtime-context'
import type { WeatherToolContext } from './types'

// 3. Internal imports (config, tools, utils)
import { log } from '../config/logger'
import { pgQueryTool } from '../config/pg-storage'
```

### TypeScript Conventions

- **Strict mode enabled**: No implicit any, strict null checks
- **Type definitions**: Use `interface` for public APIs, `type` for internal
- **Explicit return types**: Required for public functions
- **No `any`**: Use `unknown` or proper types
- **Optional chaining**: Use `?.` for nullable access
- **Nullish coalescing**: Use `??` for defaults
- **Consistent imports**: `import type { T } from "module"`

### Naming Conventions

- **Functions/Tools**: `camelCase` (e.g., `weatherTool`, `getUserData`)
- **Classes/Types/Interfaces**: `PascalCase` (e.g., `WeatherToolContext`, `UserProfile`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `API_TIMEOUT`, `MAX_RETRIES`)
- **Files**: `kebab-case` (e.g., `weather-tool.ts`, `user-profile.tsx`)
- **Directories**: `kebab-case` or `camelCase` based on convention

### Formatting (Prettier)

```javascript
// prettier.config.js
{
  trailingComma: 'es5',
  tabWidth: 4,
  semi: false,
  singleQuote: true
}
```

### ESLint Rules

**Critical Rules:**

- `eqeqeq: ['error', 'always']` - Strict equality
- `curly: ['error', 'all']` - Required braces
- `@typescript-eslint/no-unused-vars: ['warn', {}]` - No unused variables
- `@typescript-eslint/no-explicit-any: 'warn'` - Avoid any types

**Style Rules:**

- `object-shorthand: 'error'` - Use shorthand syntax
- `prefer-arrow-callback: 'error'` - Arrow functions preferred
- `prefer-const: 'warn'` - Const when possible
- `@typescript-eslint/consistent-type-definitions: ['error', 'interface']` - Interfaces preferred

### Error Handling

```typescript
// ✅ GOOD: Structured error handling
try {
    const result = await riskyOperation()
    return { data: result, error: null }
} catch (error) {
    log.error('Operation failed', { error, context })
    return { data: null, error: error.message }
}

// ❌ BAD: Silent failures or generic errors
try {
    // ...
} catch (e) {
    // pass
}
```

### Testing Standards

**Test Structure:**

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('weatherTool', () => {
    it('should return weather data for valid location', async () => {
        // Arrange
        const mockContext = { location: 'London' }

        // Act
        const result = await weatherTool.execute({ context: mockContext })

        // Assert
        expect(result.data).toBeDefined()
        expect(result.error).toBeNull()
    })
})
```

**Testing Rules:**

- 97% coverage target
- Mock external dependencies
- Test success and error paths
- Use descriptive test names
- Co-locate tests with implementation
- `beforeEach` for setup/cleanup

### Tool Implementation Pattern

```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { log } from '../config/logger'

// Context schema (optional)
const toolContextSchema = z.object({
    timeout: z.number().default(5000),
})

export type ToolContext = z.infer<typeof toolContextSchema>

export const myTool = createTool({
    id: 'my-tool',
    description: 'Clear description of what the tool does',
    inputSchema: z.object({
        param: z.string().describe('Parameter description'),
    }),
    outputSchema: z.object({
        data: z.any(),
        error: z.string().optional(),
    }),
    execute: async ({ context, runtimeContext }) => {
        try {
            // Tool logic here
            log.info('Tool executed', { context })

            return { data: result, error: undefined }
        } catch (error) {
            log.error('Tool error', { error, context })
            return { data: null, error: error.message }
        }
    },
})
```

### Agent Implementation Pattern

```typescript
import { Agent } from '@mastra/core/agent'
import { googleAI } from '../config/google'
import { pgMemory } from '../config/pg-storage'

export const myAgent = new Agent({
    id: 'my-agent',
    name: 'My Agent',
    description: 'What this agent does',
    instructions: 'Instructions for the agent...',
    model: googleAI,
    tools: {
        tool1,
        tool2,
    },
    memory: pgMemory,
})
```

## Architecture & conventions

- **Frontend** (`app/`, `ui/`, `src/components/ai-elements/`): Next.js 16 App Router with React 19. AI Elements (30 components) for chat/reasoning/canvas UIs. shadcn/ui base (34 components) in `ui/`. Tailwind CSS 4 with oklch color variables.
- **Tools** (`src/mastra/tools`): 60+ tools implementing `createTool({ id, inputSchema, outputSchema, execute })` with strict Zod schemas. Categories: Financial (Polygon, Finnhub, AlphaVantage), Research (SerpAPI, ArXiv), Data (CSV, JSON, PDF), RAG (chunking, embeddings), Code (search, analysis, chunking), Browser automation, Calendar, JWT auth, GitHub integration.
- **Agents** (`src/mastra/agents`): 31+ agents composing tools into specialized behaviors (research, stock analysis, content creation, data processing, business/legal, charting, image processing, coding, calendar, document processing, knowledge indexing, social media, SEO, translation, customer support, project management).
- **Networks** (`src/mastra/networks`): 13 agent networks for routing and orchestration (primary routing, data pipeline, report generation, research pipeline, content creation, financial intelligence, learning, marketing automation, DevOps, business intelligence, security).
- **Workflows** (`src/mastra/workflows`): 15+ multi-step workflows using Mastra DSL (weather, content, financial reports, document processing, research synthesis, governed RAG, learning extraction, repo ingestion, stock analysis, telephone game, spec generation, marketing campaign).
- **Config** (`src/mastra/config`): Centralized provider clients (Google, OpenAI, Anthropic, OpenRouter, Vertex), pg-storage with PgVector, and role hierarchy.
- **Scorers** (`src/mastra/scorers`): Custom evaluation metrics for automated quality assessment.
- **MCP/A2A** (`src/mastra/mcp`, `src/mastra/a2a`): Model Context Protocol server and Agent-to-Agent coordination.

## Testing & CI

- Tests use Vitest. Unit tests are under `src/mastra/tools/tests` and other directories as appropriate.
- To run a single test file: `npx vitest src/mastra/tools/tests/your-test-file.test.ts`
- The `coverage` script runs `vitest run --coverage`.

## Pull Request Guidelines

- Title format: [<area>] Short summary — e.g., `[tools] Add new vector store tool`
- Run `npm test` and linters before opening a PR
- Add or update tests for any behavioral change in code
- Keep changes small and request reviewers who understand the affected subdomain (tools, config, agents, workflows).

## Security & Secrets

- Never commit API keys or secrets to the repo.
- Use `.env` locally and secure env variables in CI/CD (e.g., GitHub Actions Secrets).
- Mask secrets in logs and use `maskSensitiveMessageData()` helper from `src/mastra/config/pg-storage.ts` where needed.

## Cursor/Copilot Rules

Located in `.github/copilot-instructions.md`:

- 🧠 Read `/memory-bank/memory-bank-instructions.md` first
- 🗂 Load all `/memory-bank/*.md` before any task
- 🚦 Use the Kiro-Lite workflow: PRD → Design → Tasks → Code
- 🔒 Follow security & style rules in `copilot-rules.md`
- 📝 Update memory bank after significant changes
- ✅ Confirm memory bank loaded with `[Memory Bank: Active]`
- 🎯 Use problem-solving tools for debugging
- 🛠 Use Mastra tools for documentation and examples

## Where to look for more info

- `app/AGENTS.md`: Next.js App Router pages and layouts
- `app/about/`: About page
- `app/api/`: API routes (chat, network, workflow, auth, etc.)
- `app/api-reference/`: API reference documentation
- `app/blog/`: Blog pages
- `app/careers/`: Careers page
- `app/changelog/`: Changelog page
- `app/chat/AGENTS.md`: AI chat interface with 26+ Mastra agents using AI Elements and @ai-sdk/react
- `app/components/`: Main public components - landing pages (hero, features, stats, testimonials), API/docs layouts, blog components, contact forms, pricing tiers, charts/, features/, monaco/ editor components, navbar, footer
- `app/contact/`: Contact page
- `app/dashboard/AGENTS.md`: Admin dashboard for monitoring and management
- `app/docs/`: Documentation pages
- `app/examples/`: Example pages
- `app/login/`: Login page
- `app/networks/AGENTS.md`: Advanced chat interface for Mastra agent networks with routing panel
- `app/pricing/`: Pricing page
- `app/privacy/`: Privacy policy page
- `app/product/`: Product pages
- `app/terms/`: Terms of service page
- `app/test/AGENTS.md`: Server action and runtime demos
- `app/tools/AGENTS.md`: Tool documentation and execution
- `app/workflows/AGENTS.md`: Interactive workflow visualization with AI Elements (Canvas, Node, Edge, Panel)
- `lib/`: Shared utilities
  - `hooks/`: React hooks for data fetching and state management
    - `use-dashboard-queries.ts`: TanStack Query hooks for agents, workflows, tools, traces, threads, messages
    - `use-mastra.ts`: Generic fetch hook with loading/error states for MastraClient data
  - `types/`: TypeScript type definitions
    - `mastra-api.ts`: Zod schemas and types for Agent, Workflow, Tool, MemoryThread, Message, VectorQueryResult
  - Core utilities: `a2a.ts` (agent coordination), `auth.ts` (authentication), `client-stream-to-ai-sdk.ts` (streaming), `mastra-client.ts` (client), `utils.ts`
- `ui/AGENTS.md`: shadcn/ui base components (34 components)
- `src/components/ai-elements/AGENTS.md`: AI Elements library (30 components)
- `src/mastra/AGENTS.md`: top-level code-agent focused docs (this file is mirrored to subfolders)
- `src/mastra/tools/AGENTS.md`: 34+ tools and their patterns
- `src/mastra/agents/AGENTS.md`: 38 agents catalog
- `src/mastra/workflows/AGENTS.md`: 10 workflow definitions
- `src/mastra/networks/AGENTS.md`: 4 agent networks
- `src/mastra/config/AGENTS.md`: configuration and storage guidance
- `src/mastra/config/vector/AGENTS.md`: vector store choices and configuration
- `src/mastra/mcp/AGENTS.md`: MCP server documentation
- `src/mastra/a2a/AGENTS.md`: A2A coordination

## Project Architecture Overview

```mermaid
graph TB
    subgraph Frontend["Frontend Layer"]
        App[app/]
        ChatUI[app/chat/ - AI Chat]
        WorkflowUI[app/workflows/ - Canvas]
        NetworkUI[app/networks/ - Routing]
        DashboardUI[app/dashboard/ - Admin]
        LandingUI[app/ - Landing Pages]
        ComponentsUI[app/components/ - Public]
    end

    subgraph AI["AI Components"]
        AIElements["AI Elements (30)"]
        ShadcnUI["shadcn/ui (34)"]
        SDK["@ai-sdk/react"]
    end

    subgraph Core["Mastra Core"]
        Agents["Agents (30+)"]
        Tools["Tools (40+)"]
        Workflows["Workflows (14+)"]
        Networks["Networks (4)"]
        Scorers["Scorers"]
    end

    subgraph Infrastructure["Infrastructure"]
        Config[Config]
        Storage[PostgreSQL + PgVector]
        Observability[Langfuse]
        MCP[MCP Server]
        A2A[A2A Coordination]
        CLI[CLI Tools]
    end

    Frontend --> AI
    AI --> Core
    Core --> Infrastructure
    Config --> Storage
    Observability --> Infrastructure
```

## Component Categories

### Frontend Applications

- **Chat Interface**: 30+ Mastra agents with AI Elements, streaming via @ai-sdk/react
- **Workflows Visualization**: Interactive canvas with 14+ workflows, real-time streaming
- **Networks Management**: Advanced chat with agent routing panels
- **Admin Dashboard**: MastraClient-based observability and management
- **Landing Pages**: Professional marketing pages with Vercel-style navigation

### Core Components

- **60+ Tools**: Financial, Research, Data, RAG, Code, Browser, Calendar, Auth, GitHub
- **31+ Agents**: Specialized behaviors composing tools for research, analysis, content, social media, SEO, translation, customer support, project management
- **15+ Workflows**: Multi-step DSL workflows for complex orchestration
- **13 Networks**: Routing and orchestration between agents and workflows

### Infrastructure

- **Storage**: PostgreSQL + PgVector for vector search and persistence
- **Observability**: Langfuse integration with custom exporters
- **MCP/A2A**: Model Context Protocol and agent-to-agent coordination
- **CLI**: Governed RAG tools for document indexing and querying

## Configuration files

- `next.config.ts`: Next.js configuration with MDX support, experimental features, and Mastra package handling
- `tsconfig.json`: TypeScript configuration for the app (ES2022, Next.js paths, includes app/src/ui/lib)
- `tsconfig.cli.json`: TypeScript configuration for CLI builds (CommonJS, excludes app components)
- `vitest.config.ts`: Vitest testing configuration with jsdom environment, coverage reporting, and Mastra evals integration
- `globalSetup.ts`: Global test setup for Mastra evals and test environment
- `testSetup.ts`: Test setup with mocks, environment variables, and global type declarations
- `postcss.config.mjs`: PostCSS configuration with Tailwind CSS plugin
- `mdx-components.tsx`: Custom MDX components for styling headings, links, code blocks, tables, and images
- `eslint.config.js`: ESLint configuration with TypeScript rules, Prettier integration, and extensive ignore patterns
- `prettier.config.js`: Prettier configuration with ES5 trailing commas, 4-space tabs, and single quotes
- `components.json`: shadcn/ui configuration with New York style, Tailwind CSS, Lucide icons, and component aliases
- `.eslintignore`: ESLint ignore patterns for node_modules, build artifacts, memory-bank, docs, and other non-source directories
- `.markdownlint.json`: Markdown linting configuration with relaxed rules for line length, headings, and formatting
- `src/cli/`: CLI tooling for Governed RAG
  - `index.ts`: CLI commands for document indexing, querying RAG, and usage statistics
  - `AGENTS.md`: CLI documentation and usage patterns

If you need more details for a subdirectory, open the folder-specific `AGENTS.md` which contains persona, purpose, and actionable commands.

---

Last updated: 2025-12-15