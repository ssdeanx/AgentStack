## Plan: Mastra Hooks + Chat Sidebar Upgrade

Build out the remaining Mastra client-js hook surface in `lib/hooks/use-mastra-query.ts`, remove the last compatibility gaps caused by the retired `useMastraQuery` factory, and redesign the chat sidebars so they render actual agent data with shared `ui/` and AI Elements primitives instead of hardcoded feature blocks. The end state should feel production-grade, modern, and data-driven across the sidebar shell and the chat admin-style pages.

**Steps**
1. **Audit and complete the hook surface**
   - Compare `lib/hooks/use-mastra-query.ts` against the installed Mastra client-js API families and the current repo usage.
   - Verify coverage across agents, stored agents, prompt blocks, scorers, workflows, logs, traces, memory, datasets/experiments, vectors/embedders, processors, workspaces/sandbox, MCP, A2A, agent builder, and system packages.
   - Add any missing query/mutation wrappers and query keys so `use-mastra-query.ts` remains the canonical TanStack Query layer.
   - Keep the implementation aligned to the installed client-js typings, not memory or assumptions.

2. **Resolve remaining consumer compatibility**
   - Update any leftover components still importing the removed `useMastraQuery` factory, especially the public list surfaces under `app/components/`.
   - Choose one strategy and apply it consistently: either migrate all consumers to direct named hooks or add a thin compatibility adapter only if a hidden consumer truly requires it.
   - Keep `lib/hooks/use-mastra.ts` as legacy support only unless a consumer still depends on it.

3. **Redesign `chat-sidebar.tsx` into an agent detail panel**
   - Replace the current hardcoded capability list with actual agent information and live Mastra data.
   - Use agent metadata for: prompt/instructions, tools, skills, workspaces/sandbox resources, memory status, observational memory, working memory, recent threads/checkpoints, traces, and any available workflow/context summaries.
   - Rework the layout into compact, collapsible sections or cards using `Card`, `Tabs`, `Collapsible`, `Badge`, `ScrollArea`, `Separator`, and AI Elements where they fit best.
   - Prefer AI Elements primitives such as `Agent`, `AgentHeader`, `AgentContent`, `AgentTools`, `AgentInstructions`, `Tool`, `Plan`, `Task`, `Queue`, and `Checkpoint` for structured metadata blocks.
   - Keep progressive disclosure so the panel stays dense but readable, with loading, empty, and error states for each data block.

4. **Polish `main-sidebar.tsx` into a modern, collapsible nav**
   - Add a visible close/collapse control using the shared sidebar system (`SidebarTrigger` / sidebar state hooks) and an icon-based affordance.
   - Keep the existing agent and current-thread behavior, but upgrade the chrome with clearer icons, counts, and compact action buttons.
   - Preserve mobile friendliness and keyboard access through the shared `ui/sidebar` primitives.
   - Make the sidebar feel more fluent and production-ready without changing the navigation contract.

5. **Upgrade the chat route pages to surface available options**
   - Review each direct-hook page and make sure its controls match the full underlying API surface:
     - `app/chat/dataset/page.tsx`
     - `app/chat/build/page.tsx`
     - `app/chat/logs/page.tsx`
     - `app/chat/observability/page.tsx`
     - `app/chat/mcp-a2a/page.tsx`
     - `app/chat/workspaces/page.tsx`
     - `app/chat/tools/page.tsx`
     - `app/chat/workflows/page.tsx`
   - Add or refine filters, detail panes, refresh actions, pagination, search, and empty/loading/error states where those APIs support them.
   - Reuse the richer shells already present in `workspaces`, `dataset`, `observability`, and similar admin-style pages so the pages feel consistent instead of bespoke.
   - Keep `app/chat/harness/page.tsx` and the empty `[workflowId]` scaffold out of nav unless they become real routes.

6. **Prefer shared UI primitives before custom markup**
   - Reuse `ui/sidebar`, `ui/card`, `ui/tabs`, `ui/collapsible`, `ui/sheet`, `ui/resizable`, `ui/badge`, `ui/scroll-area`, and other base primitives wherever they can replace ad hoc layout.
   - Use AI Elements for rich agent/tool/plan/task displays when the content is structured enough to benefit from the specialized components.
   - Keep custom styling minimal and token-aligned so the result stays consistent with the rest of the app.

7. **Verify the full change set**
   - Run targeted `get_errors` checks on every edited file before and after the changes.
   - Search the workspace for any remaining `useMastraQuery` imports or references.
   - Smoke-test the chat routes in a browser session, especially sidebar collapse/expand, agent switching, thread selection, and the new data-driven sidebar sections.
   - Confirm the sidebar and page layouts render correctly with real data and degrade gracefully when a section is empty.

**Relevant files**
- `c:\Users\ssdsk\AgentStack\lib\hooks\use-mastra-query.ts` — canonical Mastra client-js query/mutation surface.
- `c:\Users\ssdsk\AgentStack\lib\hooks\use-mastra.ts` — legacy hook layer; keep in sync only if a consumer still depends on it.
- `c:\Users\ssdsk\AgentStack\app\chat\components\chat-sidebar.tsx` — redesign into the data-driven agent detail panel.
- `c:\Users\ssdsk\AgentStack\app\chat\components\main-sidebar.tsx` — add close/collapse behavior and modern nav affordances.
- `c:\Users\ssdsk\AgentStack\app\chat\config\agents.ts` — source for agent categories, labels, and feature metadata.
- `c:\Users\ssdsk\AgentStack\ui\sidebar.tsx` — shared sidebar shell and collapse primitives.
- `c:\Users\ssdsk\AgentStack\ui\collapsible.tsx` — section collapsing for dense metadata blocks.
- `c:\Users\ssdsk\AgentStack\ui\card.tsx` — card-based shells for sidebars and pages.
- `c:\Users\ssdsk\AgentStack\ui\tabs.tsx` — tabbed sections where the page already uses a multi-panel layout.
- `c:\Users\ssdsk\AgentStack\ui\scroll-area.tsx` — scrollable sidebar/page content.
- `c:\Users\ssdsk\AgentStack\src\components\ai-elements\agent.tsx` — agent detail primitives for prompt/tools/metadata display.
- `c:\Users\ssdsk\AgentStack\src\components\ai-elements\tool.tsx` — tool visualization primitives.
- `c:\Users\ssdsk\AgentStack\src\components\ai-elements\plan.tsx`, `task.tsx`, `queue.tsx`, `checkpoint.tsx` — structured activity/history patterns for sidebar sections.
- `c:\Users\ssdsk\AgentStack\app\components\tools-list.tsx` — leftover consumer that still needs the new hook shape or a compatibility path.
- `c:\Users\ssdsk\AgentStack\app\components\workflows-list.tsx` — leftover consumer that still needs the new hook shape or a compatibility path.
- `c:\Users\ssdsk\AgentStack\app\components\networks-list.tsx` — leftover consumer that still needs the new hook shape or a compatibility path.
- `c:\Users\ssdsk\AgentStack\app\chat\dataset\page.tsx` — richer admin-style page to keep aligned with the new hook surface.
- `c:\Users\ssdsk\AgentStack\app\chat\build\page.tsx` — builder page that should expose the full tool/agent creation options.
- `c:\Users\ssdsk\AgentStack\app\chat\logs\page.tsx` — log filters and transport controls.
- `c:\Users\ssdsk\AgentStack\app\chat\observability\page.tsx` — trace/detail browser.
- `c:\Users\ssdsk\AgentStack\app\chat\mcp-a2a\page.tsx` — MCP and A2A overview page.
- `c:\Users\ssdsk\AgentStack\app\chat\workspaces\page.tsx` — workspace/sandbox browser and file detail page.
- `c:\Users\ssdsk\AgentStack\app\chat\tools\page.tsx` — tool catalog page.
- `c:\Users\ssdsk\AgentStack\app\chat\workflows\page.tsx` — workflow catalog page.

**Verification**
1. Run targeted `get_errors` on `use-mastra-query.ts`, both chat sidebar files, and each modified page before and after edits.
2. Search the repo for `useMastraQuery` to confirm no broken consumers remain.
3. Compare the exported hook surface against the installed Mastra docs/client-js source before finalizing any missing wrappers.
4. Use browser smoke tests on `/chat`, `/chat/tools`, `/chat/workflows`, `/chat/workspaces`, `/chat/dataset`, `/chat/logs`, `/chat/observability`, and `/chat/mcp-a2a` to confirm the new nav and sidebar behavior.

**Decisions**
- Make `lib/hooks/use-mastra-query.ts` the canonical Mastra query layer for the app.
- Prefer direct named imports over a factory-style `useMastraQuery` object.
- Keep UI changes data-driven; only fall back to derived or legacy config data when the Mastra client does not expose a field directly.
- Use shared `ui/` and AI Elements primitives first; keep custom markup minimal and token-aligned.
- Leave stub routes (`harness`, empty workflow scaffold) out of navigation until they have a real product purpose.

**Further Considerations**
1. If a hidden consumer still needs the old factory shape, add a tiny compatibility adapter only after confirming it won’t reintroduce drift.
2. If `useAgent` does not expose all sidebar metadata directly, compose the panel from `useAgent` plus the dedicated memory/workspace/log hooks rather than hardcoding feature flags.
3. If the chat sidebar becomes too dense after the redesign, split the content into a narrow summary rail plus a detail drawer using `Sheet` or `ResizablePanelGroup`.
