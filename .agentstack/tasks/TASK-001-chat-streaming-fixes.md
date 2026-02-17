# TASK-001: Chat Streaming Fixes

**Status**: IN PROGRESS  
**Priority**: CRITICAL  
**Created**: 2026-02-16

## Problem Statement

1. **Blank screen during reasoning**: Agent thinks but shows nothing until text arrives
2. **Token counter broken**: Already exists in UI but shows 0 - backend sends `usage.reasoningTokens=262` but UI doesn't parse it
3. **Reasoning not displayed**: Backend sends `providerOptions.google.thoughtSignature` but UI doesn't render it

## Root Causes

### 1. Token Counter Not Working

- Backend sends in `step-finish` or `finish` parts
- UI doesn't extract from these part types
- File: `chat-context.tsx` - need to parse `step-finish` parts for usage

### 2. Reasoning Not Displayed

- Backend: `providerOptions.google.thoughtSignature` (base64 encoded)
- UI checks: `ReasoningUIPart.type === 'reasoning'`
- Mismatch: Google sends reasoning via providerMetadata, not as ReasoningUIPart
- File: `chat-context.tsx` lines 262-277 `streamingReasoning` useMemo

### 3. Blank During Reasoning

- `streamingContent` is empty during reasoning-only phase
- Loading indicator shows "Thinking..." but no reasoning content
- Need: Show `AgentReasoning` component when `streamingReasoning` has content but `streamingContent` is empty

## Backend Evidence (from logs)

```json
{
    "usage": {
        "inputTokens": 12305,
        "outputTokens": 908,
        "totalTokens": 13213,
        "reasoningTokens": 262
    },
    "providerOptions": {
        "google": {
            "thoughtSignature": "Es4ICssIAb4+9vsk+5nPbMKwgqEFaoK3BzttVElSqYCQnFewEG2J1TYiIlhkGNADgLFjRosd483aJTto3PkfhjFngu+DAXzMUoTX+pn02lLwVIHgiy+G6FDwwVaEu/3rIuQPYvS29yA+uUMomHBeWCS6UOHAUbMx4Jz/tLneDbyN35JkNA1PIOK7d5uGubBkZ3cRtLJtv1bYGUJvuBYcrylDCAp129IFdl3I0jR+WpNF+3Khk3tEFujyf4xYoC+2otS61gmyV3gDv23Fa9bpt3eRN6c/cWtN0Y5f928igx+wWVnFRwO+dbtLmovbsyLRoVr2C+4O8a4rKsZN00PaLy+ibuB4/st9pXGAoC70EFsHPcb1KhLg8igmHpXjGafhwKQ9dSBbfx09F0Yh5mP1FiKbL/AjpLuYB9wgSQZRr9FZI/FHgUme1CigXA+jx6AqoYzKAn7xaDnljR29n179UxP6YWQamdPwZZY37FO1wwlfU7hxgxvFQP/JP1u2ERl5M5ExIeOkIFIivRReYa/kNKnre4Kofy/0l9TplSGgpjKx6pHbvysYCxAWqFzriM2LoffCGMSdxxDbIdQE1cb15NRxau+MdWUOslzVmp0Uzs47r8p+rSxYYJxIB3TNiWc2sgguWwM9HwbTLFcGnt/WU7OWF5sl/woeu6J9QdUw4VbwlYNSutsK/fW8n52lI6VDC91DM+JyizBNGTgyYUClJZz/FqkVZiwpbrT0KE2Y5bXNpim2wLWT3we6Bjkf8DcEmVOCiFfou9APDgqqlHV791X7f3UtzzsIAqtUzzJS1rVMBYkTzwdm2aCgOpakzKinMAimi7pXUWweZelcAeSV0mkc/sNfLO5nAW9rZOwZFgMtXXSBi9OrWt+oBWgmo1lLA6EJpyxM0rYXwMP+LdaIvvBlOlUu3kXEU6MTzCPMDnfSzTBmWlwXEig3yOib7CkOBydVsbzFSYtYbNOwTucUZLnXaP01RcHnUrW6Rqn707tsULiD2nkxIX0jvZlSneOq7ia/MQnbsekigJDWyUeIzlUivjqsJ8T9G9a0VI0gRtwHp0/jyxUhZHb6RSfrJLQgRir+qpjnXcgEeTvtBOuIB8ONtUYut214sH05myFny0xpQwZLaiz4uDsdEBVh40oUNH72ZG4an00KgGZv772IJHOeF1buH55gKUnI+ukbkaMKe6Vc8t2+mSHQ4nGED9KV84eGYYMztjI2LtKOWLdifD/l5VYrO1GQwRRnkeAq1ns774nkYFvxMqxM/+NgCW6XOVew63f4B6XJlaIygdV5rMUVP4ZLVACqHYoRIpcWZVNNV2nv00ouCrzLABRFIIUwvIWyr5VTtNdXTGqny5e/1klcUpY0zZ8vP/QpSdzAeykdZw69wi0G0uBL5NjBnmAVSyLlO2TGoCOuIJa1MBrk8XZ37McNpzeDXYiYK+KsdfeRBQCLDkLnehFMX4QT+tIxg=="
        }
    }
}
```

## Key Files to Modify

| File                | Lines     | What to Fix                                            |
| ------------------- | --------- | ------------------------------------------------------ |
| `chat-context.tsx`  | 262-277   | `streamingReasoning` - add thoughtSignature extraction |
| `chat-context.tsx`  | ???       | Add usage extraction from `step-finish` parts          |
| `chat-messages.tsx` | 1697-1735 | Show `AgentReasoning` during reasoning-only streaming  |

## AI SDK v6 Types Needed

```typescript
import {
    // Type guards
    isReasoningUIPart,
    isTextUIPart,
    isStepStartUIPart,
    isDataUIPart,

    // Part types
    ReasoningUIPart,
    TextUIPart,
    StepStartUIPart,

    // Usage types
    FinishReason,
    StepResult,
} from 'ai'
```

## Implementation Plan

### Step 1: Fix streamingReasoning Extraction

```typescript
const streamingReasoning = useMemo(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant') {
        // 1. Check for ReasoningUIPart
        const reasoningPart = lastMessage.parts?.find(
            (p): p is ReasoningUIPart => p.type === 'reasoning'
        )
        if (reasoningPart?.text) return reasoningPart.text

        // 2. Check providerMetadata.google.thoughtSignature
        for (const part of lastMessage.parts ?? []) {
            const pm = (part as any).providerMetadata
            if (pm?.google?.thoughtSignature) {
                // thoughtSignature is base64 encoded
                try {
                    return atob(pm.google.thoughtSignature)
                } catch {
                    return pm.google.thoughtSignature
                }
            }
        }

        // 3. Fallback to extractThoughtSummaryFromParts
        return extractThoughtSummaryFromParts(lastMessage.parts)
    }
    return ''
}, [messages])
```

### Step 2: Fix Usage Extraction from step-finish

```typescript
const usage: TokenUsage | null = useMemo(() => {
    for (const message of messages) {
        if (message.role === 'assistant') {
            for (const part of message.parts ?? []) {
                if (part.type === 'step-finish' || part.type === 'finish') {
                    const usageData = (part as any).usage
                    if (usageData) {
                        return {
                            inputTokens:
                                usageData.promptTokens ??
                                usageData.inputTokens ??
                                0,
                            outputTokens:
                                usageData.completionTokens ??
                                usageData.outputTokens ??
                                0,
                            totalTokens: usageData.totalTokens ?? 0,
                            inputTokenDetails: {
                                cacheReadTokens:
                                    usageData.inputTokenDetails?.cacheRead ?? 0,
                                cacheWriteTokens:
                                    usageData.inputTokenDetails?.cacheWrite ??
                                    0,
                                noCacheTokens:
                                    usageData.inputTokenDetails?.noCache ?? 0,
                            },
                            outputTokenDetails: {
                                textTokens:
                                    usageData.outputTokenDetails?.text ?? 0,
                                reasoningTokens:
                                    usageData.outputTokenDetails?.reasoning ??
                                    0,
                            },
                        }
                    }
                }
            }
        }
    }
    return null
}, [messages])
```

### Step 3: Fix Blank During Reasoning

In chat-messages.tsx, add condition to show AgentReasoning when:

- `status === 'streaming'`
- `streamingReasoning` has content
- `streamingContent` is empty

## Notes

- Don't add token display - it EXISTS, just FIX the extraction
- Don't modify selectAgent - just needs to match agentId string
- Focus on extraction logic in chat-context.tsx
