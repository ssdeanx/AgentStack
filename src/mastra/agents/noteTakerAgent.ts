import { Agent } from '@mastra/core/agent'
import { GoogleVoice } from '@mastra/voice-google'
import { LibsqlMemory } from '../config/libsql'
import { InternalSpans } from '@mastra/core/observability'

const instructions1 = `
You are an AI note assistant tasked with providing concise, structured summaries of their content... // omitted for brevity
`

export const noteTakerAgent = new Agent({
    id: 'noteTakerAgent',
    name: 'Note Taker Agent',
    instructions: instructions1,
    memory: LibsqlMemory,
    //  tools: [],
    model: 'google/gemma-4-31b-it',
    options: {
        tracingPolicy: {
            internal: InternalSpans.ALL,
        },
    },
    voice: new GoogleVoice(), // Add OpenAI voice provider with default configuration
})
