import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock mastra and createAgentStreamResponse to isolate POST handler logic
vi.mock('@/src/mastra', () => ({
  mastra: {
    getAgents: async () => ({ researchAgent: {}, weatherAgent: {} }),
  },
}))

const fakeResponse = new Response('ok', { status: 200 })
vi.mock('@/lib/client-stream-to-ai-sdk', () => ({
  createAgentStreamResponse: async () => fakeResponse,
}))

import { POST } from '../app/api/chat/r'

describe('app/api/chat/r - POST', () => {
  it('returns 400 when messages missing', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBeDefined()
  })

  it('uses nested data.agentId when provided', async () => {
    const payload = {
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      data: { agentId: 'researchAgent', threadId: 't1' },
    }
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify(payload) })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe('ok')
  })
})
