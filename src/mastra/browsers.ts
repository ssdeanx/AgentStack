import { AgentBrowser } from '@mastra/agent-browser'
import { StagehandBrowser } from '@mastra/stagehand'

const agentBrowser = new AgentBrowser({
  headless: false,
  viewport: {
    width: 1280,
    height: 720,
  },
  screencast: {
    format: 'png',
    quality: 80,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 1, // Capture every 2nd frame to reduce bandwidth
  },
})

export const stagehand = new StagehandBrowser({
  headless: false,
  model: 'google/gemini-3.1-flash-lite-preview',
  selfHeal: true,
  env: 'LOCAL',
  scope: 'shared',
  verbose: 2,
  viewport: {
    width: 1280,
    height: 720,
  },
  screencast: {
    format: 'png',
    quality: 80,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 1, // Capture every frame
  },
  systemPrompt: 'You can browse the web using natural language. Use stagehand_act to perform actions like "click the login button". Use stagehand_extract to get data from pages, stagehand_observe	Discover actionable elements on a page, stagehand_navigate Navigate to a URL, stagehand_tabs	Manage browser tabs, stagehand_close	Close the browser'
})
