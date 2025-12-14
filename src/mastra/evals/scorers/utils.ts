/* Utility helpers for scorers - minimal implementations used by prebuilt scorers and tests */

export interface Message { role: string; content?: unknown; id?: string; toolInvocations?: unknown[] }

export type RunInput = string | Message[] | { inputMessages?: Message[]; systemMessages?: Array<Message | string> } | undefined
export type RunOutput = string | Message | Message[] | undefined

export function getAssistantMessageFromRunOutput(output: RunOutput): string | undefined {
  if (output === undefined || output === null) { return undefined }
  if (typeof output === 'string') { return output }
  if (Array.isArray(output)) {
    const assistantMsg = (output).find((msg) => msg.role === 'assistant')
    return assistantMsg?.content as string | undefined
  }
  if (typeof output === 'object') {
    // single message
    return (output).content as string | undefined
  }
  return undefined
}

export function getUserMessageFromRunInput(input: RunInput): string | undefined {
  if (!input) {return undefined}
  if (typeof input === 'string') {return input}
  if (Array.isArray(input)) {
    const userMsg = (input).find((msg) => msg.role === 'user')
    return userMsg?.content as string | undefined
  }
  if (typeof input === 'object') {
    const im = (input as { inputMessages?: Message[] }).inputMessages
    return im?.[0]?.content as string | undefined
  }
  return undefined
}

export function extractInputMessages(input: RunInput): string[] {
  if (!input) {return []}
  if (typeof input === 'string') {return [input]}
  if (Array.isArray(input)) {return (input).map((m) => String(m.content ?? ''))}
  if (typeof input === 'object' && Array.isArray((input as { inputMessages?: Message[] }).inputMessages)) {
    return (input as { inputMessages?: Message[] }).inputMessages!.map((m) => String(m.content ?? ''))
  }
  return []
}

export function extractAgentResponseMessages(output: RunOutput): string[] {
  if (!output) {return []}
  if (typeof output === 'string') {return [output]}
  if (Array.isArray(output)) {return (output).map((m) => String(m.content ?? ''))}
  if (typeof output === 'object') {return [String((output).content ?? '')]}
  return []
}

export function getReasoningFromRunOutput(output: unknown): string | undefined {
  if (!(output)) {return undefined}
  const messages: unknown[] = Array.isArray(output) ? output : [output]
  for (const m of messages) {
    if (typeof m === 'object' && m !== null) {
      const {content} = m as Record<string, unknown>
      if (typeof content === 'object' && content !== null) {
        if ((content as Record<string, unknown>).reasoning) { return (content as Record<string, unknown>).reasoning as string }
        if (Array.isArray((content as Record<string, unknown>).parts)) {
          const parts = (content as Record<string, unknown>).parts as unknown[]
          const r = parts.find((p) => typeof p === 'object' && p !== null && (p as Record<string, unknown>).type === 'reasoning') as Record<string, unknown> | undefined
          if (r) { return r.details as string | undefined }
        }
      }
    }
  }
  return undefined
}

export function getSystemMessagesFromRunInput(input: RunInput): string[] {
  if (!input) {return []}
  if (Array.isArray(input)) {return (input).filter((m) => m.role === 'system').map((m) => String(m.content ?? ''))}
  if (typeof input === 'object') {
    const sys = (input as { systemMessages?: Array<Message | string> }).systemMessages ?? []
    return sys.map((m) => typeof m === 'string' ? m : String((m).content ?? m))
  }
  return []
}

export function getCombinedSystemPrompt(input: RunInput): string {
  const msgs = getSystemMessagesFromRunInput(input)
  return msgs.join('\n\n')
}

export function extractToolCalls(output: unknown): { tools: string[]; toolCallInfos: Array<{ toolName: string; toolCallId?: string | number; messageIndex: number; invocationIndex: number }> } {
  const messages = Array.isArray(output) ? output : [output]
  const tools: string[] = []
  const toolCallInfos: Array<{ toolName: string; toolCallId?: string | number; messageIndex: number; invocationIndex: number }> = []
  messages.forEach((m: unknown, msgIdx: number) => {
    const invs = (m as Record<string, unknown>)?.toolInvocations
    if (Array.isArray(invs)) {
      invs.forEach((t: unknown, invIdx: number) => {
        const tt = t as Record<string, unknown>
        const toolName = String(tt.toolName ?? '')
        tools.push(toolName)
        toolCallInfos.push({ toolName, toolCallId: tt.toolCallId as string | number | undefined, messageIndex: msgIdx, invocationIndex: invIdx })
      })
    }
  })
  return { tools, toolCallInfos }
}

// test helpers
export function createTestMessage(opts: { content: string; role?: string; id?: string; toolInvocations?: unknown[] }) {
  return { content: opts.content, role: opts.role ?? 'user', id: opts.id ?? undefined, toolInvocations: opts.toolInvocations }
}

export function createAgentTestRun({ inputMessages = [], output = [] }: { inputMessages?: Message[]; output?: unknown[] } = {}) {
  return { input: { inputMessages }, output }
}
