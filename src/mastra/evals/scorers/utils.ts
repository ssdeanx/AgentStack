import type {
    ScorerRunInputForAgent,
    ScorerRunOutputForAgent,
} from '@mastra/core/evals'

/* Utility helpers for scorers - minimal implementations used by prebuilt scorers and tests */

export interface Message {
    role: string
    content?: unknown
    id?: string
    toolInvocations?: unknown[]
}

interface ContentWithReasoning {
    reasoning?: string
    parts?: unknown[]
}

interface ReasoningPart {
    type?: string
    details?: string
}

interface ToolInvocation {
    toolName?: string
    toolCallId?: string | number
}

export type RunInput =
    | string
    | Message[]
    | { inputMessages?: Message[]; systemMessages?: Array<Message | string> }
    | undefined
export type RunOutput = string | Message | Message[] | undefined

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function toText(value: unknown): string {
    if (typeof value === 'string') {
        return value
    }

    if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    ) {
        return String(value)
    }

    if (value === null || value === undefined) {
        return ''
    }

    try {
        return JSON.stringify(value)
    } catch {
        return ''
    }
}

export function getAssistantMessageFromRunOutput(
    output: RunOutput
): string | undefined {
    if (output === undefined || output === null) {
        return undefined
    }
    if (typeof output === 'string') {
        return output
    }
    if (Array.isArray(output)) {
        const assistantMsg = output.find((msg) => msg.role === 'assistant')
        const content = toText(assistantMsg?.content)
        return content.length > 0 ? content : undefined
    }
    if (typeof output === 'object') {
        const content = toText(output.content)
        return content.length > 0 ? content : undefined
    }
    return undefined
}

export function getUserMessageFromRunInput(
    input: RunInput
): string | undefined {
    if (input === undefined) {
        return undefined
    }
    if (typeof input === 'string') {
        return input
    }
    if (Array.isArray(input)) {
        const userMsg = input.find((msg) => msg.role === 'user')
        const content = toText(userMsg?.content)
        return content.length > 0 ? content : undefined
    }
    if (typeof input === 'object') {
        const content = toText(input.inputMessages?.[0]?.content)
        return content.length > 0 ? content : undefined
    }
    return undefined
}

export function extractInputMessages(input: RunInput): string[] {
    if (input === undefined) {
        return []
    }
    if (typeof input === 'string') {
        return [input]
    }
    if (Array.isArray(input)) {
        return input.map((m) => toText(m.content))
    }
    if (typeof input === 'object' && Array.isArray(input.inputMessages)) {
        return input.inputMessages.map((m) => toText(m.content))
    }
    return []
}

export function extractAgentResponseMessages(output: RunOutput): string[] {
    if (output === undefined) {
        return []
    }
    if (typeof output === 'string') {
        return [output]
    }
    if (Array.isArray(output)) {
        return output.map((m) => toText(m.content))
    }
    if (typeof output === 'object') {
        return [toText(output.content)]
    }
    return []
}

export function getReasoningFromRunOutput(output: unknown): string | undefined {
    if (output === undefined || output === null) {
        return undefined
    }

    const messages: unknown[] = Array.isArray(output) ? output : [output]

    for (const m of messages) {
        if (!isRecord(m)) {
            continue
        }

        const { content } = m
        if (!isRecord(content)) {
            continue
        }

        const typedContent = content as ContentWithReasoning

        if (typeof typedContent.reasoning === 'string') {
            return typedContent.reasoning
        }

        if (!Array.isArray(typedContent.parts)) {
            continue
        }

        const reasoningPart = typedContent.parts.find(
            (part): part is ReasoningPart =>
                isRecord(part) && part.type === 'reasoning'
        )

        if (typeof reasoningPart?.details === 'string') {
            return reasoningPart.details
        }
    }

    return undefined
}

export function getSystemMessagesFromRunInput(input: RunInput): string[] {
    if (input === undefined) {
        return []
    }
    if (Array.isArray(input)) {
        return input
            .filter((m) => m.role === 'system')
            .map((m) => toText(m.content))
    }
    if (typeof input === 'object') {
        const sys = input.systemMessages ?? []
        return sys.map((m) =>
            typeof m === 'string' ? m : toText(m.content)
        )
    }
    return []
}

export function getCombinedSystemPrompt(input: RunInput): string {
    const msgs = getSystemMessagesFromRunInput(input)
    return msgs.join('\n\n')
}

export function extractToolCalls(output: unknown): {
    tools: string[]
    toolCallInfos: Array<{
        toolName: string
        toolCallId?: string | number
        messageIndex: number
        invocationIndex: number
    }>
} {
    const messages = Array.isArray(output) ? output : [output]
    const tools: string[] = []
    const toolCallInfos: Array<{
        toolName: string
        toolCallId?: string | number
        messageIndex: number
        invocationIndex: number
    }> = []
    messages.forEach((m: unknown, msgIdx: number) => {
        if (!isRecord(m)) {
            return
        }

        const invs = m.toolInvocations
        if (Array.isArray(invs)) {
            invs.forEach((t: unknown, invIdx: number) => {
                if (!isRecord(t)) {
                    return
                }

                const tt = t as ToolInvocation
                const toolName = typeof tt.toolName === 'string' ? tt.toolName : ''
                tools.push(toolName)
                toolCallInfos.push({
                    toolName,
                    toolCallId: tt.toolCallId,
                    messageIndex: msgIdx,
                    invocationIndex: invIdx,
                })
            })
        }
    })
    return { tools, toolCallInfos }
}

// test helpers
export function createTestMessage(opts: {
    content: string
    role?: string
    id?: string
    toolInvocations?: unknown[]
}) {
    return {
        content: opts.content,
        role: opts.role ?? 'user',
        id: opts.id ?? undefined,
        toolInvocations: opts.toolInvocations,
    }
}

export function createAgentTestRun({
    inputMessages = [],
    output = [],
}: { inputMessages?: Message[]; output?: Message[] } = {}): {
    input: ScorerRunInputForAgent
    output: ScorerRunOutputForAgent
} {
    return {
        input: {
            inputMessages: inputMessages as ScorerRunInputForAgent['inputMessages'],
            rememberedMessages: [],
            systemMessages: [],
            taggedSystemMessages: {},
        },
        output: output as ScorerRunOutputForAgent,
    }
}
