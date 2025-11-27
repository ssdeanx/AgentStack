# Copilot Rules

## 🚨 Never Upload Secrets

- Do not store API keys or `.env` in repo.
- Use `.env.example` with placeholders.
- If a secret is leaked: rotate credentials, purge history, notify team.

## 🧠 AgentStack-Specific Rules

- Always read all `/memory-bank/*.md` files before starting any task (projectbrief, productContext, systemPatterns, techContext, activeContext, progress, copilot-rules).
- Prefer reading `AGENTS.md` files in `src/mastra/**` (agents, tools, workflows, config, mcp, scorers) before describing capabilities — do not guess.
- When updating memory-bank on **update memory bank**, sync content with real code from `src/mastra` and `README.md`, not assumptions.

## 🎨 UI Component Rules

- AI Elements components are in `src/components/ai-elements/` (30 components for AI chat UIs).
- Base shadcn/ui components are in `ui/` (19 components, new-york style).
- Use Radix UI primitives from the installed components; don't add conflicting UI libraries.
- Follow Tailwind CSS 4 patterns with CSS variables (oklch color space) defined in `app/globals.css`.
- Dark mode is supported via `next-themes` and `.dark` class selector.
- Import paths: `@/components/ui/*` for base, `@/components/ai-elements/*` for AI components.

## 🧪 Testing & Safety

- Maintain or improve test coverage when changing tools/agents/workflows; use Vitest tests in `src/mastra/tools/tests` and any agent tests.
- Never modify observability or security (JWT, RBAC, path validation, HTML sanitization) without checking corresponding config and tools.
