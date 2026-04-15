import { AgentBrowser } from '@mastra/agent-browser'
import { StagehandBrowser } from '@mastra/stagehand'

import { log } from './config/logger'

function resolveChromeCdpUrl(): string {
  return (
    process.env.CHROME_CDP_URL?.trim() ??
    process.env.CHROME_REMOTE_DEBUGGING_URL?.trim() ??
    'http://127.0.0.1:9222'
  )
}

const sharedViewport = {
  width: 1440,
  height: 900,
}

const sharedScreencast = {
  format: 'png' as const,
  quality: 80,
  maxWidth: 1440,
  maxHeight: 900,
}

export const agentBrowser = new AgentBrowser({
  headless: false,
  viewport: sharedViewport,
  timeout: 30000,
  cdpUrl: resolveChromeCdpUrl,
  scope: 'shared',
  screencast: sharedScreencast,
  onLaunch: async ({ browser }) => {
    log.info('Shared browser connected to Chrome', {
      browserName: browser.name,
      browserId: browser.id,
    })
  },
  onClose: async ({ browser }) => {
    log.info('Shared browser disconnected from Chrome', {
      browserName: browser.name,
      browserId: browser.id,
    })
  },
})

export const stagehand = new StagehandBrowser({
  headless: false,
  model: 'google/gemini-3.1-flash-lite-preview',
  selfHeal: true,
  env: 'LOCAL',
  scope: 'shared',
  verbose: 2,
  viewport: sharedViewport,
  screencast: sharedScreencast,
  systemPrompt: 'You can browse the web using natural language. Use stagehand_act to perform actions like "click the login button". Use stagehand_extract to get data from pages, stagehand_observe	Discover actionable elements on a page, stagehand_navigate Navigate to a URL, stagehand_tabs	Manage browser tabs, stagehand_close	Close the browser'
})
