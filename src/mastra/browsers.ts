import { AgentBrowser } from '@mastra/agent-browser'
import { StagehandBrowser } from '@mastra/stagehand'

import { log } from './config/logger'

type BrowserScope = 'shared' | 'thread'
type BrowserConnectionMode = 'browserbase' | 'cdp'
type ScreencastFormat = 'jpeg' | 'png'
type StagehandEnvironment = 'LOCAL' | 'BROWSERBASE'

const DEFAULT_CHROME_CDP_URL = 'http://localhost:9222'
const DEFAULT_BROWSER_TIMEOUT_MS = 30000
const DEFAULT_STAGEHAND_DOM_SETTLE_TIMEOUT_MS = 5000
const DEFAULT_STAGEHAND_MODEL = 'google/gemini-3.1-flash-lite-preview'
const DEFAULT_VIEWPORT_WIDTH = 1440
const DEFAULT_VIEWPORT_HEIGHT = 900

interface BrowserRuntimeProfile {
  browserLabel: string
  connectionMode: BrowserConnectionMode
  scope: BrowserScope
  headless: boolean
  timeoutMs: number
  viewport: {
    width: number
    height: number
  }
  screencast: {
    format: ScreencastFormat
    quality: number
    maxWidth: number
    maxHeight: number
    everyNthFrame: number
  }
  cdpUrl?: string
  environment?: StagehandEnvironment
}

/**
 * Reads the first non-empty environment value from the provided keys.
 */
function readStringEnv(
  keys: readonly string[],
  fallback?: string
): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()

    if (value) {
      return value
    }
  }

  return fallback
}

/**
 * Reads a positive numeric environment variable with a safe fallback.
 */
function readNumberEnv(keys: readonly string[], fallback: number): number {
  const rawValue = readStringEnv(keys)

  if (!rawValue) {
    return fallback
  }

  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback
}

/**
 * Reads a boolean-like environment variable using common true/false forms.
 */
function readBooleanEnv(keys: readonly string[], fallback: boolean): boolean {
  const rawValue = readStringEnv(keys)?.toLowerCase()

  if (!rawValue) {
    return fallback
  }

  if (['1', 'true', 'yes', 'on'].includes(rawValue)) {
    return true
  }

  if (['0', 'false', 'no', 'off'].includes(rawValue)) {
    return false
  }

  return fallback
}

/**
 * Reads the screencast image format while preserving Mastra-supported values.
 */
function readScreencastFormatEnv(
  keys: readonly string[],
  fallback: ScreencastFormat
): ScreencastFormat {
  const rawValue = readStringEnv(keys)?.toLowerCase()

  return rawValue === 'jpeg' || rawValue === 'png' ? rawValue : fallback
}

/**
 * Reads the Stagehand execution environment.
 */
function readStagehandEnvironmentEnv(
  keys: readonly string[],
  fallback: StagehandEnvironment
): StagehandEnvironment {
  const rawValue = readStringEnv(keys)?.toUpperCase()

  return rawValue === 'LOCAL' || rawValue === 'BROWSERBASE'
    ? rawValue
    : fallback
}

/**
 * Reads the Stagehand verbosity value while preserving supported levels only.
 */
function readStagehandVerboseEnv(
  keys: readonly string[],
  fallback: 0 | 1 | 2
): 0 | 1 | 2 {
  const parsedValue = readNumberEnv(keys, fallback)

  return parsedValue === 0 || parsedValue === 1 || parsedValue === 2
    ? parsedValue
    : fallback
}

/**
 * Resolves the Chrome CDP endpoint used for deterministic and Stagehand
 * browser connections.
 */
function resolveChromeCdpUrl(): string {
  return (
    readStringEnv(
      ['CHROME_CDP_URL', 'CHROME_REMOTE_DEBUGGING_URL'],
      DEFAULT_CHROME_CDP_URL
    ) ?? DEFAULT_CHROME_CDP_URL
  )
}

/**
 * Creates lifecycle hooks that log browser readiness and teardown using the
 * same production metadata across browser providers.
 */
function createBrowserLifecycleHooks(profile: BrowserRuntimeProfile) {
  const launchTimes = new Map<string, number>()

  return {
    onLaunch: async ({
      browser,
    }: {
      browser: {
        id: string
        name: string
        provider: string
        status: string
        headless: boolean
      }
    }) => {
      launchTimes.set(browser.id, Date.now())

      log.info(`${profile.browserLabel} ready`, {
        browserId: browser.id,
        browserName: browser.name,
        provider: browser.provider,
        status: browser.status,
        headless: browser.headless,
        connectionMode: profile.connectionMode,
        environment: profile.environment,
        scope: profile.scope,
        timeoutMs: profile.timeoutMs,
        viewport: profile.viewport,
        screencast: profile.screencast,
        cdpUrl: profile.cdpUrl,
      })
    },
    onClose: async ({
      browser,
    }: {
      browser: {
        id: string
        name: string
        provider: string
        status: string
        headless: boolean
      }
    }) => {
      const launchedAt = launchTimes.get(browser.id)
      log.info(`${profile.browserLabel} closed`, {
        browserId: browser.id,
        browserName: browser.name,
        provider: browser.provider,
        status: browser.status,
        headless: browser.headless,
        connectionMode: profile.connectionMode,
        environment: profile.environment,
        scope: profile.scope,
        sessionDurationMs:
          typeof launchedAt === 'number' ? Date.now() - launchedAt : undefined,
      })
      launchTimes.delete(browser.id)
    },
  }
}

const chromeCdpUrl = resolveChromeCdpUrl()
const sharedViewport = {
  width: readNumberEnv(
    ['BROWSER_VIEWPORT_WIDTH', 'AGENT_BROWSER_VIEWPORT_WIDTH'],
    DEFAULT_VIEWPORT_WIDTH
  ),
  height: readNumberEnv(
    ['BROWSER_VIEWPORT_HEIGHT', 'AGENT_BROWSER_VIEWPORT_HEIGHT'],
    DEFAULT_VIEWPORT_HEIGHT
  ),
}
const sharedScreencast = {
  format: readScreencastFormatEnv(
    ['BROWSER_SCREENCAST_FORMAT'],
    'png'
  ),
  quality: readNumberEnv(['BROWSER_SCREENCAST_QUALITY'], 80),
  maxWidth: readNumberEnv(
    ['BROWSER_SCREENCAST_MAX_WIDTH'],
    sharedViewport.width
  ),
  maxHeight: readNumberEnv(
    ['BROWSER_SCREENCAST_MAX_HEIGHT'],
    sharedViewport.height
  ),
  everyNthFrame: readNumberEnv(['BROWSER_SCREENCAST_EVERY_NTH_FRAME'], 2),
}

const agentBrowserScope = 'shared' as const
const stagehandEnvironment = readStagehandEnvironmentEnv(
  ['STAGEHAND_ENV'],
  'LOCAL'
)
const stagehandScope = 'shared' as const
const agentBrowserHeadless = readBooleanEnv(
  ['AGENT_BROWSER_HEADLESS', 'BROWSER_HEADLESS'],
  false
)
const agentBrowserTimeoutMs = readNumberEnv(
  ['AGENT_BROWSER_TIMEOUT_MS', 'BROWSER_TIMEOUT_MS'],
  DEFAULT_BROWSER_TIMEOUT_MS
)
const stagehandHeadless = readBooleanEnv(
  ['STAGEHAND_HEADLESS', 'BROWSER_HEADLESS'],
  false
)
const stagehandTimeoutMs = readNumberEnv(
  ['STAGEHAND_TIMEOUT_MS', 'BROWSER_TIMEOUT_MS'],
  DEFAULT_BROWSER_TIMEOUT_MS
)

function resolveStagehandConnectionOptions(
  environment: StagehandEnvironment,
  scope: 'shared',
  cdpUrl: string
) {
  if (environment === 'BROWSERBASE') {
    const apiKey = readStringEnv(['BROWSERBASE_API_KEY'])
    const projectId = readStringEnv(['BROWSERBASE_PROJECT_ID'])

    if (!apiKey || !projectId) {
      throw new Error(
        'StagehandBrowser requires BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID when STAGEHAND_ENV=BROWSERBASE.'
      )
    }

    return {
      apiKey,
      connectionMode: 'browserbase' as const,
      projectId,
      scope,
    }
  }

  return {
    cdpUrl,
    connectionMode: 'cdp' as const,
    scope,
  }
}

const stagehandConnectionOptions = resolveStagehandConnectionOptions(
  stagehandEnvironment,
  stagehandScope,
  chromeCdpUrl
)

const agentBrowserProfile: BrowserRuntimeProfile = {
  browserLabel: 'deterministic-agent-browser',
  cdpUrl: chromeCdpUrl,
  connectionMode: 'cdp',
  headless: agentBrowserHeadless,
  scope: agentBrowserScope,
  screencast: sharedScreencast,
  timeoutMs: agentBrowserTimeoutMs,
  viewport: sharedViewport,
}

const stagehandBrowserProfile: BrowserRuntimeProfile = {
  browserLabel: 'stagehand-browser',
  cdpUrl:
    stagehandConnectionOptions.connectionMode === 'cdp' ? chromeCdpUrl : undefined,
  connectionMode: stagehandConnectionOptions.connectionMode,
  environment: stagehandEnvironment,
  headless: stagehandHeadless,
  scope: stagehandScope,
  screencast: sharedScreencast,
  timeoutMs: stagehandTimeoutMs,
  viewport: sharedViewport,
}

export const browserRuntimeConfig = {
  chromeCdpUrl,
  sharedScreencast,
  sharedViewport,
}

export const agentBrowser = new AgentBrowser({
  headless: false,
  viewport: sharedViewport,
  timeout: agentBrowserTimeoutMs,
  cdpUrl: () => chromeCdpUrl,
  scope: agentBrowserScope,
  screencast: sharedScreencast,
  ...createBrowserLifecycleHooks(agentBrowserProfile),
})

export const stagehandBrowser = new StagehandBrowser({
  headless: false,
  model:
    readStringEnv(['STAGEHAND_MODEL'], DEFAULT_STAGEHAND_MODEL) ??
    DEFAULT_STAGEHAND_MODEL,
  selfHeal: readBooleanEnv(['STAGEHAND_SELF_HEAL'], true),
  domSettleTimeout: readNumberEnv(
    ['STAGEHAND_DOM_SETTLE_TIMEOUT_MS'],
    DEFAULT_STAGEHAND_DOM_SETTLE_TIMEOUT_MS
  ),
  env: stagehandEnvironment,
  verbose: readStagehandVerboseEnv(['STAGEHAND_VERBOSE'], 2),
  viewport: sharedViewport,
  timeout: stagehandTimeoutMs,
  screencast: sharedScreencast,
  ...stagehandConnectionOptions,
  systemPrompt: `You are a production browser operator for high-signal research and verification.

Use stagehand_navigate to reach the exact target page, stagehand_observe to discover the actionable surface, stagehand_act for natural-language interactions, and stagehand_extract when the caller needs structured facts pulled from the page.

Operating rules:
- Prefer the smallest set of navigations and interactions needed to verify the claim.
- Treat visible page text, URLs, titles, timestamps, and state transitions as evidence.
- Use tabs intentionally and close irrelevant tabs when they no longer help the task.
- Do not perform destructive, account-changing, or purchase-like actions unless the caller explicitly asks for them.
- If a page blocks progress, report the blocker clearly instead of guessing.
- When extracting data, keep the schema tight and separate verified facts from unresolved uncertainty.`,
  ...createBrowserLifecycleHooks(stagehandBrowserProfile),
})

export const stagehand = stagehandBrowser
