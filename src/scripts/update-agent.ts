import { mastra } from '../mastra'

const editor = mastra.getEditor()!

await editor.agent.update({
  id: 'support-agent',
  instructions:
    "You are a friendly support agent for Acme Inc. Always respond in the user's language.",
})
