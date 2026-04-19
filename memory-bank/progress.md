# Progress Update (2026-04-18 - Blender MCP / FPV research)

- Confirmed the official Blender MCP server supports Blender 5.1+ and found the key safety caveat: it runs LLM-generated code in Blender without guards, so it should be isolated from sensitive data.
- Collected official Blender 3D-printing guidance for STL export and mesh validation: use Selection Only, Apply Modifiers, Scene Unit, and validate meshes with the bundled 3D Print Toolbox for watertightness, non-manifold edges, thickness, intersections, distortion, and overhangs.
- Reviewed the Thingiverse Rocket Drone reference and the fiber-optic FPV reference pages to guide the upcoming Blender modeling pass for the rocket shell and fiber reel/spool components.
- Verified the SoloGood F722 stack mounting standard from live listings: 30.5x30.5 mm M3 mounting, FC board area around 41.5x42 mm, 3–6S input, 5V/10V dual BEC, and a 60A 4in1 ESC; this means the Rocket Drone shell needs a 5"-specific mount/clearance redesign rather than a uniform scale-up.
- Incorporated the current target camera/frame specs: YoungRC 1800TVL micro camera at 19x19x20 mm, and a Readytosky 250 mm / 5" carbon-fiber frame with 4 mm arms and 30.5x30.5 FC mounting holes; this shifts the nose and camera mount target away from the Rocket Drone’s original 14 mm nano-camera layout.
- Rewrote `blender.md` into a reusable between-chat FPV build note and confirmed the Blender scene is connected, the Rocket Drone STL pack is imported, and the current BlenderMCP integration status is PolyHaven enabled, Sketchfab disabled, Hyper3D Rodin enabled, and Hunyuan3D disabled.
- Started the actual Blender redesign pass: created backup and working collections, generated scaled `_R1` shell variants for 5-inch fitting, added `FitGuides_5inch` hardware envelopes, and created first custom-fit parts (`Cam_Mount_19mm_R1`, `Stack_Mount_30p5_R1`).
- Continued Blender redesign with `R2` shell edits: hollowed the main body, added diagonal arm-clearance tunnels, hollowed the rear/bottom shell with a service slot, cut the nose camera cavity/lens opening, and exported an interim STL set to `The Rocket Drone/redesign-r2`.
- Completed precision `R3` refinement: fixed incorrect custom mount sizing, performed BVH overlap checks against stack/VTX/camera guides, resolved the VTX interference, verified zero-overlap outcomes for the critical guides, and exported a precision STL set to `The Rocket Drone/redesign-r3`.
- Completed full all-parts `R4` package to address every legacy STL slot: exported updated body, bottom, nose, motor-covers, and camera-mount files (plus stack-mount add-on) to `The Rocket Drone/redesign-r4`, with non-manifold checks reporting zero on key R4 parts.
- Resolved "incorrect placement" scene confusion by hiding mixed revision/guides for review mode, creating a clean `R4` assembly display state, and placing four assembly motor covers at motor positions (while preserving print-layout objects separately).
- Completed targeted `R5` fix for the four requested parts (camera, nose, bottom, main): rebuilt joint boundaries to remove overlap, replaced the camera part with a non-flat U-bracket mount, and exported only those four corrected STLs to `The Rocket Drone/redesign-r5-targeted`.
- Completed `R6` stability/surface optimization for the same four parts: applied conservative outer-shell cleanup, reinforced the bottom with internal ribs, and exported verified files to `The Rocket Drone/redesign-r6-stable` (`01_Bottom_Part_R6.stl`, `02_Main_Body_R6.stl`, `Nose_V2.0_R6.stl`, `Cam_Mount_V3_R6.stl`).
- After testing several main-body closure experiments, finalized the stable main-body choice as `02_Main_Body_R8`, exported with canonical name `02_Main_Body_FINAL.stl` in `The Rocket Drone/redesign-r6-stable`.
- Updated the canonical single final body section with missing mounts and stronger frame connection: created `Main_Body_SECTION_FINAL_v2`, added reinforced mount platform with 30.5 mm M3 hole pattern + strap slots/ribs, and exported to `The Rocket Drone/FINAL-BODY-SECTION/Main_Body_SECTION_FINAL.stl`.
- Reworked after user feedback about protruding bars and ineffective fin placement: exported corrected clean v3 set in `The Rocket Drone/FINAL-BODY-SECTION/v3-clean-join-controlfins` with files `RocketBody_Main_CleanRearMount_v3.stl`, `RocketBody_Bottom_RearMount_v3.stl`, `RocketBody_ControlFin_Left_v2.stl`, and `RocketBody_ControlFin_Right_v2.stl`.
- Built and exported `RocketDrone_PrintRelease_R01` production package with clearly named release STLs, corrected sizing pass (M3 Ø3.40 policy), QC coupons for socket/motor pattern validation, and print go/no-go documentation (`00_README_PRINT_ORDER.txt`, `04_GO_NO_GO_CHECKLIST.txt`).
- Completed reference-fidelity optimization pass with final cleaned exports in `The Rocket Drone/FINAL-BODY-SECTION/reference-match-r06-final`: `RocketBody_Main_ReferenceMatch_R06_Final.stl`, `RocketBody_Bottom_ReferenceMatch_R06_Final.stl`, `RocketBody_Nose_ReferenceMatch_R06_Final.stl`.
- Per user escalation, executed subagent-driven repair workflow and produced `reference-match-r08-production`; identified bottom-only topology defect in R08 and released `reference-match-r08-production-hotfix` with clean-bottom replacement and consistent naming for print use.
- Replaced non-matching custom variants with a strict reference visual match based on user images and exported clean set to `The Rocket Drone/FINAL-BODY-SECTION/reference-match-r01-clean` with `RocketBody_Main_ReferenceMatch_R01.stl`, `RocketBody_Bottom_ReferenceMatch_R01.stl`, and `RocketBody_Nose_ReferenceMatch_R01.stl`.

# Progress Update (2026-04-17 - weavingapi TBC-only cache and world latency)

- Updated `src/mastra/public/workspace/weavingapi.md` to a TBC-only shaman weaving implementation with cached spell-rank resolution and world-latency-aware cast timing.
- Preserved the explicit spell-ID table as the hot-path gate while keeping the Vanilla/TBC Lightning Bolt, Chain Lightning, Healing Wave, Lesser Healing Wave, and Chain Heal rank groups cached once.
- Switched the main timing path to `GetTimePreciseSec()` when available, with `GetTime()` fallback, and made `GetNetStats()` refresh on every prediction pass instead of using a half-second cache window.
- Kept world latency as the primary offset with home/realm latency as fallback, and refreshed spell haste automatically on each prediction pass so rating and aura changes stay in sync.
- Tracked the active spell during casts so `UNIT_AURA` and other refresh events can re-predict the live cast immediately instead of waiting for the next cast event.
- Kept `SWING_TIMER_WILL_CLIPPED` payload compatibility by continuing to emit cast duration rather than absolute timestamps.
- Left `src/mastra/public/workspace/swingtimer.md` untouched.
- Hardened the shared spellcast handler so stop/interrupt events clear stale casting state, and untracked cast starts now emit an explicit clear update instead of leaving the weaving HUD stuck on a previous cast.

# Progress Update (2026-04-17 - swingtimer precise-clock and aura refresh)

- Updated `src/mastra/public/workspace/swingtimer.md` to use `_G.GetTimePreciseSec` (with `GetTime` fallback) for precise melee swing timing while keeping latency frame-cached, and bumped the swingtimer version/changelog to reflect the final delta-correction and reset-safe behavior.
- Seeded the latency cache on load, removed the duplicate shadowed latency helper path, and switched combat latency to prefer the world connection so swing timing tracks the combat channel first.
- Changed `UNIT_AURA` to rescale swing speed immediately, added `PLAYER_TALENT_UPDATE` so melee speed also resyncs after talent swaps, wired the swing delta event into the actual swing reset/speed-change paths, made the main/off delta correction track observed swing error instead of staying at zero and zero itself during equipment resets, and added a real `ResetTimers()` implementation for equipment changes while leaving the parry branch untouched.

# Progress Update (2026-04-16 - technical-analysis diagnostics fixed)

- Resolved the final `get_errors` issues in `src/mastra/tools/technical-analysis.tool.ts` by correcting leaked return-type annotations, re-typing the MACD/ADX mappings, and restarting the VS Code TypeScript server.
- Confirmed `src/mastra/tools/technical-analysis.tool.ts` is now clean under VS Code diagnostics.
- Confirmed `src/mastra/agents/researchAgent.ts` remains clean after the technical-analysis tool wiring.

# Progress Update (2026-04-16 - technical-analysis hook cleanup and research-agent expansion)

- Refactored `src/mastra/tools/technical-analysis.tool.ts` to use shared hook-logging helpers instead of repeated raw `messages.length` reads across the tool lifecycle hooks.
- Replaced the broad `unknown`/`any`-style result casts in the technical-analysis tool with explicit result interfaces for Ichimoku, trend, momentum, volatility, volume, statistical, market summary, and aggregated technical analysis outputs.
- Added the full technical-analysis suite to `src/mastra/agents/researchAgent.ts` so the research agent can call the new indicator and pattern tools directly.
- Targeted ESLint validation on the two edited files is clean.

# Progress Update (2026-04-16 - SerpAPI production-grade expansion)

- Confirmed `src/mastra/tools/serpapi-shopping.tool.ts` is now clean after rechecking live diagnostics with `get_errors`.
- Added two new SerpAPI-backed production tools:
  - `googleLocalTool` for business discovery and normalized local-result lookups.
  - `googleMapsReviewsTool` for place reviews, topics, and place-info extraction.
- Added `googleImagesTool` for image discovery, inline image cards, suggested searches, and compact knowledge-graph summaries.
- Wired the new tools into `src/mastra/tools/index.ts` and `src/mastra/agents/researchAgent.ts`, and validated the edited integration files with `get_errors`.
- The new tools and integration points are currently clean in targeted diagnostics.

# Progress Update (2026-04-16 - FastEmbed bootstrap hardening)

- Added `warmup()` from `@mastra/fastembed` to `src/mastra/config/libsql.ts` so the base model cache is preloaded before memory semantic recall starts.
- Kept the LibSQL vector setup intact while aligning it to the `fastembed.base` 768-dimension model path and shared `memory_messages_768` index name.
- Remaining risk: if the local FastEmbed cache is already corrupted from a previous failed download, the cached model directory under `C:\Users\ssdsk\.cache\mastra\fastembed-models\fast-bge-base-en-v1.5` may still need to be cleared once.

# Progress Update (2026-04-16 - chat shell redesign and theme cleanup)

- Reworked the highest-leverage shared chat surfaces instead of styling routes in isolation:
  - `app/chat/components/chat-page-shell.tsx` now supports a cleaner shared header, wider centered content rhythm, and `fullBleed` mode for immersive routes.
  - `app/chat/components/chat-settings-shell.tsx` now uses the same calmer panel treatment for user/admin section navigation.
  - `app/chat/components/main-sidebar.tsx` now uses the refined sidebar surface, denser navigation cards, and consistent dataset iconography.
- Brought the two remaining shell outliers onto the shared chat system:
  - `app/chat/builder/page.tsx` now renders inside `ChatPageShell` + `MainSidebar` instead of custom chrome.
  - `app/chat/workflows/page.tsx` now renders inside the shared shell with `fullBleed` mode so the workflow canvas keeps its immersive layout without losing the persistent sidebar.
- Softened the most aggressive visual effects that were driving the “greenish / bento / glassy” feel:
  - `app/layout.tsx` no longer applies `mesh-gradient` to the entire app body.
  - `app/globals.css` now defines calmer chat shell, sidebar, panel, toolbar, and canvas utilities and removes the old green/yellow mesh tint.
  - `chat-input.tsx`, `chat-messages.tsx`, `chat-layout.tsx`, `code-layout.tsx`, and workflow canvas/header surfaces now use the more restrained treatment.
- Fixed two runtime regressions discovered during live verification:
  - restored `MASTRA_API_BASE_URL` export from `lib/mastra-client.ts`
  - fixed `ChatProvider` to derive runtime agent ids from `useAgents()` array items instead of `Object.keys(...)`, which was incorrectly producing `"0"` and causing `/api/agents/0` requests
- Validation:
  - ✅ targeted IDE diagnostics are clean for the edited shell, workflow, builder, layout, and client/hook files
  - ✅ targeted ESLint passes for the edited chat UI files plus `chat-context.tsx`, `use-mastra-query.ts`, and `lib/mastra-client.ts`
  - ✅ Next.js dev-server errors are clear after the fixes
  - ✅ browser verification confirms `/chat/workflows` no longer throws the React Flow parent-height warning
  - ⚠️ browser verification of `/chat/builder` still depends on the Mastra backend at `http://localhost:4111`; with that service offline the page shows expected connection-refused errors for live runtime data

# Progress Update (2026-04-15 - runtime chat metadata cutover)

- Replaced the chat shell’s hardcoded agent/model presentation dependency with a runtime-first layer in `app/chat/lib/runtime-chat-catalog.ts`.
- `app/chat/providers/chat-context.tsx` no longer builds `agentConfig` from `app/chat/config/agents.ts`; it now derives a runtime agent surface from live `useAgent(...)` data.
- `app/chat/components/chat-header.tsx` now renders agent groups from live `useAgents()` data and model groups from live `useAgentModelProviders()` data instead of `app/chat/config/agents.ts` / `app/chat/config/models.ts`.
- `app/chat/components/chat-sidebar.tsx` now uses the runtime category labels and exposes live browser/workspace/skill counts from the active agent surface.
- The chat input/messages surfaces continue to consume `agentConfig`, but that contract is now runtime-derived rather than backed by the local config registry.
- Current limitation:
  - the installed `@mastra/client-js` surface exposes browser capability metadata (`browserTools`) and related runtime-adjacent fields, but not a first-class browser/editor runtime-control resource comparable to tool providers, so this pass surfaces capabilities rather than implementing new browser/editor control endpoints.
- Validation:
  - ✅ targeted IDE diagnostics are clean for:
    - `app/chat/lib/runtime-chat-catalog.ts`
    - `app/chat/providers/chat-context.tsx`
    - `app/chat/providers/chat-context-types.ts`
    - `app/chat/components/chat-header.tsx`
    - `app/chat/components/chat-input.tsx`
    - `app/chat/components/chat-messages.tsx`
    - `app/chat/components/agent-launchpad.tsx`
    - `app/chat/providers/chat-context-hooks.ts`
  - ⚠️ `app/chat/components/chat-header.tsx` and `app/chat/components/chat-sidebar.tsx` still show existing editor hints about missing button `type` attributes on untouched buttons.

# Progress Update (2026-04-15 - Mastra client hook parity hardening)

- Tightened `lib/hooks/use-mastra-query.ts` to match the installed `@mastra/client-js` surface more precisely instead of relying on guessed wrappers or loose mutation signatures.
- `useToolProvider(...)` no longer incorrectly aliases `listToolkits()`; it now returns the actual tool-provider resource handle so provider-specific hooks can map to the real resource methods without semantic drift.
- Stored-resource mutation hooks now accept explicit `{ params, requestContext }` inputs for update/version operations where the client resource supports optional request context:
  - stored agents
  - stored prompt blocks
  - stored scorers
  - stored MCP clients
  - stored skills
- Workspace skill hooks now support the installed client’s optional `skillPath` parameter so duplicate skill names can be addressed correctly:
  - `useWorkspaceSkill(...)`
  - `useWorkspaceSkillReferences(...)`
  - `useWorkspaceSkillReference(...)`
- `useCompareStoredScorerVersions(...)` now uses the scorer-specific compare response type from `@mastra/client-js`.
- Validation:
  - ✅ `npx eslint lib/hooks/use-mastra-query.ts --max-warnings=0`
  - ⚠️ `npm run typecheck` is currently blocked by pre-existing repo/tooling issues unrelated to this hook pass:
    - unsupported `tsconfig.json` compiler options (`libReplacement`, `noUncheckedSideEffectImports`)
    - `@mdx-js/loader` declaration parsing under the current TypeScript toolchain

# Progress Update (2026-04-15 - chat provider UX + builder contract cleanup)

- `app/chat/providers/chat-context.tsx` now derives the active agent from live `useAgents()` data and reuses the shared Mastra API base URL from `lib/mastra-client.ts` instead of maintaining a duplicate local fallback.
- The chat context now exposes provider readiness metadata from `useAgentModelProviders()`:
  - `selectedProviderConnected`
  - `selectedProviderEnvVar`
  - `selectedProviderDocUrl`
- The selected-model picker now stays scoped to models actually available for the active agent/provider combination instead of showing the provider's entire global model catalog.
- `app/chat/components/chat-input.tsx` now shows provider readiness directly in the composer:
  - green/amber provider light
  - active/disconnected provider badge text
  - env-var hint in the provider picker when a provider is missing credentials
- `app/chat/components/chat-messages.tsx` now surfaces runtime context more clearly above the conversation:
  - provider/model readiness badge
  - browser/workspace capability badges
  - actionable empty-state/provider-warning copy
- `app/chat/builder/page.tsx` now uses the exact `CreateStoredAgentParams` contract from `@mastra/client-js`:
  - removed the `unknown` payload cast
  - replaced hardcoded Gemini options with live provider/model data
  - converts selected tools into `Record<string, StoredAgentToolConfig>`
  - blocks save when the selected provider is not connected
- `src/mastra/tools/fetch.tool.ts` now forwards the tool execution `abortSignal` into every downstream `httpFetch` call and no longer reads a fake module-level controller.
- `lib/mastra-client.ts` no longer exports a shared startup-time abort controller; it now exposes a `createMastraClient(abortSignal?)` helper so cancellation can be request-scoped later.
- Validation:
  - ✅ targeted IDE diagnostics are clean for `chat-context.tsx`, `chat-input.tsx`, `chat-messages.tsx`, `builder/page.tsx`, and `lib/mastra-client.ts`
  - ✅ `npx eslint app/chat/providers/chat-context.tsx app/chat/components/chat-input.tsx app/chat/components/chat-messages.tsx app/chat/builder/page.tsx lib/mastra-client.ts --max-warnings=0`
  - ⚠️ browser verification of `/chat` still depends on the Mastra backend at `http://localhost:4111`; when that service is down the UI shows provider-fetch connection failures outside this code change

# Progress Update (2026-04-15 - modular chat settings and workspace hook normalization)

- Added a shared `app/chat/components/chat-settings-shell.tsx` wrapper so route-level settings pages consistently use `ChatProvider`, `ChatPageShell`, and `MainSidebar`.
- Split settings navigation into overview + focused routes:
  - user: `profile`, `security`, `sessions`, `api-keys`, `danger-zone`
  - admin: `runtime`, `users`
- Updated `app/chat/user/_components/user-settings-panel.tsx` and `app/chat/admin/_components/admin-management-panel.tsx` to accept section props instead of duplicating Better Auth logic across new pages.
- Normalized `useWorkspaces()` in `lib/hooks/use-mastra-query.ts` to return `WorkspaceItem[]`, then removed duplicate raw workspace-response decoding from:
  - `app/chat/workspaces/page.tsx`
  - `app/chat/components/chat-sidebar.tsx`
- Brought the remaining major chat dashboard surfaces under the shared shell/sidebar composition:
  - `dataset`
  - `evaluation`
  - `observability`
  - `tools`
  - `logs`
  - `harness`
  - `mcp-a2a`
  - `workflows`
  - `workflows/[workflowId]`
- Removed the last chat-facing `PgVector` wording from `app/chat/config/agents.ts`.
- Improved shared UI/UX/cx on the core shell surfaces:
  - `main-sidebar.tsx`: added route descriptions, tooltip guidance, and scroll containers for long lists
  - `chat-settings-shell.tsx`: added horizontal scroll support and tooltips for section navigation
  - `chat-page-shell.tsx`: tightened responsive shell spacing
  - `user/page.tsx` and `admin/page.tsx`: added tooltip-backed overview cards
- Validation:
  - ✅ targeted IDE diagnostics are clean for:
    - `app/chat/components/chat-settings-shell.tsx`
    - `app/chat/user/layout.tsx`
    - `app/chat/admin/layout.tsx`
    - `app/chat/user/page.tsx`
    - `app/chat/admin/page.tsx`
    - `app/chat/user/_components/user-settings-panel.tsx`
    - `app/chat/admin/_components/admin-management-panel.tsx`
    - `app/chat/workspaces/page.tsx`
    - `app/chat/components/chat-sidebar.tsx`
    - `lib/hooks/use-mastra-query.ts`
    - `app/chat/dataset/page.tsx`
    - `app/chat/evaluation/page.tsx`
    - `app/chat/observability/page.tsx`
    - `app/chat/tools/page.tsx`
    - `app/chat/logs/page.tsx`
    - `app/chat/harness/page.tsx`
    - `app/chat/mcp-a2a/page.tsx`
    - `app/chat/workflows/page.tsx`
    - `app/chat/workflows/[workflowId]/page.tsx`
    - `app/chat/config/agents.ts`
    - `app/chat/components/chat-page-shell.tsx`
    - `app/chat/components/chat-settings-shell.tsx`
    - `app/chat/user/page.tsx`
    - `app/chat/admin/page.tsx`
  - ⚠️ `app/chat/components/main-sidebar.tsx` still shows a stale ESLint diagnostic in the editor even though the flagged line no longer contains effect-driven state logic.

# Progress Update (2026-04-15 - research agent model default repair)

- Replaced the hard-coded `google/gemma-4-31b-it:free` model in `src/mastra/agents/researchAgent.ts`.
- `researchAgent` now uses a role-aware runtime model selector:
  - admin → `google.chat('gemini-3.1-pro-preview')`
  - default → `google.chat('gemini-3.1-flash-lite-preview')`
- Validation:
  - ✅ targeted VS Code error check on `src/mastra/agents/researchAgent.ts`

# Progress Update (2026-04-15 - browser and channel hardening)

- Added a second shared scorer layer for supervisor-style agents in `src/mastra/scorers/supervisor-scorers.ts`:
  - `createSupervisorAgentPatternScorer(...)`
  - `createSupervisorChannelPatternScorer(...)`
  - `createStructuredOutputSupervisorPatternScorer(...)`
- Migrated the active supervisor-style agents to the supervisor-specific shared scorer helper instead of the lower-level base export.
- Hardened `src/mastra/browsers.ts` with:
  - environment-driven viewport/timeout/screencast settings
  - lifecycle hooks for both deterministic and Stagehand providers
  - stronger Stagehand operating instructions
- Upgraded `src/mastra/agents/browserAgent.ts` with a production-grade verification contract and deterministic browser operating workflow.
- Added optional GitHub channel support to `src/mastra/agents/researchAgent.ts`, gated behind the required webhook/auth environment variables so startup remains safe when GitHub is not configured.
- Replaced the invalid per-platform `channels.handlers.github` attempt in `researchAgent` with valid Mastra channel handlers:
  - `onDirectMessage`
  - `onMention`
  - `onSubscribedMessage`
- The subscribed-thread handler now skips acknowledgement-only follow-ups such as `thanks`, `resolved`, or `lgtm` instead of spending another research turn on low-signal churn.
- Strengthened the same handler layer with a shared `handleResearchChannelEvent(...)` helper, GitHub thread detection, and consistent metadata logging across DM, mention, and subscribed-thread events.
- Hardened Better Auth Google wiring by normalizing legacy callback env values onto `/api/auth/callback/google`, tightening client/plugin usage in `lib/auth-client.ts`, and fixing the `/login` + `/login/signup` Suspense boundary issue so the auth pages render cleanly under Next.js 16.
- Enriched `src/mastra/browsers.ts` browser hooks so launch/close events now include connection mode, runtime config, viewport, screencast, environment, and session duration metadata, plus Browserbase credential guardrails.
- Validation:
  - ✅ targeted IDE diagnostics are clean for `src/mastra/scorers/supervisor-scorers.ts`
  - ✅ targeted IDE diagnostics are clean for `src/mastra/browsers.ts`
  - ✅ targeted IDE diagnostics are clean for `src/mastra/agents/browserAgent.ts`
  - ⚠️ CLI lint/test validation remains blocked in this session because the runtime shell requires `pwsh`, which is not installed.

# Progress Update (2026-04-15 - supervisor and coordinator scorer standardization)

- Added a reusable `createSupervisorPatternScorer(...)` primitive in `src/mastra/scorers/supervisor-scorers.ts` and migrated the active supervisor-style agents plus coordinator networks to local wrappers built on that shared scorer pipeline.
- Wired `browserAgent` into the main `supervisor-agent` surface end to end:
  - exported from `src/mastra/agents/index.ts`
  - registered in `src/mastra/index.ts`
  - mounted as a child agent in `src/mastra/agents/supervisor-agent.ts`
- Tightened `supervisor-agent` delegation guidance so browser work is used only for high-value live verification rather than as a default hop.
- Validation:
  - ⚠️ CLI validation commands were blocked in this session because the runtime shell requires `pwsh`, which is not installed in the environment.

# Progress Update (2026-04-14 - strict typing and inferred tool cleanup)

- Used `BinanceAvgPrice` in the Binance tool instead of leaving it as an unused helper import.
- Added `InferUITool` exports for each market-data tool to match other Mastra tools in the repo.
- Validation:
  - ✅ targeted VS Code error checks on all market-data files
  - ✅ `vitest run src/mastra/tools/tests/market-data.helpers.test.ts`

# Progress Update (2026-04-14 - strict typing pass)

- Removed the remaining broad `any`/`unknown` usage from the market-data helpers and the four source-specific market-data tools.
- Kept the tools production-grade with explicit payload models and typed output schemas.
- Validation:
  - ✅ targeted VS Code error checks on all market-data helper/tool files
  - ✅ `vitest run src/mastra/tools/tests/market-data.helpers.test.ts`

# Progress Update (2026-04-14 - hook order corrected)

- Moved each market-data tool’s `onOutput` hook to the end of the tool config to match the `fetch.tool.ts` pattern.
- Improved the completion logs to count payload data more safely.
- Validation:
  - ✅ targeted VS Code error checks on the four updated market-data tool files

# Progress Update (2026-04-14 - final optimization pass)

- Added the new free/public market-data tools to `researchAgent` so they are actually available to the primary research workflow.
- Removed the unnecessary Coinbase trades query parameter to keep the public request surface lean.
- Validation:
  - ✅ targeted VS Code error check on `src/mastra/agents/researchAgent.ts`
  - ✅ targeted VS Code error check on `src/mastra/tools/coinbase-exchange-crypto.tool.ts`

# Progress Update (2026-04-14 - production-grade market-data tool pass)

- Renamed the modular market-data exports to clearer production-facing names.
- Expanded source-specific options so the tools are more feature-complete:
  - Binance spot market data
  - Coinbase Exchange market data
  - Stooq stock quotes/history
  - Yahoo Finance quotes/history
- Fixed the final Yahoo Finance compile issue from the rename pass.
- Validation:
  - ✅ targeted VS Code error checks on all market-data tool files and shared helpers
  - ✅ targeted VS Code error check on `src/mastra/tools/yahoo-finance-stock.tool.ts` after the final fix

# Progress Update (2026-04-14 - modular market-data refactor)

- Refactored market-data into dedicated tools per source instead of one bloated generic tool.
- Added `onOutput` hooks to every new market-data tool to match the logging pattern used by the rest of the repo.
- Final tool set now uses only free/public sources for the no-key paths:
  - Binance crypto
  - Coinbase Exchange crypto
  - Stooq stock
  - Yahoo Finance stock
- Validation:
  - ✅ VS Code error checks on all modular tool files, helper file, tests, and `src/mastra/tools/index.ts`
  - ✅ `vitest run src/mastra/tools/tests/market-data.helpers.test.ts`

# Progress Update (2026-04-14 - free market-data tools added)

- Implemented `freeCryptoMarketDataTool` in `src/mastra/tools/free-market-data.tool.ts`.
  - Primary source: Binance public market-data-only endpoints.
  - Secondary source: CoinCap (requires `COINCAP_API_KEY`).
- Implemented `freeStockMarketDataTool` in the same file.
  - Sources: Stooq and Yahoo Finance, both without API key requirements.
- Added tests in `src/mastra/tools/tests/free-market-data.test.ts` covering symbol normalization and CSV/chart parsing.
- Validation:
  - ✅ VS Code error check on `src/mastra/tools/free-market-data.tool.ts`
  - ✅ VS Code error check on `src/mastra/tools/index.ts`
  - ✅ VS Code error check on `src/mastra/tools/tests/free-market-data.test.ts`
  - ✅ `vitest run src/mastra/tools/tests/free-market-data.test.ts`

# Progress Update (2026-04-14 - crypto API research shortlist)

- Researched free crypto data providers for the requested crypto-tool set.
- Best-fit shortlist for implementation:
  - Binance public market-data-only endpoints (no auth)
  - CoinGecko free/demo API (free key)
  - CoinCap API 3.0 (real-time public market data)
  - CryptoCompare free tier (API key required)
- Existing repo crypto coverage already includes Alpha Vantage and Polygon tools, so the next feature should emphasize free/public feeds and normalization helpers.

# Progress Update (2026-04-14 - SerpAPI Scholar/trends repair)

- Patched `src/mastra/tools/serpapi-academic-local.tool.ts` to guard against undefined `messages`/`output` in the Scholar callbacks and to emit consistent start/done progress events.
- Patched `src/mastra/tools/serpapi-news-trends.tool.ts` so Google Trends sends SerpAPI-compatible date values instead of the internal hyphenated enum strings.
- Added `src/mastra/tools/tests/serpapi-tools.test.ts` covering the trends date mapper and Scholar paper-count helper.
- Validation:
  - ✅ targeted ESLint on the edited tool files and new test file
  - ✅ `vitest run src/mastra/tools/tests/serpapi-tools.test.ts`

# Progress Update (2026-04-13 - research synthesis workflow repair)

- Fixed the malformed merge in `src/mastra/workflows/research-synthesis-workflow.ts` that caused the Mastra CLI transform failure.
- Restored the topic research and synthesis steps to valid structured-streaming Mastra code.
- Validated the edited workflow file with targeted ESLint; no errors or warnings remain for that file.

# Progress Update (2026-04-03 - Mastra client-js hook parity cleanup)

- Added hooks for the newer `@mastra/client-js` observability surface in `lib/hooks/use-mastra-query.ts`: `useTraceTrajectory()` and `useObservabilityLogs()`.
- Removed the temporary legacy trace wrapper and kept the hook names focused on the current observability API.
- Renamed the new logs cache key to match the clearer hook name.
- Added concise TSDoc to the new hooks and verified there are no stale references to the removed names in the workspace.

# Progress Update (2026-04-03 - Copilot agent graph cleanup)

- Replaced wildcard subagent lists in the new SWE Copilot agents with explicit allowlists of the specialist agent names they can talk to.
- Updated the handoff prompts to name the next specialist agent directly.
- Rewrote `voidbeast-gpt41enhanced.agent.md` into a clean Copilot-native orchestration profile with no model field and a much smaller, clearer body prompt.
- Validated the new SWE/VoidBeast files: no wildcard `agents: ["*"]`, no tab-indented frontmatter, and no `model:` fields remain in that set.

# Progress Update (2026-04-03 - Copilot agent frontmatter correction)

- Normalized the new SWE Copilot agents to include the requested frontmatter fields: `disable-model-invocation: false`, `user-invocable: true`, `agents: ["*"]`, full tools, and handoffs.
- Removed the model field from `swe-beast-mode.agent.md`.
- Fixed the lone YAML indentation issue in `swe-implementer.agent.md`.

# Progress Update (2026-04-03 - GitHub Copilot SWE agent suite)

- Added a GitHub Copilot-native SWE agent suite under `.github/agents`: `swe-subagent`, `swe-planner`, `swe-researcher`, `swe-reviewer`, `swe-implementer`, `swe-devops`, `swe-documentation-writer`, `swe-browser-tester`, `swe-orchestrator`, and `swe-beast-mode`.
- Reworked the general SWE subagent to remove the older Claude-style pattern and align it with GitHub Copilot custom-agent conventions.
- Confirmed `.github/agents` contents are visible when ignored files are included, and noted that `.github/agents/*.md` is intentionally gitignored in this repository.

# Progress Update (2026-04-02 - agent launchpad workspace badge retry)

- Extended the shared agent launchpad cards to show provider, model, workspace, and tool count badges with tooltip guidance.
- Revalidated `app/chat/components/agent-launchpad.tsx` with ESLint; clean.

# Progress Update (2026-04-01 - dataset and evaluation tooltip/panel/artifact pass)

- Enhanced `app/chat/dataset/page.tsx` with a help panel, tooltip-guided actions, and an artifact-backed code preview for selected items.
- Enhanced `app/chat/evaluation/page.tsx` with a help panel, tooltip-guided controls, and an artifact-backed code preview for dataset metadata.
- Validated both pages with targeted ESLint; the pass is clean.

# Progress Update (2026-04-01 - workspace sandbox terminal + artifact preview)

- Reworked `app/chat/workspaces/page.tsx` to use sandbox hooks for file CRUD plus a workspace dropdown, floating help panel, artifact-backed code preview, and an interactive sandbox terminal with clear support.
- Cleaned `app/chat/tools/page.tsx` to use `@/` alias imports and added header tooltips for better UI guidance.
- Validated `app/chat/workspaces/page.tsx` and `app/chat/tools/page.tsx` with targeted ESLint; both are clean.

# 2026-04-01 live agent launchpad + interactive memory editor

- Replaced the deprecated static agent-config lookup in `app/chat/components/agent-launchpad.tsx` with live `useAgents()` data.
- Added a real create-thread action on agent cards via `useCreateThreadMutation()` and routed new sessions into the selected agent workspace.
- Updated `app/chat/agents/[agentId]/page.tsx` to accept `threadId` / `resourceId` query params and forward them to `ChatProvider`.
- Converted `app/chat/memory/page.tsx` into a live memory control surface with config/status/search, working-memory editing, note saving, and thread create/delete actions.
- Validation: targeted `get_errors` is clean for all touched chat surfaces.

# 2026-04-01 code agent IDE inspector

- Moved selected-file reading out of `app/chat/components/code-agent-chat.tsx` and into `app/chat/components/code-layout.tsx`.
- Added a richer IDE-style inspector to the code-agent pane using `Artifact`, `PackageInfo`, `Snippet`, `Sandbox`, `CodeBlock`, `JSXPreview`, and `StackTrace`.
- Tightened chat header usage math to use separately narrowed AI SDK usage fields.
- Validation:
  - ✅ targeted `get_errors` is clean for `app/chat/components/code-agent-chat.tsx`
  - ✅ targeted `get_errors` is clean for `app/chat/components/code-layout.tsx`
  - ✅ targeted `get_errors` is clean for `app/chat/components/chat-header.tsx`

# 2026-04-01 chat provider contract cleanup

- Moved the chat provider contract types into `app/chat/providers/chat-context.tsx` and removed the direct `chat-context-types.ts` import from the provider.
- Updated `app/chat/providers/chat-context-hooks.ts` to import `ChatContextValue` type-only from the provider file.
- Validation:
  - ✅ targeted `get_errors` is clean for `app/chat/providers/chat-context.tsx`
  - ✅ targeted `get_errors` is clean for `app/chat/providers/chat-context-hooks.ts`
  - ✅ targeted `get_errors` is clean for `app/chat/components/chat-messages.tsx`
  - ✅ targeted `get_errors` is clean for `app/chat/components/chat-input.tsx`

# 2026-04-01 chat renderer prop-type cleanup

- Replaced the direct `chat-context-types.ts` imports in `app/chat/components/chat-messages.tsx` with exact prop-derived types from the rendered ai-elements wrapper components.
- The renderer still type-checks cleanly after the replacement.
- Validation:
  - ✅ targeted `get_errors` is clean for `app/chat/components/chat-messages.tsx`
  - ✅ targeted `get_errors` is clean for `app/chat/providers/chat-context.tsx`
  - ✅ targeted `get_errors` is clean for `app/chat/components/chat-input.tsx`

# 2026-04-01 chat usage-type cleanup

- Updated `app/chat/providers/chat-context.tsx` so the provider derives `LanguageModelUsage` from the streamed finish data and keeps the existing chat context boundary intact.
- Updated `app/chat/components/chat-input.tsx` to use `LanguageModelUsage.totalTokens` for the footer token counter.
- Updated `app/chat/components/chat-messages.tsx` to show a compact usage summary badge from `LanguageModelUsage`.
- Validation:
  - ✅ targeted `get_errors` is clean for `app/chat/providers/chat-context.tsx`
  - ✅ targeted `get_errors` is clean for `app/chat/components/chat-input.tsx`
  - ✅ targeted `get_errors` is clean for `app/chat/components/chat-messages.tsx`

# 2026-03-30 chat type consolidation

- Consolidated chat module types into `app/chat/providers/chat-context-types.ts` as the canonical source of truth.
- Turned `app/chat/components/chat.types.ts` into a compatibility re-export barrel.
- Added the missing shared `AgentToolsProps` type to the canonical file.
- Cleaned remaining console/inline-style diagnostics in `app/chat/components/chat-messages.tsx` and `app/chat/components/agent-plan.tsx`.
- Validation:
  - ✅ `get_errors` is clean for `app/chat/providers/chat-context-types.ts`
  - ✅ `get_errors` is clean for `app/chat/components/chat.types.ts`
  - ✅ `get_errors` is clean for `app/chat/providers/chat-context.tsx`
  - ✅ `get_errors` is clean for `app/chat/components/chat-messages.tsx`
  - ✅ `get_errors` is clean for `app/chat/components/agent-plan.tsx`

# 2026-03-30 empty output-schema scan + chat cleanup

- Scanned `src/mastra/tools/**/*.ts` for empty `z.object({})` schemas.
- Result: no empty `outputSchema` exists; the only empty-object matches are intentional `inputSchema` declarations in `calendar-tool.ts` and `jwt-auth.tool.ts`.
- Finished the chat provider cleanup in `app/chat/providers/chat-context.tsx` using the SDK's exported tool helpers (`isToolUIPart`, `getToolName`, `lastAssistantMessageIsCompleteWithToolCalls`).
- Validation:
  - ✅ `get_errors` is clean for `app/chat/providers/chat-context.tsx`

# 2026-03-30 stream typing + workflow log cleanup

- Added `ChunkType`-based chunk capture to `src/mastra/tools/editor-agent-tool.ts` and `src/mastra/tools/financial-chart-tools.ts`.
- Restored `extractLearningsTool`'s output schema and kept its structured streaming path valid.
- Broadened `src/mastra/config/logger.ts` so `logError` accepts unknown values, then normalized workflow catch sites to pass `Error` instances.
- Validation:
  - ✅ `get_errors` is clean for `src/mastra/tools/editor-agent-tool.ts`
  - ✅ `get_errors` is clean for `src/mastra/tools/financial-chart-tools.ts`
  - ✅ `get_errors` is clean for `src/mastra/config/logger.ts`
  - ✅ `get_errors` is clean for `src/mastra/tools/extractLearningsTool.ts`
  - ✅ `get_errors` is clean for `app/chat/providers/chat-context.tsx`
  - ⚠️ Remaining workflow diagnostics are unrelated pre-existing issues in `document-processing-workflow.ts` and `governed-rag-answer.workflow.ts`

# 2026-03-30 structured tool output + chat provider typing

- Upgraded `extractLearningsTool.ts` and `evaluateResultTool.ts` to use structured output schemas with chunk-aware fallback parsing.
- Added `toModelOutput` to the wrapper tools so model-facing output is readable and stable.
- Expanded `app/chat/providers/chat-context.tsx` to use the SDK's exported AI types/helpers for message parts, source derivation, error normalization, and preview-state comparison.
- Validation:
  - ✅ targeted ESLint on `src/mastra/tools/extractLearningsTool.ts`, `src/mastra/tools/evaluateResultTool.ts`, `src/mastra/tools/copywriter-agent-tool.ts`, and `app/chat/providers/chat-context.tsx` exits cleanly

# 2026-03-28 use-mastra-query-only backend + typed request context

- Confirmed all chat backend imports already use `lib/hooks/use-mastra-query.ts`; no chat component needs `lib/hooks/use-mastra.ts`.
- Tightened the Mastra query hook request-context alias to the repo's shared `SharedRequestContextPayload` type from `src/mastra/agents/request-context.ts`.
- Verified the installed `@mastra/client-js` SDK does not expose the core sandbox execute/process/mount APIs, so the current sandbox hooks remain file/info/search oriented.
- Kept the legacy `lib/hooks/use-mastra.ts` file out of scope after the user explicitly asked not to use or modify it.

# 2026-03-28 request-context-aware supervisor agents + full supported hook usage

- Verified the supported agent execution hooks in the installed Mastra types under `node_modules/@mastra/core/dist/agent/agent.types.d.ts`.
- Confirmed the active supervisor pattern is using the relevant supported hooks:
  - delegation start
  - delegation complete
  - message filter
  - iteration complete
  - task completion scoring
- Upgraded the six active supervisor-style agents to use request-context-aware instructions and `requestContextSchema` validation.
- Expanded delegation behavior to use `modifiedInstructions` and `modifiedMaxSteps` where it improves child-agent outputs.
- Added per-agent iteration feedback so weak intermediate answers are corrected before final completion.
- Validation:
  - ✅ targeted `get_errors` clean for all six touched agent files

# 2026-03-28 dual completion scorers + prompt contract upgrade

- Added a second local completion scorer to the active supervisor-style agents so they can complete by either a full-content heuristic or a shorter execution/readiness heuristic.
- Added a second local completion scorer to the active coordinator networks for the same reason, keeping the logic inline per file.
- Tightened instructions with explicit "Final Answer Contract" sections so the LLM has a clearer target format for completion.
- Restored `src/mastra/agents/calendarAgent.ts` to its original typed shape and removed nested `calendarAgent` registration from `projectManagementAgent` instead of changing the child agent public generic.
- Validation:
  - ✅ targeted `get_errors` clean for all touched files in this pass

# 2026-03-27 network delegation hooks + local completion scorers

- Added inline `defaultOptions.delegation` hook behavior to the active coordinator networks in `src/mastra/networks`.
- Added local `createScorer(...)` completion heuristics to each touched network file instead of introducing a shared helper.
- Refined delegation prompts per child agent inside each network so routed work is more specific and less generic.
- Added delegation failure feedback plus filtered parent-message handoff in the same files.
- Validation:
  - ✅ targeted `get_errors` clean for all touched network files except `src/mastra/networks/index.ts`
  - ✅ targeted ESLint on the 12 touched network files completed without file-level errors
  - ℹ️ repo-wide `lint:ci` still fails because of many unrelated pre-existing errors outside this task

# 2026-03-27 per-agent supervisor hooks + local completion scorers

- Reworked the six supervisor-style agents to own their delegation hooks and task-completion scorers inline instead of adding a shared helper abstraction.
- Added agent-specific `defaultOptions.delegation` behavior and local `createScorer(...)` heuristics in:
  - `src/mastra/agents/supervisor-agent.ts`
  - `src/mastra/agents/customerSupportAgent.ts`
  - `src/mastra/agents/projectManagementAgent.ts`
  - `src/mastra/agents/seoAgent.ts`
  - `src/mastra/agents/socialMediaAgent.ts`
  - `src/mastra/agents/translationAgent.ts`
- Delegation prompts are now specialized per subagent role and delegation failures now feed explicit feedback back to the parent agent.
- Validation:
  - ✅ targeted `get_errors` clean for all six edited agent files

# 2026-03-24 ESLint parser fix

- Wired the installed `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` into `eslint.config.js` for all TS/TSX files.
- Restored proper workspace path handling in `src/mastra/tools/image-tool.ts` with explicit Node `fs`/`path` imports.
- Validation:
  - ✅ `eslint.config.js` linted cleanly
  - ✅ `src/mastra/tools/image-tool.ts` linted cleanly
  - ℹ️ ESLint still prints a TS 6.0.2 support warning from `@typescript-eslint/typescript-estree`, but exits 0

# 2026-03-22 workspace variants restore

- Repaired `src/mastra/workspaces.ts` and restored the broken local / AgentFS / Daytona exports.
- Preserved and used the existing workspace imports instead of removing them by wiring them into real typed config exports.
- Added a `workspaceVariants` export with 10 selectable workspace configurations.
- Validation:
  - ✅ `src/mastra/workspaces.ts` targeted ESLint pass succeeded with exit code `0`

## Completed
- Added `app/api/chat/harness/route.ts` as the shared server-side harness dashboard/action endpoint.
- Added TanStack Query harness hooks in `lib/hooks/use-harness-query.ts`.
- Built the working harness dashboard page in `app/chat/harness/page.tsx` with thread, mode, message, and approval controls.
- Validated the new harness files with targeted ESLint and confirmed the edited files are clean.

## In progress
- None currently.

## Recent completion
- Corrected the SerpAPI shopping tool contracts so Amazon uses the documented `k`/`s` params, Walmart uses `product_page_url` as a fallback link source, and eBay accepts `product_id` with a safe fallback to `item_id`.
- Expanded `src/mastra/tools/serpapi-news-trends.tool.ts` to more closely match SerpApi's documented Google News and Google Trends response sections, including richer nested schemas and additional fields per section.
- Removed the stray `mathjs` import from the news/trends module and revalidated both edited SerpApi tool files with targeted ESLint.

## Notes
- The harness UI now talks to the Mastra singleton through a thin JSON API instead of importing server harness code directly into the client.
- The dashboard query currently polls while the page is open so live harness state stays fresh.

## Completed
- Replaced the mock harness examples deck with a live workspace panel driven by real harness and repository data.
- Extended the harness route and TanStack hook to provide live workspace files, git snapshot, package metadata, env vars, terminal output, and preview URL data.
- Validated `app/api/chat/harness/route.ts`, `lib/hooks/use-harness-query.ts`, and `app/chat/harness/page.tsx` with targeted ESLint.

## In progress
- None currently.

## Notes
- The harness page now shows real workspace state rather than mock examples, while still using ai-elements for the interactive chat and diagnostics surface.

## Completed
- Added a tabbed ai-elements mock examples deck to `app/chat/harness/page.tsx`.
- Included working showcase sections for code, operations, preview, and config widgets from the docs examples.
- Revalidated the harness route, hook, and page with targeted ESLint after the refactor.

## In progress
- None currently.

## Notes
- The harness page now doubles as an IDE-style ai-elements playground, matching the mock example direction from the docs.

# Progress Update (2026-04-01 - workspace sandbox terminal + artifact preview)

- Reworked `app/chat/workspaces/page.tsx` to use sandbox hooks for file CRUD plus a workspace dropdown, floating help panel, artifact-backed code preview, and an interactive sandbox terminal with clear support.
- Cleaned `app/chat/tools/page.tsx` to use `@/` alias imports and added header tooltips for better UI guidance.
- Validated `app/chat/workspaces/page.tsx` and `app/chat/tools/page.tsx` with targeted ESLint; both are clean.

# Progress

## Completed
- Reworked `src/mastra/public/workspace/weavingapi.md` to be nil-safe for missing spell ranks, using highest-valid-rank resolution per spell family instead of hardcoded WotLK-only lookups.
- Updated weaving prediction to use live spell haste, melee haste, and latency-aware cast timing while leaving `src/mastra/public/workspace/swingtimer.md` unchanged.
- Preserved the existing WeakAuras event names and swing-state handoff contract, with safer guards around `GetSpellInfo`, `UnitAttackSpeed`, and swing clip checks.

## Completed
- Replaced the deprecated `FormEvent`-style submit typing in the auth screens with native submit-event typing.
- Redesigned `app/login/page.tsx` and `app/login/signup/page.tsx` into higher-polish split-layout auth experiences with better hierarchy, spacing, and feedback.
- Added a local remembered-identifier option on login without storing passwords in the app.
- Re-ran targeted `get_errors` on `app/login/page.tsx` and `app/login/signup/page.tsx`; both are clean.

## In progress
- None currently.

## Completed
- Updated `app/login/page.tsx` to remove deprecated `FormEvent` usage, add a remembered identifier toggle, and improve the sign-in UI with more premium styling and clearer guidance.
- Updated `app/login/signup/page.tsx` to remove deprecated `FormEvent` usage, add password confirmation, tighten validation copy, and upgrade the onboarding UI styling.
- Re-ran targeted `get_errors` on `app/login/page.tsx` and `app/login/signup/page.tsx`; both are clean.

## In progress
- None currently.

## Completed
- Reworked the chat workspace routing so `/chat` is the dashboard home, `/chat/agents` is the agent directory, and `/chat/agents/[agentId]` is the chat workspace entrypoint.
- Reworked the code flow so `/chat/Code` is the code launchpad and `/chat/Code/[agentId]` remains the IDE entrypoint.
- Added the new chat memory dashboard at `/chat/memory` and updated the sidebar so it links to all major chat surfaces without listing agents inline.
- Converted `ChatPageShell` into a reusable shell that accepts the sidebar node from the page, keeping the layout professional without the brittle shell-level sidebar import.
- Validation: targeted `get_errors` is clean for the modified chat pages, shell, sidebar, launchpad, and memory page.

## Completed
- Refactored `github-repo-overview.workflow.ts`, `github-code-context.workflow.ts`, and `github-issue-triage.workflow.ts` into multi-step parallel workflows.
- Switched `src/mastra/tools/git-local.tool.ts` to use the exported `simple-git` type surface and aligned its branch/config/stash helpers with native simple-git response fields.
- Replaced the `execa`-based git-local runner with a `simple-git`-backed compatibility shim and added `simple-git` to `package.json`.
- Added five new GitHub workflows under `src/mastra/workflows/github` with barrel exports and registry wiring:
  - `github-repo-overview.workflow.ts`
  - `github-pull-request-digest.workflow.ts`
  - `github-issue-triage.workflow.ts`
  - `github-code-context.workflow.ts`
  - `github-release-prep.workflow.ts`
- Added four modular workflow folders with streaming, tool-only workflows and barrel exports:
  - `src/mastra/workflows/coding`
  - `src/mastra/workflows/gen`
  - `src/mastra/workflows/research`
  - `src/mastra/workflows/utilities`
- Re-exported the new workflow folders from `src/mastra/workflows/index.ts` and registered them in `src/mastra/index.ts`.
- Fixed the parse error in `src/mastra/lib/http-client.ts`.
- Cleaned the targeted ESLint diagnostics in `src/mastra/tools/calculator.tool.ts`, `src/mastra/tools/calendar-tool.ts`, `src/mastra/tools/chartjs.tool.ts`, `src/mastra/tools/code-analysis.tool.ts`, and `src/components/ai-elements/tools/browser-tool.tsx`.
- Verified the targeted ESLint pass is clean for the touched files.

## In progress
- Investigating the repo-wide TypeScript blocker from `node_modules/@mdx-js/loader/index.d.cts`.

## Notes
- `npx tsc --noEmit` currently fails because of an upstream declaration syntax error in the MDX loader package, not from the edited source files.

# 2026-03-21 cron-backed fetch tool + http-client cleanup

- Added a cron-backed scheduled fetch helper in `src/mastra/tools/fetch.tool.ts` using `node-cron`.
- Kept the scheduling logic inside the same tool file so it can be reused by other tools later without creating new files.
- Cleaned `src/mastra/lib/http-client.ts` to remove the `any`-driven retry typing and keep the response wrapper Promise-safe.
- Validation:
  - ✅ targeted `get_errors` on `src/mastra/lib/http-client.ts` and `src/mastra/tools/fetch.tool.ts` returned clean

# 2026-03-20 chat sidebar trace drawer + hook cleanup

- Upgraded `app/chat/components/chat-sidebar.tsx` so traces are now clickable, more polished cards that open a drawer for full trace inspection.
- The drawer now shows trace overview data, lineage, attributes, and all events in a style that matches the observability page.
- Removed the deprecated `useMastraQuery` wrapper from the list pages and switched them to direct Mastra hooks:
  - `app/components/networks-list.tsx`
  - `app/components/tools-list.tsx`
  - `app/components/workflows-list.tsx`
- Validation:
  - ✅ `get_errors` clean for `chat-sidebar.tsx`, `networks-list.tsx`, `tools-list.tsx`, and `workflows-list.tsx`

# 2026-03-20 Mastra supervisor/fetch/doc-chunker lint cleanup

- Updated `src/mastra/agents/supervisor-agent.ts` so the async delegation/completion callbacks now include real awaits and avoid void-expression wrapping around `bail()`.
- Cleaned `src/mastra/tools/fetch.tool.ts` by replacing the static validation class with a top-level helper, removing redundant coercions/optional chains, and tightening catch typing.
- Cleaned `src/mastra/tools/document-chunking.tool.ts` by normalizing error logging, removing unsafe/duplicated optional chains, and fixing progress/template-literal diagnostics across the chunker and reranker paths.
- Validation:
  - ✅ `npx eslint "src/mastra/agents/supervisor-agent.ts" "src/mastra/tools/document-chunking.tool.ts" "src/mastra/tools/fetch.tool.ts" --max-warnings=0` → exit code `0`

# 2026-03-20 chat sidebar / route hook cleanup

- Reworked `app/chat/components/main-sidebar.tsx` so it now only lists agents and the current agent's threads.
- Swapped `app/chat/components/chat-sidebar.tsx` off the removed `useMastraQuery` factory and onto direct named hooks.
- Updated chat route pages to import concrete hooks directly instead of destructuring from `useMastraQuery`:
  - `app/chat/dataset/page.tsx`
  - `app/chat/build/page.tsx`
  - `app/chat/logs/page.tsx`
  - `app/chat/observability/page.tsx`
  - `app/chat/mcp-a2a/page.tsx`
  - `app/chat/workspaces/page.tsx`
- Added new direct-hook route pages for the empty chat routes:
  - `app/chat/tools/page.tsx`
  - `app/chat/workflows/page.tsx`
- Validation:
  - ✅ `get_errors` clean for `main-sidebar.tsx`, `chat-sidebar.tsx`, `chat/tools/page.tsx`, `chat/workflows/page.tsx`, `chat/build/page.tsx`, and `chat/workspaces/page.tsx`

# 2026-03-19 ESLint strict config recovery

- Restored `eslint.config.js` to a strict production-grade flat config that uses the installed Next and typescript-eslint packages correctly.
- Added explicit non-source ignores so ESLint stops traversing markdown, docs, memory-bank, hidden AI tool folders, and other generated/content paths.
- Added `.vscode/settings.json` to constrain VS Code ESLint validation/probing to JavaScript/TypeScript only and suppress ignored-file noise.
- Validation:
  - ✅ `npx eslint eslint.config.js --max-warnings=0`
  - ✅ `.vscode/settings.json` JSON parse check

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
# Progress Update (2026-04-15 - chat route auth and metadata hardening)

- Hardened chat-provider metadata handling so the chat UI no longer assumes a Google-specific provider payload:
  - `app/chat/components/chat.utils.ts`
  - `app/chat/components/chat-messages.tsx`
  - `app/chat/providers/chat-context.tsx`
- Fixed the false initial empty-chat validation error in `app/chat/providers/chat-context.tsx`.
- Added `credentials: 'include'` to all `DefaultChatTransport` instances that talk to the Mastra server so authenticated frontend requests can reach `http://localhost:4111`:
  - chat
  - networks
  - workflows
  - nested agent demo
- Fixed hydration mismatches on:
  - `app/login/page.tsx`
  - `app/login/signup/page.tsx`
  - `app/chat/components/main-sidebar.tsx`
- Real-browser repro findings:
  - ✅ `/chat/agents/researchAgent` no longer crashed on provider metadata access.
  - ✅ the route no longer showed the false `Messages array must not be empty` error on first load.
  - ✅ authenticated direct fetches to `http://localhost:4111/chat/researchAgent` returned a valid SSE stream start and tool-input chunks once cookies were included.
  - ⚠️ the local Next.js dev server stopped before the final post-patch browser pass could be repeated, and this session cannot restart it because the runtime lacks `pwsh` or another usable shell tool.
