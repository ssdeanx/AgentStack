import { Agent } from '@mastra/core/agent'

import { LibsqlMemory } from '../config/libsql'

import { agentBrowser } from '../browsers'

export const browserAgent = new Agent({
  id: 'browser-agent',
  name: 'Browser Agent',
  description:
    'Deterministic browser agent connected to a local Chrome instance through CDP.',
  instructions: `You can browse the web using deterministic browser tools.

Use browser_snapshot first to inspect the page structure, then interact with
elements by their refs (for example @e5). Prefer precise, repeatable actions.
When the task depends on the user’s local browser state, keep the interaction
focused on the connected Chrome session rather than opening a new browser.
`,
  model: 'google/gemini-3.1-flash-lite-preview',
  browser: agentBrowser,
  memory: LibsqlMemory,
})