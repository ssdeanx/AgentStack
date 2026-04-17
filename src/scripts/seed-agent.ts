import { google } from '@ai-sdk/google'
import { mastra } from '../mastra'

const editor = mastra.getEditor()
if (!editor) throw new Error('Editor is not registered on Mastra')

// Create a stored agent override for an existing code-defined agent
await editor.agent.create({
    id: 'support-agent',
    name: 'Support Agent',
    instructions: 'You are a friendly support agent for Acme Inc.',
    model: {
        provider: 'google',
        model: 'gemini-3.0-flash-preview',
        name: 'google/gemini-3.0-flash-preview',
    },
    tools: {
        search_kb: { description: 'Search the Acme knowledge base' },
    },
})
