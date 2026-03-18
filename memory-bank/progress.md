# 2026-03-18 landing GSAP/SVG runtime fix

- Fixed a React SVG DOM-property issue in `app/components/gsap/svg-suite/animated-quantum-lattice.tsx` by removing the unsupported JSX transform-origin prop from `<g>` nodes.
- Fixed `ReferenceError: gsap is not defined` in `app/components/network-background.tsx` by importing `gsap` explicitly.
- Validation:
  - ✅ targeted `get_errors` clean for `animated-quantum-lattice.tsx`, `network-background.tsx`, `landing-hero.tsx`, `landing-svg-lab.tsx`, and `app/page.tsx`

# 2026-03-18 embedding model migration + PostgresStore singleton fix

- Migrated the active `src/mastra/**` embedding model references from `gemini-embedding-001` to `gemini-embedding-2-preview`.
- Reused the shared `pgStore` singleton inside `src/mastra/index.ts` instead of creating a second `new PostgresStore(...)` for the same schema.
- This directly addresses the Mastra PG init failure caused by concurrent schema migration attempts on `mastra_dataset_items.requestContext`.
- Cleaned touched-file diagnostics introduced/exposed during the pass:
  - `src/mastra/index.ts`
  - `src/mastra/config/libsql.ts`
  - `src/mastra/config/qdrant.ts`
  - `src/mastra/workflows/repo-ingestion-workflow.ts`
- Validation:
  - ✅ no remaining `gemini-embedding-001` matches under `src/**`
  - ✅ targeted `get_errors` clean for all edited files

# 2026-03-17 browser tool preview integration

- Implemented the browser-first tool upgrade requested for chat rendering.
- Backend browser-family tools now expose structured outputs for previewable resources instead of only text blobs.
- Frontend browser-family cards were rewritten to use:
  - `Image` for screenshots
  - `WebPreview` for live/inline page previews
  - guarded unknown-output parsing for resilient rendering
- `app/chat/components/agent-tools.tsx` now directly routes browser-family tool ids (`browserTool`, `screenshotTool`, `pdfGeneratorTool`, `clickAndExtractTool`, `fillFormTool`, `googleSearch`, `monitorPageTool`) to their custom cards.
- `web-preview.tsx` animation utility classes were normalized during the same pass.
- Validation:
  - ✅ `src/mastra/tools/browser-tool.ts`
  - ✅ `src/components/ai-elements/tools/browser-tool.tsx`
  - ✅ `app/chat/components/agent-tools.tsx`
  - ✅ `src/components/ai-elements/tools/index.ts`
  - ✅ `app/chat/components/chat-messages.tsx`
  - ✅ `src/components/ai-elements/web-preview.tsx`
  - ✅ `src/components/ai-elements/image.tsx`

# 2026-03-17 codingAgents normalization

- Restored `codingAgents.ts` after a bad intermediate state:
  - local tool objects are back in place by concrete tool name
  - no explicit `new Agent<...>` tool generic remains in that file
  - targeted validation for `codingAgents.ts` is clean
- Rechecked `src/mastra/agents` after the fix:
  - ✅ **No errors found**

# 2026-03-17 full nested-agent source fix for networks/a2a

- Completed the remaining nested-agent typing cleanup the user requested across `src/mastra/networks` and `src/mastra/a2a`.
- Removed the bad `ToolsInput` additions from the touched agent implementations.
- Reworked the remaining child agents so parent registration compiles by source design rather than parent-side casting/adaptering.
- Fixed adjacent diagnostics encountered during the pass:
  - invalid `unknown` template interpolation in `knowledgeIndexingAgent.ts`
  - `codingAgents.ts` unused import + `projectRoot` stringification issue
  - unused `requestContext` / `userId` in A2A coordinators
  - `codingTeamNetwork.ts` async/no-await quality-gate bug
- Validation:
  - ✅ edited agent files clean
  - ✅ `src/mastra/a2a` clean
  - ✅ `src/mastra/networks` clean

# 2026-03-17 nested-agent typing fix without adapter

- Fixed the reported `seoAgent.ts` nested child-agent assignment failures for:
  - `researchAgent`
  - `contentStrategistAgent`
  - `evaluationAgent`
- Kept the solution at the source rather than adding a parent-side adapter:
  - shared request-context keys now come from `src/mastra/agents/request-context.ts`
  - touched child agents parse specialized runtime context internally
  - touched child agents now expose `unknown` as their public `Agent` request-context generic so direct parent registration compiles cleanly
- Validation:
  - ✅ targeted `get_errors` on `request-context.ts`, `researchAgent.ts`, `contentStrategistAgent.ts`, `evaluationAgent.ts`, and `seoAgent.ts` returned clean
  - ⚠️ folder-wide `get_errors` on `src/mastra/agents` still shows unrelated pre-existing diagnostics in `knowledgeIndexingAgent.ts`

# 2026-03-16 use-mastra-query full client-js hook expansion

- Completed the requested `@mastra/client-js` parity pass in `lib/hooks/use-mastra-query.ts` without replacing the file’s existing hook-factory pattern.
- Added missing query families for provider/processors, advanced memory, stored resources, vectors/embedders, workspace skill resources, A2A streaming, and Agent Builder queries.
- Added missing mutation families for workflow run lifecycle, advanced memory helpers, processor execution, stored resource CRUD/version flows, and Agent Builder execution flows.
- Corrected the stale stored-agent list cast so `useStoredAgents` now returns the installed paginated SDK shape instead of a forced single-agent response.
- Validation:
  - ✅ targeted `get_errors` on `lib/hooks/use-mastra-query.ts` returned **No errors found**

# 2026-03-16 Mastra evals hardening

- Resolved all current `get_errors` issues under `src/mastra/evals`.
- Reworked `agent-experiments.ts` away from the broken local `runEvals(agent, ...)` usage path and onto a typed helper that:
  - executes the agent with `returnScorerData: true`
  - feeds canonical `scoringData.input` / `scoringData.output` into `scorer.run(...)`
- Removed unsafe `any`/member-access patterns from keyword coverage, financial scorer parsing, custom scorers, and scorer utility helpers.
- Standardized judge-backed eval scorers on the explicit Mastra model string `google/gemini-3.1-flash-lite-preview`.
- Added `type: 'agent'` to custom agent scorers so experiment helpers accept them without `any`/unsafe widening.
- Removed `as any` scorer execution from eval tests by making the local test harness return agent-shaped scorer input/output.
- Verified current installed `@mastra/core` typings directly from `node_modules`:
  - `runEvals<TAgent extends Agent>(...)` is supported for datasets/manual batches
  - `RunEvalsDataItem<TAgent>` expects `{ input, groundTruth?, requestContext?: RequestContext }`
- Final convention pass: judge-backed eval scorers now use the inline literal model string exactly as requested, and `src/mastra/agents/seoAgent.ts` no longer has an unused Google model import.
- Added the full frontend dataset/scorer/experiment API surface to both `lib/hooks/use-mastra-query.ts` and `lib/hooks/use-mastra.ts`, matching the installed `@mastra/client-js` methods exactly.
- Validation:
  - ✅ targeted `get_errors` on edited eval files clean
  - ✅ final `get_errors` on `src/mastra/evals` returned **No errors found**

## 2026-02-17 Landing Components Full Pass

- Completed landing-wide component polish across all `landing-*` sections:
  - `landing-hero.tsx`
  - `landing-stats.tsx`
  - `landing-trust.tsx`
  - `landing-features.tsx`
  - `landing-svg-lab.tsx`
  - `landing-testimonials.tsx`
  - `landing-agents.tsx`
  - `landing-cta.tsx`
- Added 5 additional SVG variants (on top of prior 3), bringing new variants created in this cycle to 8 total:
  - `AnimatedAegisCore`
  - `AnimatedFractalBeacon`
  - `AnimatedOrbitShards`
  - `AnimatedWaveInterference`
  - `AnimatedPacketBurst`
- Expanded landing SVG lab from 13 to 18 samples and wired new variants into landing sections for professional visual consistency.

## 2026-02-17 Public SVG Professionalization (Components Scope)

- Added 3 new production SVG accents in `app/components/gsap/svg-suite/`:
  - `animated-shield-matrix.tsx`
  - `animated-quantum-lattice.tsx`
  - `animated-token-stream.tsx`
- Updated SVG suite barrel export (`svg-suite/index.ts`) and expanded `landing-svg-lab.tsx` from 10 to 13 showcase options.
- Upgraded shared `PublicPageHero` quality:
  - larger accent rendering (`size={192}`), stronger stage framing, radial + inner-border depth
  - optional `accentCaption` support
  - fixed subtitle alignment for desktop left layouts (`lg:mx-0 lg:text-left`)
- Applied `accentCaption` to all public components using hero accents:
  - `about-content.tsx`, `api-reference-content.tsx`, `blog-list.tsx`, `careers-content.tsx`, `changelog-list.tsx`, `contact-form.tsx`, `examples-list.tsx`, `networks-list.tsx`, `pricing-tiers.tsx`, `privacy-content.tsx`, `terms-content.tsx`, `tools-list.tsx`, `workflows-list.tsx`
- Swapped selected pages to new SVG options for clearer semantics:
  - Privacy → `AnimatedShieldMatrix`
  - Tools → `AnimatedQuantumLattice`
  - Changelog → `AnimatedTokenStream`
- Increased global SVG scale tokens in `app/globals.css` (`.gsap-svg-icon`, `.gsap-svg-hero`, `.gsap-svg-stage`) to remove tiny-icon presentation.

## 2026-02-17 Dashboard Typing Hardening

- Removed `unknown`-based state in dashboard pages that were edited in this task:
  - `app/dashboard/workflows/page.tsx`
  - `app/dashboard/observability/page.tsx`
- Added explicit JSON-safe result typing (`JsonValue`) and guarded runtime assignment paths.
- Fixed broken JSX introduced during refactor in observability pagination action.
- Kept scope limited to dashboard strict typing and stability (no backend wiring changes to public pages in this step).

# Progress

## 2026-03-16 Mastra nested-agent type fix

- Resolved folder-level `get_errors` failures in:
  - `src/mastra/agents`
  - `src/mastra/a2a`
  - `src/mastra/networks`
- Verified upstream cause in installed dependency typings rather than guessing:
  - `node_modules/@mastra/core/dist/agent/types.d.ts`
  - nested `agents` config is typed too narrowly for child agents with stricter runtime contexts.
- Added a single local adapter:
  - `src/mastra/agents/nestedAgents.ts`
- Updated all affected parent agent/network registrations to use `asNestedAgents(...)`.
- Removed obsolete `src/mastra/agents/agentRegistry.ts`.
- Validation:
  - ✅ targeted `get_errors` on edited files clean
  - ✅ final `get_errors` on `src/mastra/agents`, `src/mastra/a2a`, and `src/mastra/networks` returned **No errors found**

## 2026-03-16 Mastra tools strict-clean pass

- Completed strict type/hook cleanup across the requested Mastra tool files and resolved additional concrete diagnostics surfaced by folder-wide validation.
- Key fixes included:
  - removed avoidable `any` usage in touched schemas/helpers
  - tightened nullable booleans/strings for strict checks
  - added/normalized output schemas so hook payloads are typed correctly
  - normalized tool hook placement around schema definitions in touched tools
  - repaired Excalidraw → SVG compatibility typing
  - cleaned E2B/listing path regression and several leftover utility tool diagnostics
- Validation:
  - ✅ requested tool files clean under `get_errors`
  - ✅ final `get_errors` on `src/mastra/tools` returned **No errors found**

## 2026-03-05 use-mastra-query error cleanup

- Fixed `lib/hooks/use-mastra-query.ts` compile issues caused by partially wired hooks.
- Removed the stray helper-style `useWorkspaceSandboxReady` hook.
- Added explicit **separate sandbox hooks** (`useSandboxInfo/files/read/stat/search` + sandbox write/delete/mkdir/index mutations).
- Wired MCP hooks (`useMcpServers`, `useMcpServerDetails`, `useMcpServerTools`, `useMcpToolDetails`, `useMcpToolExecuteMutation`) into returned hook object.
- Wired A2A hooks (`useA2ACard`, `useA2AGetTask`, `useA2ASendMessageMutation`, `useA2ACancelTaskMutation`) into returned hook object.

## 2026-03-05 Workspace/Sandbox Hooks for Frontend UI

- Reviewed Mastra Workspace docs/reference pages (`local-filesystem`, `local-sandbox`, `sandbox`, `workspace-class`, `workspace/search`) and mapped to `@mastra/client-js` Workspace API.
- Extended `lib/hooks/use-mastra-query.ts` with frontend-ready hooks for workspace filesystem + search + skills:
  - queries: `useWorkspaceInfo`, `useWorkspaceFiles`, `useWorkspaceReadFile`, `useWorkspaceStat`, `useWorkspaceSearch`, `useWorkspaceSkills`, `useWorkspaceSearchSkills`
  - mutations: `useWorkspaceWriteFileMutation`, `useWorkspaceDeleteMutation`, `useWorkspaceMkdirMutation`, `useWorkspaceIndexMutation`
- Added new `mastraQueryKeys.workspaces.*` keys for granular cache invalidation and stable UI refresh.

## Dashboard + Public Data Hardening **[Synced 2026-02-17]**

- Removed unsafe dashboard casts in key routes/components:
  - `app/dashboard/page.tsx` trace list no longer uses `as unknown as Record`.
  - `app/dashboard/observability/page.tsx` moved to typed query hooks and typed `Trace/Span` rendering.
  - `app/dashboard/workflows/page.tsx` fixed step union handling and schema rendering.
  - `app/dashboard/agents/_components/agent-tab.tsx` + `agent-tools-tab.tsx` no longer use `any` casts.
- Rebuilt `app/dashboard/telemetry/page.tsx` with typed traces query flow and strict rendering.
- Replaced hardcoded public catalogs with backend-driven data:
  - `app/components/tools-list.tsx`
  - `app/components/workflows-list.tsx`
  - `app/components/networks-list.tsx`
- Public GSAP hero integration remains active via `PublicPageHero` accents for these public list surfaces.

## Skill Upgrade: Generative UI Architect **[Synced 2026-02-16]**

- Expanded `.claude/skills/generative-ui-architect/SKILL.md` to cover both:
  - chat/tool-driven GenUI architecture, and
  - public-facing design architecture for landing/subpages.
- Split references to enforce progressive disclosure and clearer ownership:
  - `references/generative-ui-chat-networks-workflows.md` (primary backend-interactive contract)
  - `references/public-page-architecture.md` (public design system + SEO/a11y/perf)
  - `references/blog-roadmap-playbook.md` (10-15 minute product update format)
- Added project-specific guidance for public primitives and motion system usage:
  - `SectionLayout`, `PublicPageHero`, typography tokens, `useSectionReveal`
  - GSAP SVG suite integration and reduced-motion expectations.
- Added a dedicated **Blog Section (10-15 Minute Read)** with:
  - current-state narrative guidance,
  - phased product roadmap structure,
  - reusable roadmap template for consistent updates.
- Updated description triggers so the skill is auto-discovered for both chat and public-surface tasks.

## Public Subpage Premium Polish **[Synced 2026-02-16]**

- Completed premium visual harmonization for public subpages by migrating key sections to shared `PublicPageHero` + GSAP SVG accents:
  - `app/components/blog-list.tsx`
  - `app/components/changelog-list.tsx`
  - `app/components/examples-list.tsx`
  - `app/components/api-reference-content.tsx`
  - `app/components/pricing-tiers.tsx`
  - `app/components/contact-form.tsx`
- Added UX/accessibility polish:
  - keyboard-visible focus rings on card/link targets,
  - robust empty-state fallbacks for list/search pages.
- Normalized route wrappers to remove duplicate `Navbar` rendering and rely on root layout composition:
  - `app/about/page.tsx`, `app/careers/page.tsx`, `app/pricing/page.tsx`, `app/contact/page.tsx`
  - `app/changelog/page.tsx`, `app/blog/page.tsx`, `app/examples/page.tsx`, `app/api-reference/page.tsx`
- Validation:
  - ✅ Targeted ESLint across all touched components/pages passes clean.

## Public Subpage Component Modernization **[Synced 2026-02-16]**

- Completed component-only upgrades for all primary public subpage content components:
  - `app/components/about-content.tsx`
  - `app/components/careers-content.tsx`
  - `app/components/changelog-list.tsx`
  - `app/components/blog-list.tsx`
  - `app/components/examples-list.tsx`
  - `app/components/api-reference-content.tsx`
  - `app/components/pricing-tiers.tsx`
  - `app/components/contact-form.tsx`
- Standardized all above components on shared public primitives:
  - `SectionLayout` for consistent shell and spacing
  - shared typography tokens (`SECTION_HEADING`, `SECTION_BODY`, `SECTION_LAYOUT`)
  - `useSectionReveal` GSAP pattern for consistent entrance animations
- Removed scattered per-card `whileInView` usage in favor of section-level reveal orchestration where applicable.
- Fixed strict lint issues introduced/exposed during migration:
  - floating clipboard promise (`void navigator.clipboard.writeText(...)`)
  - strict boolean checks in form validation rendering
  - typed contact API response parsing
  - fallback map resolution with nullish coalescing in changelog item icon/color selection
- Validation:
  - ✅ Targeted ESLint on all upgraded components passes.
  - ⚠️ `npx tsc --noEmit --skipLibCheck` still fails due external dependency declarations in `node_modules` (`@crawlee/http`, `@mdx-js/loader`), not from migrated subpage components.

## GSAP SVG Suite & Review Fixes **[Synced 2026-02-16]**

- Addressed code review comments:
  - `app/components/gsap/registry.ts`: changed registration to `gsap.registerPlugin(ScrollTrigger)` only.
  - `app/components/primitives/use-section-reveal.ts`: dependencies now include all runtime options (`selector`, `stagger`, `yOffset`, `duration`, `once`, `delay`, `disabled`).
- Fixed root layout provider composition in `app/layout.tsx`:
  - Removed duplicate `{children}` render path.
  - Moved `TooltipProvider` inside `ThemeProvider` to ensure tooltip theming follows current theme.
- Added **10 new GSAP animated SVG components** in `app/components/gsap/svg-suite/`:
  - `AnimatedSignalPulse`, `AnimatedLiquidBlob`, `AnimatedGradientRings`, `AnimatedDataStream`, `AnimatedNeuralMesh`
  - `AnimatedPrismOrbit`, `AnimatedMorphWaves`, `AnimatedRadarScan`, `AnimatedCircuitGrid`, `AnimatedHelixDna`
- Added new public showcase section: `app/components/landing-svg-lab.tsx` and wired it into `app/page.tsx`.
- Added global GSAP motion options/utilities in `app/globals.css`:
  - Tokens: `--gsap-duration-*`, `--gsap-ease-*`, `--gsap-y-offset`
  - Utilities: `.gsap-will-change`, `.gsap-composite`, `.gsap-svg-icon`, `.gsap-svg-crisp`, `.gsap-motion-safe`, `.gsap-enter-ready`, `.gsap-enter-done`
  - Reduced-motion override block for GSAP helper classes.

## GSAP Public SVG Upgrade **[Synced 2026-02-15]**

- Added reusable animated SVG brand component: `app/components/gsap/animated-orbital-logo.tsx`.
- Integrated the animated SVG into shared public components:
  - `app/components/navbar.tsx` brand mark
  - `app/components/landing-hero.tsx` hero identity block
  - `app/components/footer.tsx` brand mark
- Enforced reduced-motion safe behavior with `prefers-reduced-motion` fallback states.
- Verified with problems check (`get_errors`) on all touched files: no remaining errors.

## What's Done **[Synced Dec 8 from session work]**

| Category                    | Status     | Key Files/Details                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap                   | ✅         | `index.ts`: 25+ agents, 12 workflows, 4 networks, MCP/pg-storage/observability.                                                                                                                                                                                                                                                                                                                                                                                              |
| Agents                      | 22+ files  | a2aCoordinatorAgent.ts, researchAgent.ts, stockAnalysisAgent.ts, copywriterAgent.ts, editorAgent.ts, reportAgent.ts, scriptWriterAgent.ts, contentStrategistAgent.ts, learningExtractionAgent.ts, evaluationAgent.ts, weather-agent.ts, excalidraw_validator.ts, csv_to_excalidraw.ts, image_to_csv.ts, dataExportAgent.ts, dataIngestionAgent.ts, dataTransformationAgent.ts, researchPaperAgent.ts, documentProcessingAgent.ts, knowledgeIndexingAgent.ts, dane.ts, sql.ts |
| Networks                    | 4 files    | agentNetwork, dataPipelineNetwork, reportGenerationNetwork, researchPipelineNetwork                                                                                                                                                                                                                                                                                                                                                                                          |
| Workflows                   | 12 files   | weather-workflow.ts, content-studio-workflow.ts, content-review-workflow.ts, document-processing-workflow.ts, financial-report-workflow.ts, learning-extraction-workflow.ts, research-synthesis-workflow.ts, stock-analysis-workflow.ts, changelog.ts, telephone-game.ts, **repo-ingestion-workflow.ts (NEW)**, **spec-generation-workflow.ts (NEW)**                                                                                                                        |
| Tools                       | ✅         | Unified all 40+ tools in `src/mastra/tools/index.ts`. All `UITool` types consolidated in `src/components/ai-elements/tools/types.ts`. Includes Financial, Research, Data, RAG, Code, Browser, Sandbox/Exec, Calendar, GitHub, and PNPM tools.                                                                                                                                                                                                                                |
| MCP                         | ✅         | `mcp/index.ts`: a2aCoordinatorMcpServer; tools: coordinate_a2a_task etc.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Scorers                     | ✅         | weather-scorer.ts, custom-scorers.ts.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Observability               | ✅         | Arize/Phoenix exporters; always-on sampling.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Config                      | ✅         | pg-storage.ts (PgVector/Postgres); **models config (150+ models from 6 providers: google, openai, anthropic, openrouter, ollama, vertex)**.                                                                                                                                                                                                                                                                                                                                  |
| Tests                       | Progress   | Vitest data tools verified; target 97%.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| AGENTS.md Sync              | ✅         | All AGENTS.md files updated Dec 5 with accurate counts, dates, and meta headers.                                                                                                                                                                                                                                                                                                                                                                                             |
| **UI Components**           | ✅         | **49 files**: AI Elements (30 in `src/components/ai-elements/`) + shadcn/ui base (19 in `ui/`). Next.js 16, React 19, Tailwind CSS 4.                                                                                                                                                                                                                                                                                                                                        |
| **Chat Components**         | ✅ Dec 8   | **11 components improved**: agent-task, agent-tools, agent-reasoning, agent-chain-of-thought, agent-plan, agent-sources, agent-suggestions, agent-queue, agent-confirmation, agent-checkpoint, chat-input. Production-grade enhancements. **Fixed chat input background noise.**                                                                                                                                                                                             |
| **Mastra Client SDK**       | ✅         | **lib/mastra-client.ts**: MastraClient instance for client-side agent calls.                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Next.js Frontend**        | ✅         | **app/layout.tsx**: Root layout with ThemeProvider. **app/page.tsx**: Landing page with agent overview. **app/chat/page.tsx**: Full chat interface with AI Elements.                                                                                                                                                                                                                                                                                                         |
| **AI Elements Integration** | ✅ 92%     | **app/chat/**: 12/13 tasks complete. All features integrated. Model selector with 150+ models. Pending: E2E tests only.                                                                                                                                                                                                                                                                                                                                                      |
| **Networks UI**             | ✅         | **app/networks/**: Full network interface with model selector, routing visualization, agent coordination. Shares model config with chat.                                                                                                                                                                                                                                                                                                                                     |
| **Workflows UI**            | ✅ 100%    | **app/workflows/**: Full Canvas visualization with 8 components, AI SDK streaming, input panels. **12 workflows** (added repoIngestion, specGeneration). Fixed pending/skipped status bug. **Fixed node blurriness.**                                                                                                                                                                                                                                                        |
| **UI Clarity Fix**          | ✅ 2026-01 | Added `ui-crisp` scoped overrides to disable backdrop-blur/noise/3D transforms on `/chat` + `/workflows` to prevent Windows text softening.                                                                                                                                                                                                                                                                                                                                  |
| **Mastra Admin Dashboard**  | 🔄 70%     | **app/dashboard/**: TanStack Query v5 installed, shared components created, loading/error files for all routes. See `/memory-bank/dashboard-v2/` for detailed tracking.                                                                                                                                                                                                                                                                                                      |
| **Custom Skills**           | ✅ 2026-01 | **skills/**: Enhanced 5 core skills (`generative-ui`, `multi-agent-orch`, `webapp-testing`, etc.) with automation scripts and 2026 best practices.                                                                                                                                                                                                                                                                                                                           |

## Tooling Hardening **[Synced Dec 12]**

- **Semantic tools runtime fixes**
  - `src/mastra/tools/semantic-utils.ts`: removed CommonJS `require('fs')` usage (repo is ESM) and added `unref()` on the cache cleanup interval to avoid keeping Node alive.

- **Web scraping governance + crawl behavior**
  - `src/mastra/tools/web-scraper-tool.ts`: added allowlist enforcement via `WEB_SCRAPER_ALLOWED_DOMAINS` (comma-separated domains). Requests outside the allowlist now fail with `DOMAIN_NOT_ALLOWED`.
  - `web:scraper`: `followLinks` now actually crawls internal links using Crawlee `enqueueLinks` with depth tracking.
  - Request tuning: retries/delay and headers/user-agent are applied consistently.

- **Code tools robustness**
  - `src/mastra/tools/code-search.tool.ts`: default ignore patterns (`node_modules`, `.git`, `dist`, `build`), safe regex compilation, and max file-size guard.
  - `src/mastra/tools/code-analysis.tool.ts`: supports directory targets; adds default ignore patterns; refactors file loop for readability/robustness.
  - `src/mastra/tools/multi-string-edit.tool.ts`: adds max file-size guard; invalid regex now returns a structured failed result instead of throwing.

## Dependency Audit Notes **[Dec 12]**

- **Keep (good, maintained choices)**
  - `ts-morph` (semantic TS/JS analysis)
  - `fast-glob` (file discovery)
  - `diff` (patch generation)
  - `crawlee` + `cheerio` (scraping/crawling)
  - `zod` (schemas)
  - `@opentelemetry/api` (tracing)

- **Consider tightening / de-duplicating**
  - **Motion libs**: you have both `framer-motion` and `motion` pinned to the same version. If only one is used, remove the other to reduce bundle risk.
  - **Monaco**: `@monaco-editor/react` is an `-rc` version; for production, prefer a stable tag unless you depend on the RC fixes.
  - **Multiple AI provider packages**: you have many `ai-sdk-provider-*` providers plus `@ai-sdk/*` packages. If some are unused, drop them to reduce supply-chain surface.

- **High-impact / caution**
  - `isolated-vm`: native dependency; can complicate Windows installs and serverless deploys. Keep only if you truly need strong sandboxing.
  - `playwright`: large + postinstall; keep if browser automation is needed; otherwise it materially increases install/CI time.

## Regex Hardening **[Dec 12]**

- Installed `re2` and wired it into tools that accept user-supplied regex:
  - `src/mastra/tools/code-search.tool.ts`: when `options.isRegex === true`, patterns compile using `re2` (RE2 engine).
  - `src/mastra/tools/multi-string-edit.tool.ts`: when `useRegex === true`, patterns compile using `re2`.

## npm Install Notes **[Dec 12]**

- `npm i re2` succeeded but reported peer warnings around `zod` version expectations for some AI SDK packages.
- `npm audit` reports **1 high severity vulnerability** (follow-up: review `npm audit` output and decide whether to run `npm audit fix` or pin/override).

## Monaco Editor **[Dec 12]**

- **Production worker/assets**
  - `app/components/monaco/theme-loader.ts`: configured Monaco loader to use `'/monaco/vs'`.
  - Manual asset copy: `node_modules/monaco-editor/min/vs` → `public/monaco/vs` (run once after install).
  - Postinstall script removed from package.json - assets now managed manually or via webpack plugin.

- **Webpack plugin (production builds)**
  - `next.config.ts`: added `monaco-editor-webpack-plugin` to client webpack config (languages: TypeScript, JavaScript, JSON, CSS, Markdown).
  - Note: Next 16 dev uses Turbopack (`next dev --turbopack`), so the webpack plugin primarily affects `next build`.

- **VS Code-style Workbench UI**
  - `app/components/monaco/MonacoWorkbench.tsx`: Complete VS Code-like layout with Explorer, Tabs, Editor, BottomPanel, and RightPanel.
  - `app/components/monaco/MonacoExplorer.tsx`: File explorer panel with file selection and new file creation.
  - `app/components/monaco/MonacoBottomPanel.tsx`: Bottom panel with terminal and problems tabs.
  - `app/components/monaco/MonacoRightPanel.tsx`: Right sidebar panel for workspace details.
  - State persistence: Files, active tab, theme, and view state (cursor/scroll) preserved across sessions via localStorage.
  - Tab management: Proper tab switching without editor remounts, view state preservation per tab.

## What's Next

- **Migration: Mastra v1 - Memory** (🔄 started 2025-12-06)
- Created `/memory-bank/upgrade-to-v1` with PRD, design, tasks, context and scan-results
- Next: run codemods, update types (MastraMessageV2→MastraDBMessage), move Memory processors to Agent-level, add tests

- **Mastra Admin Dashboard** (🔄 70% Complete - Priority):
  - ✅ TanStack Query v5 installed and configured
  - ✅ Created `lib/types/mastra-api.ts` with Zod v4 schemas
  - ✅ Created `app/dashboard/providers.tsx` with QueryClientProvider
  - ✅ Created `lib/hooks/use-dashboard-queries.ts` with React Query hooks
  - ✅ Created 7 shared components (`_components/`: sidebar, stat-card, data-table, etc.)
  - ✅ Updated dashboard layout to use providers
  - ✅ Added loading.tsx and error.tsx for all routes
  - ✅ Refactored dashboard home page with StatCard, EmptyState
  - ✅ Extracted agents page into modular components
  - ✅ Fixed Next.js 16 typed routes (`href as never` pattern)
  - ✅ Fixed Zod v4 syntax (`z.record(z.string(), z.unknown())`)
  - ⬜ Fix remaining type errors in memory/observability/vectors/telemetry pages
  - ⬜ Create feature components for workflows, tools pages
  - ⬜ Add auth preparation middleware structure
  - ⬜ Add unit tests for hooks
- **AI Elements Integration** (✅ 92% Complete):
  - ✅ AIEL-001-012: All core features complete
  - ⬜ AIEL-013: E2E tests with Vitest (optional)

- **Mastra Client SDK Integration** (✅ Complete Nov 28):
  - ✅ lib/mastra-client.ts: MastraClient instance
  - ✅ app/layout.tsx: Root layout with ThemeProvider
  - ✅ app/page.tsx: Landing page with agent overview
  - ✅ app/chat/page.tsx: Full chat with AI Elements

- **UI/Frontend Development** (✅ Chat Complete):
  - ✅ Chat interface built with AI Elements components
  - ✅ Model selector and conversation views implemented
  - ✅ Wired to Mastra agents via API routes

- **Research & Document Processing Feature** (✅ Complete):
  - ✅ ResearchPaperAgent: Search arXiv, download papers, parse PDFs
  - ✅ DocumentProcessingAgent: PDF→markdown, document chunking
  - ✅ KnowledgeIndexingAgent: PgVector indexing, semantic search with reranking
  - ✅ ResearchPipelineNetwork: Coordinates full research workflow

- **Workflows Integration** (✅ Complete Nov 26):
  - ✅ All 10 workflows registered in index.ts
  - ✅ Workflows integrated into networks
  - ✅ API routes updated

- **Documentation Sync** (✅ Complete Nov 27):
  - ✅ All AGENTS.md files synced with current state
  - ✅ README.md updated to v3.2.0
  - ✅ Memory bank files updated with UI components

- **CSV Agents Feature** (✅ Complete):
  - ✅ DataExportAgent, DataIngestionAgent, DataTransformationAgent
  - ✅ DataPipelineNetwork, ReportGenerationNetwork
- Add or update tests to cover new tools/agents and improve Vitest coverage (see `src/mastra` and `src/mastra/config/tests`), using `tests/test-results/test-results.json` as a baseline for tracking.
- Tighten alignment between AGENTS docs and actual code (ensure every documented agent/tool exists and vice versa).
- Expand evaluation and observability dashboards (Arize/Phoenix) using the existing exporters and scorer outputs.
- Flesh out the A2A coordinator’s orchestration story so that the MCP metadata and prompts reflect real, wired workflows rather than placeholders.

## Current Blockers / Risks

- Requires correct environment configuration (database connection, model API keys, financial API keys, `PHOENIX_ENDPOINT`/`PHOENIX_API_KEY`/`PHOENIX_PROJECT_NAME`, etc.) to exercise all capabilities.
- A2A coordination complexity grows with new agents; needs careful documentation and evaluation to avoid misalignment.
- JWT auth is currently stubbed; until verification is implemented and policies are enforced, flows that depend on strict auth should be treated as experimental.
