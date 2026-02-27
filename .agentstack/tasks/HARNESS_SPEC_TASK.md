# HARNESS_SPEC_TASK: Mastra Harness Integration for AgentSandbox

**Status**: PENDING  
**Priority**: HIGH  
**Created**: 2026-02-23

## Problem Statement

The `agent-sandbox.tsx` component currently uses a temporary `data-sandbox` event type to receive sandbox data. This is NOT the correct approach. The goal is to properly integrate the existing `mainHarness` with the chat UI components using Harness's official event subscription pattern.

## Reference Documentation

- https://mastra.ai/reference/harness/harness-class
- https://mastra.ai/reference/workspace/sandbox
- https://mastra.ai/reference/workspace/filesystem
- https://mastra.ai/reference/workspace/local-sandbox
- https://mastra.ai/reference/workspace/local-filesystem
- https://mastra.ai/reference/workspace/workspace-class

## Requirements

### Functional Requirements

| ID   | Requirement                                                                                              | Priority |
| ---- | -------------------------------------------------------------------------------------------------------- | -------- |
| FR-1 | Integrate existing `mainHarness` with `agent-sandbox.tsx` component                                      | HIGH     |
| FR-2 | Use Harness `subscribe()` pattern for event streaming to React                                           | HIGH     |
| FR-3 | Map Harness events to `AgentSandboxData` interface props                                                 | HIGH     |
| FR-4 | Support all 9 sandbox tabs: Files, Terminal, Tests, Schema, Stack Trace, Packages, Env Vars, JSX Preview | MEDIUM   |
| FR-5 | Handle workspace operations: read/write/edit files, execute commands, list files                         | HIGH     |
| FR-6 | Stream terminal output in real-time via `onStdout`/`onStderr` callbacks                                  | MEDIUM   |
| FR-7 | Support subagent invocations (explore, quick-fix) with event propagation                                 | MEDIUM   |
| FR-8 | Handle tool approval workflows when tools require user confirmation                                      | MEDIUM   |

### Non-Functional Requirements

| ID    | Requirement                                                     | Priority |
| ----- | --------------------------------------------------------------- | -------- |
| NFR-1 | React hook pattern for Harness subscription with proper cleanup | HIGH     |
| NFR-2 | Type-safe event mapping with TypeScript                         | HIGH     |
| NFR-3 | Real-time updates without polling (event-driven)                | HIGH     |
| NFR-4 | Proper memory management (unsubscribe on unmount)               | HIGH     |
| NFR-5 | Error boundary integration for Harness failures                 | MEDIUM   |

### Integration Requirements

| ID   | Requirement                                                                             | Priority |
| ---- | --------------------------------------------------------------------------------------- | -------- |
| IR-1 | Work with existing `mainWorkspace` (LocalFilesystem + LocalSandbox)                     | HIGH     |
| IR-2 | Compatible with `chat-context.tsx` message/streaming system                             | HIGH     |
| IR-3 | Support all 8 Harness modes: plan, code, review, test, refactor, research, edit, report | MEDIUM   |
| IR-4 | Integrate with existing subagents: explore, quick-fix                                   | MEDIUM   |

---

## Architecture

### Existing mainHarness Configuration

```typescript
// src/mastra/harness.ts
export const mainHarness = new Harness({
    id: 'agentstack-harness',
    resourceId: 'agentstack',
    stateSchema: harnessStateSchema,
    modes: [
        {
            id: 'plan',
            name: 'Planner',
            agent: codeArchitectAgent,
            default: true,
        },
        { id: 'code', name: 'Builder', agent: codeArchitectAgent },
        { id: 'review', name: 'Reviewer', agent: codeReviewerAgent },
        { id: 'test', name: 'Tester', agent: testEngineerAgent },
        { id: 'refactor', name: 'Refactorer', agent: refactoringAgent },
        { id: 'research', name: 'Researcher', agent: researchAgent },
        { id: 'edit', name: 'Editor', agent: editorAgent },
        { id: 'report', name: 'Reporter', agent: reportAgent },
    ],
    workspace: mainWorkspace, // LocalFilesystem + LocalSandbox
    subagents: [
        { id: 'explore', name: 'Explorer', agent: exploreAgent },
        { id: 'quick-fix', name: 'Quick Fix', agent: quickFixAgent },
    ],
})
```

### Harness Event Types (from official docs)

```typescript
// Workspace Events
type WorkspaceEvent =
    | 'workspace_status_changed'
    | 'workspace_ready'
    | 'workspace_error'

// Tool Events
type ToolEvent =
    | 'tool_start'
    | 'tool_approval_required'
    | 'tool_update'
    | 'tool_end'
    | 'tool_input_start'
    | 'tool_input_delta'
    | 'tool_input_end'

// Subagent Events
type SubagentEvent =
    | 'subagent_start'
    | 'subagent_text_delta'
    | 'subagent_tool_start'
    | 'subagent_tool_end'
    | 'subagent_end'

// Task Events
type TaskEvent = 'task_updated'

// Message Events
type MessageEvent = 'message_start' | 'message_update' | 'message_end'

// Agent Events
type AgentEvent = 'agent_start' | 'agent_end'
```

### AgentSandboxData Interface (Target)

```typescript
// app/chat/components/agent-sandbox.tsx lines 190-215
interface AgentSandboxData {
    title?: string
    description?: string
    files?: Array<SandboxFile | SandboxFolder>
    activeFile?: string
    terminalOutput?: string
    terminalIsStreaming?: boolean
    testSuites?: SandboxTestSuite[]
    testSummary?: {
        passed: number
        failed: number
        pending: number
        total: number
    }
    schema?: SandboxSchema
    stackTrace?: string
    errorType?: string
    errorMessage?: string
    preview?: string
    package?: PackageData
    packages?: PackageData[]
    environmentVariables?: EnvironmentVar[]
    jsxPreview?: JSXPreviewData
}
```

### Event-to-Data Mapping

| Harness Event                | AgentSandboxData Field(s)                 | Notes                   |
| ---------------------------- | ----------------------------------------- | ----------------------- |
| `workspace_status_changed`   | `files`, `activeFile`                     | File tree updates       |
| `tool_start` (workspace\_\*) | `files`, `terminalOutput`                 | File/command operations |
| `tool_update`                | `terminalOutput`, `terminalIsStreaming`   | Real-time stdout/stderr |
| `tool_end`                   | Clear streaming flags                     | Operation complete      |
| `tool_approval_required`     | Show confirmation dialog                  | Requires user action    |
| `subagent_start`             | `title`, `description`                    | Subagent context        |
| `subagent_text_delta`        | `terminalOutput` (if terminal mode)       | Streaming output        |
| `message_end`                | `testSuites`, `testSummary`, `schema`     | Final results           |
| `workspace_error`            | `stackTrace`, `errorType`, `errorMessage` | Error handling          |

---

## Design

### React Hook Pattern: `useHarnessSubscription`

```typescript
// lib/hooks/use-harness-subscription.ts
import { useEffect, useRef, useState } from 'react'
import { mainHarness } from '@/src/mastra/harness'
import type { AgentSandboxData } from '@/app/chat/components/agent-sandbox'

interface HarnessEvent {
    type: string
    payload: unknown
    timestamp: Date
}

export function useHarnessSubscription(resourceId: string, agentId?: string) {
    const [sandboxData, setSandboxData] = useState<AgentSandboxData>({})
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const unsubscribeRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        const handleEvent = (event: HarnessEvent) => {
            // Map event to AgentSandboxData updates
            const updates = mapEventToSandboxData(event)
            setSandboxData((prev) => ({ ...prev, ...updates }))
        }

        // Subscribe to Harness events
        const unsubscribe = mainHarness.subscribe(handleEvent)
        unsubscribeRef.current = unsubscribe
        setIsConnected(true)

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current()
                unsubscribeRef.current = null
            }
            setIsConnected(false)
        }
    }, [resourceId, agentId])

    return { sandboxData, isConnected, error }
}

function mapEventToSandboxData(event: HarnessEvent): Partial<AgentSandboxData> {
    switch (event.type) {
        case 'tool_update':
            return {
                terminalOutput: (event.payload as any).output,
                terminalIsStreaming: true,
            }
        case 'tool_end':
            return {
                terminalIsStreaming: false,
            }
        case 'workspace_status_changed':
            return {
                files: (event.payload as any).files,
                activeFile: (event.payload as any).activeFile,
            }
        // ... additional mappings
        default:
            return {}
    }
}
```

### Component Integration

```typescript
// app/chat/components/agent-sandbox.tsx
import { useHarnessSubscription } from '@/lib/hooks/use-harness-subscription'

export function AgentSandbox({
    message,
    resourceId,
    agentId,
}: AgentSandboxProps) {
    const { sandboxData, isConnected, error } = useHarnessSubscription(
        resourceId,
        agentId
    )

    // Use sandboxData for rendering tabs
    const files = sandboxData.files ?? []
    const terminalOutput = sandboxData.terminalOutput ?? ''
    const testSuites = sandboxData.testSuites ?? []

    // ... rest of component
}
```

### Workspace Tools Integration

The Harness workspace provides these tools that emit events:

| Tool                               | Events Emitted                          | UI Update              |
| ---------------------------------- | --------------------------------------- | ---------------------- |
| `mastra_workspace_read_file`       | `tool_start`, `tool_end`                | Show file content      |
| `mastra_workspace_write_file`      | `tool_start`, `tool_end`, `tool_update` | Update file tree       |
| `mastra_workspace_edit_file`       | `tool_start`, `tool_end`                | Show diff preview      |
| `mastra_workspace_list_files`      | `tool_start`, `tool_end`                | Update file tree       |
| `mastra_workspace_execute_command` | `tool_start`, `tool_update`, `tool_end` | Stream terminal output |
| `mastra_workspace_delete`          | `tool_start`, `tool_end`                | Update file tree       |
| `mastra_workspace_mkdir`           | `tool_start`, `tool_end`                | Update file tree       |
| `mastra_workspace_search`          | `tool_start`, `tool_end`                | Show search results    |

### Terminal Streaming Pattern

```typescript
// When execute_command is called via Harness
const result = await harness.executeCommand({
    command: 'npm',
    args: ['test'],
    onStdout: (data) => {
        // Emits tool_update event with stdout
        harness.emit({
            type: 'tool_update',
            payload: { output: data, stream: 'stdout' },
        })
    },
    onStderr: (data) => {
        // Emits tool_update event with stderr
        harness.emit({
            type: 'tool_update',
            payload: { output: data, stream: 'stderr' },
        })
    },
})
```

---

## Implementation Tasks

### Phase 1: Core Infrastructure (HIGH Priority)

| Task ID | Description                                    | Files                                    | Effort |
| ------- | ---------------------------------------------- | ---------------------------------------- | ------ |
| T-001   | Create `useHarnessSubscription` hook           | `lib/hooks/use-harness-subscription.ts`  | 4h     |
| T-002   | Implement `mapEventToSandboxData` event mapper | `lib/harness/event-mapper.ts`            | 3h     |
| T-003   | Add TypeScript types for Harness events        | `lib/types/harness-events.ts`            | 2h     |
| T-004   | Create Harness context provider                | `app/chat/providers/harness-context.tsx` | 3h     |

### Phase 2: Component Integration (HIGH Priority)

| Task ID | Description                                        | Files                                   | Effort |
| ------- | -------------------------------------------------- | --------------------------------------- | ------ |
| T-005   | Integrate hook with `agent-sandbox.tsx`            | `app/chat/components/agent-sandbox.tsx` | 4h     |
| T-006   | Update `chat-context.tsx` to include Harness state | `app/chat/providers/chat-context.tsx`   | 3h     |
| T-007   | Add Harness connection status to UI                | `app/chat/components/chat-header.tsx`   | 2h     |
| T-008   | Implement tool approval dialog                     | `app/chat/components/tool-approval.tsx` | 3h     |

### Phase 3: Event Streaming (MEDIUM Priority)

| Task ID | Description                                      | Files                            | Effort |
| ------- | ------------------------------------------------ | -------------------------------- | ------ |
| T-009   | Wire terminal streaming via `tool_update` events | `lib/harness/terminal-stream.ts` | 3h     |
| T-010   | Implement file tree sync on workspace events     | `lib/harness/file-sync.ts`       | 3h     |
| T-011   | Add test result streaming                        | `lib/harness/test-stream.ts`     | 2h     |
| T-012   | Handle subagent event propagation                | `lib/harness/subagent-events.ts` | 2h     |

### Phase 4: Error Handling & Polish (MEDIUM Priority)

| Task ID | Description                                    | Files                                    | Effort |
| ------- | ---------------------------------------------- | ---------------------------------------- | ------ |
| T-013   | Add error boundary for Harness failures        | `app/chat/components/harness-error.tsx`  | 2h     |
| T-014   | Implement reconnection logic                   | `lib/hooks/use-harness-subscription.ts`  | 2h     |
| T-015   | Add unit tests for event mapper                | `lib/harness/tests/event-mapper.test.ts` | 2h     |
| T-016   | Add integration tests for Harness subscription | `lib/hooks/tests/use-harness.test.ts`    | 3h     |

---

## File Structure

```
lib/
├── hooks/
│   ├── use-harness-subscription.ts    # NEW: Main hook
│   └── tests/
│       └── use-harness.test.ts       # NEW: Hook tests
├── harness/
│   ├── event-mapper.ts                # NEW: Event→Data mapping
│   ├── terminal-stream.ts             # NEW: Terminal streaming
│   ├── file-sync.ts                   # NEW: File tree sync
│   ├── test-stream.ts                 # NEW: Test result streaming
│   ├── subagent-events.ts             # NEW: Subagent handling
│   └── tests/
│       └── event-mapper.test.ts       # NEW: Mapper tests
├── types/
│   └── harness-events.ts              # NEW: Event type definitions

app/chat/
├── providers/
│   └── harness-context.tsx            # NEW: Harness context
├── components/
│   ├── agent-sandbox.tsx              # MODIFY: Integrate hook
│   ├── tool-approval.tsx              # NEW: Approval dialog
│   └── harness-error.tsx              # NEW: Error boundary
```

---

## Testing Strategy

### Unit Tests

1. **Event Mapper Tests**: Verify `mapEventToSandboxData` correctly transforms each event type
2. **Hook Tests**: Test subscription lifecycle, cleanup, error handling
3. **Type Tests**: Ensure TypeScript types match Harness API

### Integration Tests

1. **Harness Subscription**: Verify events flow through to state updates
2. **Component Rendering**: Test `AgentSandbox` receives and displays data correctly
3. **Error Scenarios**: Test error boundaries and reconnection

### Manual Testing

1. Start Harness with each mode (plan, code, review, etc.)
2. Verify file operations update UI in real-time
3. Verify terminal streaming works correctly
4. Verify test results appear after test execution
5. Verify error states are handled gracefully

---

## Dependencies

| Package        | Version | Purpose                    |
| -------------- | ------- | -------------------------- |
| `@mastra/core` | ^0.x    | Harness class, event types |
| React          | ^19.x   | Hooks, context             |
| @ai-sdk/react  | ^1.x    | Streaming integration      |

---

## Risks & Mitigations

| Risk                                     | Mitigation                                         |
| ---------------------------------------- | -------------------------------------------------- |
| Harness API changes                      | Pin Mastra version, add API compatibility tests    |
| Event flooding causes performance issues | Debounce events, batch updates                     |
| Memory leaks from subscriptions          | Strict cleanup in useEffect return                 |
| Type mismatches between events and data  | Comprehensive type definitions, runtime validation |

---

## Acceptance Criteria

- [ ] `useHarnessSubscription` hook created with proper cleanup
- [ ] All Harness events correctly mapped to `AgentSandboxData` fields
- [ ] Terminal output streams in real-time
- [ ] File tree updates on workspace operations
- [ ] Test results display correctly after test runs
- [ ] Error states handled with user-friendly messages
- [ ] All unit and integration tests pass
- [ ] No memory leaks on component unmount

---

## Notes

- **CRITICAL**: Do NOT use `data-sandbox` event type - this was temporary
- Leverage existing `mainHarness` configuration in `src/mastra/harness.ts`
- The workspace tools (`mastra_workspace_*`) emit the events we need
- Reference official Mastra docs for event signatures and payloads
