# Tasks: Mastra Client SDK Integration

## Phase 1: Dependencies & Configuration

### TASK-001: Install @mastra/client-js
**Description:** Add Mastra Client SDK to project dependencies.

**Acceptance Criteria:**
- [ ] `@mastra/client-js` installed via npm
- [ ] Package appears in `package.json` dependencies
- [ ] No version conflicts

**Effort:** S

**Files:** `package.json`

**Command:**
```bash
npm install @mastra/client-js@latest
```

---

### TASK-002: Create Mastra Client Instance
**Description:** Create `lib/mastra-client.ts` with configured MastraClient.

**Acceptance Criteria:**
- [ ] File exports `mastraClient` instance
- [ ] Uses `NEXT_PUBLIC_MASTRA_API_URL` env var with fallback to `:4111`
- [ ] Configured with retry and backoff settings

**Effort:** S

**Files:** `lib/mastra-client.ts`

**Code:**
```typescript
import { MastraClient } from "@mastra/client-js";

export const mastraClient = new MastraClient({
  baseUrl: process.env.NEXT_PUBLIC_MASTRA_API_URL || "http://localhost:4111",
  retries: 3,
  backoffMs: 300,
  maxBackoffMs: 5000,
});
```

---

### TASK-003: Add Environment Variable
**Description:** Add `NEXT_PUBLIC_MASTRA_API_URL` to `.env.example`.

**Acceptance Criteria:**
- [ ] Variable documented in `.env.example`
- [ ] Default value is `http://localhost:4111`

**Effort:** S

**Files:** `.env.example`

---

## Phase 2: Core App Structure

### TASK-004: Fix Root Layout
**Description:** Implement `app/layout.tsx` with HTML structure and providers.

**Acceptance Criteria:**
- [ ] Valid HTML structure (html, body)
- [ ] ThemeProvider from next-themes
- [ ] Inter font from next/font
- [ ] Metadata with title and description
- [ ] Dark mode class on html element

**Effort:** M

**Files:** `app/layout.tsx`

**Code:**
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentStack | Multi-Agent Framework",
  description: "Production-grade multi-agent framework for AI applications",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

### TASK-005: Create Landing Page
**Description:** Implement `app/page.tsx` with agent overview.

**Acceptance Criteria:**
- [ ] Displays project title and description
- [ ] Links to `/test` (server action demo)
- [ ] Links to `/chat` (client SDK demo)
- [ ] Shows agent count and capabilities

**Effort:** M

**Files:** `app/page.tsx`

---

## Phase 3: Client SDK Demo

### TASK-006: Create Chat Page
**Description:** Create `app/chat/page.tsx` with client SDK integration.

**Acceptance Criteria:**
- [ ] Uses `mastraClient` from lib
- [ ] Calls `agent.generate()` or `agent.stream()`
- [ ] Displays agent response
- [ ] Form for user input

**Effort:** M

**Files:** `app/chat/page.tsx`, `app/chat/chat-form.tsx`

---

### TASK-007: Add Streaming Support
**Description:** Implement streaming responses using `processDataStream`.

**Acceptance Criteria:**
- [ ] Uses `agent.stream()` instead of `generate()`
- [ ] Processes chunks with `onChunk` callback
- [ ] Updates UI as chunks arrive
- [ ] Handles `text-delta` and `tool-call` chunk types

**Effort:** M

**Files:** `app/chat/chat-form.tsx`

---

## Phase 4: Documentation & Scripts

### TASK-008: Add Mastra Dev Script
**Description:** Ensure `package.json` has Mastra dev scripts.

**Acceptance Criteria:**
- [ ] `dev:mastra` script runs `mastra dev`
- [ ] `build:mastra` script runs `mastra build`
- [ ] Scripts documented in README

**Effort:** S

**Files:** `package.json`

**Note:** Current `dev` script already uses `dotenvx run -- mastra dev`. May need separate `dev:next` for Next.js.

---

### TASK-009: Update README
**Description:** Document the Next.js + Mastra integration setup.

**Acceptance Criteria:**
- [ ] Quick start instructions
- [ ] Environment variable list
- [ ] How to run both servers
- [ ] Link to Mastra docs

**Effort:** S

**Files:** `README.md`

---

## Phase 5: AI Elements Integration (Optional Enhancement)

### TASK-010: Create Chat with AI Elements
**Description:** Build chat UI using AI Elements components.

**Acceptance Criteria:**
- [ ] Uses `<Message>` for agent responses
- [ ] Uses `<PromptInput>` for user input
- [ ] Uses `<Reasoning>` for chain-of-thought display
- [ ] Styled with Tailwind

**Effort:** L

**Files:** `app/chat/page.tsx`, new components as needed

---

## Task Summary

| ID | Title | Effort | Phase | Status |
|----|-------|--------|-------|--------|
| TASK-001 | Install @mastra/client-js | S | 1 | ✅ |
| TASK-002 | Create Mastra Client Instance | S | 1 | ✅ |
| TASK-003 | Add Environment Variable | S | 1 | ✅ |
| TASK-004 | Fix Root Layout | M | 2 | ✅ |
| TASK-005 | Create Landing Page | M | 2 | ✅ |
| TASK-006 | Create Chat Page | M | 3 | ✅ |
| TASK-007 | Add Streaming Support | M | 3 | ✅ |
| TASK-008 | Add Mastra Dev Script | S | 4 | ✅ |
| TASK-009 | Update README | S | 4 | ✅ |
| TASK-010 | Create Chat with AI Elements | L | 5 | ✅ |
| TASK-011 | Create Admin Dashboard | XL | 6 | 🔄 50% |

**Legend:** S = Small (< 30 min), M = Medium (30-60 min), L = Large (> 1 hr), XL = Extra Large (> 4 hrs)

---

## Phase 6: Admin Dashboard (NEW - Dec 5, 2025)

### TASK-011: Create Admin Dashboard
**Description:** Build comprehensive admin dashboard using MastraClient for observability, memory, logs, telemetry.

**Completed (50%):**

- [x] Dashboard layout with collapsible sidebar
- [x] Dashboard home with stats overview
- [x] Agents page (list, details, tools, evaluations)
- [x] Workflows page (list, details, run execution)
- [x] Tools page (list, details, execute)
- [x] Vectors page (indexes, query, create/delete)
- [x] Memory page (threads, messages, working memory)
- [x] Observability page (traces, spans, scoring)
- [x] Logs page (system logs, run logs, filtering)
- [x] Telemetry page (metrics, analytics)
- [x] MastraClient React hooks (`lib/hooks/use-mastra.ts`)
- [x] Dashboard AGENTS.md documentation

**Remaining (Next Session):**

- [ ] Break pages into modular components
- [ ] Fix Next.js 16 routing issues (href, Link)
- [ ] Add proper error boundaries
- [ ] Implement React Query for caching
- [ ] Type MastraClient responses
- [ ] Add loading states throughout
- [ ] Unit tests for hooks
- [ ] Integration tests

**Files Created:**

```plaintext
app/dashboard/
├── layout.tsx           # Sidebar navigation
├── page.tsx             # Overview with metrics
├── AGENTS.md            # Documentation
├── agents/page.tsx      # Agent management
├── workflows/page.tsx   # Workflow execution
├── tools/page.tsx       # Tool execution
├── vectors/page.tsx     # Vector indexes
├── memory/page.tsx      # Thread management
├── observability/page.tsx # Traces & scoring
├── logs/page.tsx        # System logs
└── telemetry/page.tsx   # Metrics

lib/hooks/
└── use-mastra.ts        # 15+ MastraClient hooks
```

**Effort:** XL (4+ hours initial, 2+ hours remaining)

**Known Issues:**

1. Some `Link` href patterns need Next.js 16 compatibility
2. Pages are monolithic - need component extraction
3. Missing error boundaries
4. No data caching (should use React Query/SWR)
5. Loose TypeScript types for API responses
