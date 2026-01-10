import { SpanType } from '@mastra/core/observability'
import type { RequestContext } from '@mastra/core/request-context'
import { createTool, type InferUITool } from '@mastra/core/tools'
import { MDocument } from '@mastra/rag'
import type { Browser } from 'playwright-core'
import { chromium } from 'playwright-core'
import { z } from 'zod'
import { log } from '../config/logger'

type UserTier = 'free' | 'pro' | 'enterprise'

export interface BrowserRequestContext extends RequestContext {
  userId?: string;
  sessionId?: string;
  'user-tier': UserTier;
}

// Browser instance cache for reuse
let browserInstance: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!(browserInstance?.isConnected() ?? false)) {
    if (browserInstance) {
      await browserInstance.close().catch(() => { }) // Close the old instance if it's not connected
    }
    browserInstance = await chromium.launch({
      headless: true,
      chromiumSandbox: false,
    })
  }
  return browserInstance!
}

export const browserTool = createTool({
  id: 'browserTool',
  description:
    'Browser Tool, opens a browser and navigates to a url capturing the content',
  inputSchema: z.object({
    url: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async (inputData, context) => {
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as BrowserRequestContext | undefined

    // Check if operation was already cancelled
    if (abortSignal?.aborted === true) {
      throw new Error('Browser operation cancelled')
    }

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'browser-scrape',
      input: inputData,
      metadata: {
        'tool.id': 'browser-scrape',
        'tool.input.url': inputData.url,
        'user.id': requestCtx?.userId,
      },
    })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        status: 'in-progress',
        message: `Input: url="${inputData.url}" - 🌐 Launching browser`,
        stage: 'browserTool',
      },
      id: 'browserTool',
    })
    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing browser scrape for user', {
          userId: requestCtx.userId,
        })
      }

      const browser = await getBrowser()
      const page = await browser.newPage()

      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' })

      const docs = MDocument.fromHTML(await page.content())

      await docs.chunk({
        strategy: 'html',
        maxSize: 300,
        sections: [
          ['h1', 'Header 1'],
          ['h2', 'Header 2'],
          ['h3', 'Header 3'],
          ['h4', 'Header 4'],
          ['h5', 'Header 5'],
          ['h6', 'Header 6'],
          ['p', 'Paragraph'],
        ],
      })

      await page.close()

      if (!docs.getText().length) {
        await context?.writer?.custom({
          type: 'data-tool-progress',
          data: { message: '⚠️ No content found' },
        })
        span?.update({
          output: { message: 'No content' },
          metadata: {
            'tool.output.success': false,
            'tool.output.reason': 'No content',
          },
        })
        span?.end()
        return { message: 'No content' }
      }

      const result = docs.getText().join('\n')
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: { message: '✅ Content extracted successfully' },
      })
      span?.update({
        output: { contentLength: result.length },
        metadata: {
          'tool.output.success': true,
          'tool.output.contentLength': result.length,
        },
      })
      span?.end()
      return { message: result }
    } catch (e) {
      // Handle AbortError specifically
      if (e instanceof Error && e.name === 'AbortError') {
        const cancelMessage = `Browser operation cancelled for ${inputData.url}`
        span?.update({
          metadata: {
            'tool.output.success': false,
            'tool.output.reason': cancelMessage,
          }
        })
        span?.end()

        await context?.writer?.custom({
          type: 'data-tool-progress',
          data: {
            status: 'done',
            message: `🛑 ${cancelMessage}`,
            stage: 'browserTool',
          },
          id: 'browserTool',
        })

        log.warn(cancelMessage)
        return { message: `Error: ${cancelMessage}` }
      }

      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      log.error(`Browser scrape failed: ${errorMsg}`)
      span?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })
      return { message: `Error: ${errorMsg}` }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Browser tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Browser tool received input chunk', {
      toolCallId,
      inputTextDelta,
      abortSignal: abortSignal?.aborted,
      messageCount: messages.length,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Browser tool received input', {
      toolCallId,
      messageCount: messages.length,
      url: input.url,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    const isSuccess =
      !output.message.includes('Error:') &&
      !output.message.includes('Failed')
    log[isSuccess ? 'info' : 'warn']('Browser tool completed', {
      toolCallId,
      toolName,
      success: isSuccess,
      message: output.message.substring(0, 100),
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export const screenshotTool = createTool({
  id: 'screenshotTool',
  description:
    'Capture a screenshot of a webpage. Returns base64-encoded PNG image.',
  inputSchema: z.object({
    url: z.string().describe('URL to screenshot'),
    fullPage: z
      .boolean()
      .optional()
      .default(false)
      .describe('Capture full page or viewport only'),
    width: z.number().optional().default(1280).describe('Viewport width'),
    height: z.number().optional().default(720).describe('Viewport height'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    screenshot: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as BrowserRequestContext | undefined
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'browser-screenshot',
      input: inputData,
      metadata: {
        'tool.id': 'browser-screenshot',
        'tool.input.url': inputData.url,
        'tool.input.fullPage': inputData.fullPage,
        'user.id': requestCtx?.userId,
      },
    })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: { message: `📸 Taking screenshot of ${inputData.url}` },
    })

    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing browser screenshot for user', {
          userId: requestCtx.userId,
        })
      }
      if (abortSignal?.aborted === true) {
        throw new Error('Screenshot operation cancelled')
      }
      const browser = await getBrowser()
      const page = await browser.newPage()
      await page.setViewportSize({
        width: inputData.width ?? 1280,
        height: inputData.height ?? 720,
      })
      await page.goto(inputData.url, { waitUntil: 'networkidle' })

      const screenshot = await page.screenshot({
        fullPage: inputData.fullPage ?? false,
        type: 'png',
      })

      await page.close()

      const base64 = screenshot.toString('base64')
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: { message: '✅ Screenshot captured' },
      })
      span?.update({
        output: { success: true },
        metadata: {
          'tool.output.success': true,
          'tool.output.size': screenshot.length,
        },
      })
      span?.end()

      return { success: true, screenshot: base64 }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      log.error(`Screenshot failed: ${errorMsg}`)
      span?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })
      return { success: false, message: errorMsg }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Screenshot tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Screenshot tool received input chunk', {
      toolCallId,
      inputTextDelta,
      abortSignal: abortSignal?.aborted,
      messageCount: messages.length,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Screenshot tool received input', {
      toolCallId,
      messageCount: messages.length,
      url: input.url,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log[output.success ? 'info' : 'warn']('Screenshot tool completed', {
      toolCallId,
      toolName,
      success: output.success,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export const pdfGeneratorTool = createTool({
  id: 'pdfGeneratorTool',
  description: 'Generate a PDF from a webpage. Returns base64-encoded PDF.',
  inputSchema: z.object({
    url: z.string().describe('URL to convert to PDF'),
    format: z.enum(['A4', 'Letter', 'Legal']).optional().default('A4'),
    landscape: z.boolean().optional().default(false),
    printBackground: z.boolean().optional().default(true),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    pdf: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as BrowserRequestContext | undefined
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'browser-pdf-generate',
      input: inputData,
      metadata: {
        'tool.id': 'browser-pdf-generate',
        'tool.input.url': inputData.url,
        'tool.input.format': inputData.format,
        'user.id': requestCtx?.userId,
      },
    })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: { message: `📄 Generating PDF from ${inputData.url}` },
    })

    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing PDF generation for user', {
          userId: requestCtx.userId,
        })
      }
      if (abortSignal?.aborted === true) {
        throw new Error('PDF generation operation cancelled')
      }
      const browser = await getBrowser()
      const page = await browser.newPage()
      await page.goto(inputData.url, { waitUntil: 'networkidle' })

      const pdf = await page.pdf({
        format: inputData.format ?? 'A4',
        landscape: inputData.landscape ?? false,
        printBackground: inputData.printBackground ?? true,
      })

      await page.close()

      const base64 = pdf.toString('base64')
      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: { message: '✅ PDF generated' },
      })
      span?.update({
        output: { success: true },
        metadata: {
          'tool.output.success': true,
          'tool.output.size': pdf.length,
        },
      })
      span?.end()

      return { success: true, pdf: base64 }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      log.error(`PDF generation failed: ${errorMsg}`)
      span?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })
      return { success: false, message: errorMsg }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('PDF generator tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('PDF generator tool received input chunk', {
      toolCallId,
      inputTextDelta,
      abortSignal: abortSignal?.aborted,
      messageCount: messages.length,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('PDF generator tool received input', {
      toolCallId,
      messageCount: messages.length,
      url: input.url,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log[output.success ? 'info' : 'warn']('PDF generator tool completed', {
      toolCallId,
      toolName,
      success: output.success,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export const clickAndExtractTool = createTool({
  id: 'clickAndExtractTool',
  description:
    'Navigate to a URL, perform click actions, and extract content. Useful for SPAs and dynamic content.',
  inputSchema: z.object({
    url: z.string().describe('URL to navigate to'),
    clickSelector: z
      .string()
      .optional()
      .describe('CSS selector of element to click before extraction'),
    waitForSelector: z
      .string()
      .optional()
      .describe('CSS selector to wait for before extraction'),
    extractSelector: z
      .string()
      .optional()
      .describe(
        'CSS selector to extract content from (defaults to body)'
      ),
    timeout: z
      .number()
      .optional()
      .default(10000)
      .describe('Timeout in milliseconds'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    content: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as BrowserRequestContext | undefined
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'browser-click-extract',
      input: inputData,
      metadata: {
        'tool.id': 'browser-click-extract',
        'tool.input.url': inputData.url,
        'tool.input.clickSelector': inputData.clickSelector,
        'user.id': requestCtx?.userId,
      },
    })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: { message: `🖱️ Navigating to ${inputData.url}` },
    })

    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing click and extract for user', {
          userId: requestCtx.userId,
        })
      }
      if (abortSignal?.aborted === true) {
        throw new Error('Click and extract operation cancelled')
      }
      const browser = await getBrowser()
      const page = await browser.newPage()
      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' })

      if (
        inputData.clickSelector !== undefined &&
        inputData.clickSelector !== null
      ) {
        await context?.writer?.custom({
          type: 'data-tool-progress',
          data: { message: `🖱️ Clicking ${inputData.clickSelector}` },
        })
        await page.click(inputData.clickSelector, {
          timeout: inputData.timeout,
        })
      }

      if (
        inputData.waitForSelector !== undefined &&
        inputData.waitForSelector !== null
      ) {
        await context?.writer?.custom({
          type: 'data-tool-progress',
          data: {
            message: `⏳ Waiting for ${inputData.waitForSelector}`,
          },
        })
        await page.waitForSelector(inputData.waitForSelector, {
          timeout: inputData.timeout,
        })
      }

      const selector = inputData.extractSelector ?? 'body'
      const content = await page.$eval(
        selector,
        (el) => el.textContent ?? ''
      )

      await page.close()

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: { message: '✅ Content extracted' },
      })
      span?.update({
        output: { contentLength: content.length },
        metadata: {
          'tool.output.success': true,
          'tool.output.contentLength': content.length,
        },
      })
      span?.end()

      return { success: true, content: content.trim() }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      log.error(`Click and extract failed: ${errorMsg}`)
      span?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })
      return { success: false, message: errorMsg }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Click and extract tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Click and extract tool received input chunk', {
      toolCallId,
      inputTextDelta,
      abortSignal: abortSignal?.aborted,
      messageCount: messages.length,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Click and extract tool received input', {
      toolCallId,
      messageCount: messages.length,
      url: input.url,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log[output.success ? 'info' : 'warn']('Click and extract tool completed', {
      toolCallId,
      toolName,
      success: output.success,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export const fillFormTool = createTool({
  id: 'fillFormTool',
  description: 'Fill out a form on a webpage and optionally submit it.',
  inputSchema: z.object({
    url: z.string().describe('URL containing the form'),
    fields: z
      .array(
        z.object({
          selector: z
            .string()
            .describe('CSS selector for the input field'),
          value: z.string().describe('Value to fill in'),
        })
      )
      .describe('Form fields to fill'),
    submitSelector: z
      .string()
      .optional()
      .describe('CSS selector for submit button'),
    waitForNavigation: z.boolean().optional().default(false),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    finalUrl: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as BrowserRequestContext | undefined
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'browser-fill-form',
      input: inputData,
      metadata: {
        'tool.id': 'browser-fill-form',
        'tool.input.url': inputData.url,
        'tool.input.fieldCount': inputData.fields.length,
        'user.id': requestCtx?.userId,
      },
    })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: { message: `📝 Filling form on ${inputData.url}` },
    })

    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing fill form for user', {
          userId: requestCtx.userId,
        })
      }
      if (abortSignal?.aborted === true) {
        throw new Error('Fill form operation cancelled')
      }
      const browser = await getBrowser()
      const page = await browser.newPage()
      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' })

      for (const field of inputData.fields) {
        await page.fill(field.selector, field.value)
      }

      if (
        inputData.submitSelector !== undefined &&
        inputData.submitSelector !== null
      ) {
        await context?.writer?.custom({
          type: 'data-tool-progress',
          data: { message: '📤 Submitting form...' },
        })
        if (inputData.waitForNavigation) {
          await Promise.all([
            page.waitForNavigation(),
            page.click(inputData.submitSelector),
          ])
        } else {
          await page.click(inputData.submitSelector)
        }
      }

      const finalUrl = page.url()
      await page.close()

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: { message: '✅ Form submitted' },
      })
      span?.update({
        output: { finalUrl },
        metadata: {
          'tool.output.success': true,
          'tool.output.finalUrl': finalUrl,
        },
      })
      span?.end()

      return { success: true, finalUrl }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      log.error(`Form fill failed: ${errorMsg}`)
      span?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })
      return { success: false, message: errorMsg }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Fill form tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Fill form tool received input chunk', {
      toolCallId,
      inputTextDelta,
      abortSignal: abortSignal?.aborted,
      messageCount: messages.length,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Fill form tool received input', {
      toolCallId,
      messageCount: messages.length,
      url: input.url,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log[output.success ? 'info' : 'warn']('Fill form tool completed', {
      toolCallId,
      toolName,
      success: output.success,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export const googleSearch = createTool({
  id: 'googleSearch',
  description:
    'Google Search. Passes the query to Google and returns the search results.',
  inputSchema: z.object({
    query: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async (inputData, context) => {
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as BrowserRequestContext | undefined
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'google-search',
      input: inputData,
      metadata: {
        'tool.id': 'google-search',
        'tool.input.query': inputData.query,
        'user.id': requestCtx?.userId,
      },
    })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: {
        message:
          '🔍 Starting Google search for "' + inputData.query + '"',
      },
    })

    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing Google search for user', {
          userId: requestCtx.userId,
        })
      }
      if (abortSignal?.aborted === true) {
        throw new Error('Google search operation cancelled')
      }
      const browser = await getBrowser()
      const page = await browser.newPage()
      await page.goto(
        `https://www.google.com/search?q=${encodeURIComponent(inputData.query)}`
      )

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: { message: '⏳ Waiting for search results...' },
      })

      try {
        await page.click('button:has-text("Accept all")', {
          timeout: 5000,
        })
      } catch {
        // Cookie dialog didn't appear, continue
      }

      await page.waitForSelector('#search')

      const text = await page.evaluate(() => {
        const links: string[] = []
        const searchResults = document.querySelectorAll('div.g a')

        searchResults.forEach((link) => {
          const href = link.getAttribute('href')
          if (href?.startsWith('http') === true) {
            links.push(href)
          }
        })

        return links
      })

      await page.close()

      if (!text.length) {
        await context?.writer?.custom({
          type: 'data-tool-progress',
          data: { message: '⚠️ No results found' },
        })
        span?.update({
          output: { message: 'No results' },
          metadata: {
            'tool.output.success': false,
            'tool.output.reason': 'No results',
          },
        })
        span?.end()
        return { message: 'No results' }
      }

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: { message: '✅ Found ' + text.length + ' results' },
      })
      span?.update({
        output: { resultCount: text.length },
        metadata: {
          'tool.output.success': true,
          'tool.output.resultCount': text.length,
        },
      })
      span?.end()
      return { message: text.join('\n') }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      log.error(`Google search failed: ${errorMsg}`)
      span?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })
      return { message: `Error: ${errorMsg}` }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Google search tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Google search tool received input chunk', {
      toolCallId,
      inputTextDelta,
      abortSignal: abortSignal?.aborted,
      messageCount: messages.length,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Google search tool received input', {
      toolCallId,
      messageCount: messages.length,
      query: input.query,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    const isSuccess =
      !output.message.includes('Error:') &&
      !output.message.includes('Failed')
    log[isSuccess ? 'info' : 'warn']('Google search tool completed', {
      toolCallId,
      toolName,
      success: isSuccess,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export const extractTablesTool = createTool({
  id: 'extractTablesTool',
  description:
    'Extract all tables from a webpage and return as structured JSON data.',
  inputSchema: z.object({
    url: z.string().describe('URL containing tables'),
    tableIndex: z
      .number()
      .optional()
      .describe(
        'Specific table index to extract (0-based), extracts all if not specified'
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    tables: z
      .array(
        z.object({
          headers: z.array(z.string()),
          rows: z.array(z.array(z.string())),
        })
      )
      .optional(),
    message: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as BrowserRequestContext | undefined
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'browser-extract-tables',
      input: inputData,
      metadata: {
        'tool.id': 'browser-extract-tables',
        'tool.input.url': inputData.url,
        'user.id': requestCtx?.userId,
      },
    })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: { message: `📊 Extracting tables from ${inputData.url}` },
    })

    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing table extraction for user', {
          userId: requestCtx.userId,
        })
      }
      if (abortSignal?.aborted === true) {
        throw new Error('Table extraction operation cancelled')
      }
      const browser = await getBrowser()
      const page = await browser.newPage()
      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' })

      const tables = await page.evaluate((tableIndex) => {
        const allTables = document.querySelectorAll('table')
        const result: Array<{ headers: string[]; rows: string[][] }> =
          []

        const tablesToProcess =
          tableIndex !== undefined
            ? [allTables[tableIndex]].filter(Boolean)
            : Array.from(allTables)

        for (const table of tablesToProcess) {
          const headers: string[] = []
          const rows: string[][] = []

          const headerCells = table.querySelectorAll('th')
          headerCells.forEach((cell) =>
            headers.push(cell.textContent?.trim() ?? '')
          )

          const bodyRows = table.querySelectorAll('tbody tr')
          bodyRows.forEach((row) => {
            const rowData: string[] = []
            row.querySelectorAll('td').forEach((cell) =>
              rowData.push(cell.textContent?.trim() ?? '')
            )
            if (rowData.length > 0) {
              rows.push(rowData)
            }
          })

          result.push({ headers, rows })
        }

        return result
      }, inputData.tableIndex)

      await page.close()

      await context?.writer?.custom({
        type: 'data-tool-progress',
        data: { message: `✅ Extracted ${tables.length} table(s)` },
      })
      span?.update({
        output: { tableCount: tables.length },
        metadata: {
          'tool.output.success': true,
          'tool.output.tableCount': tables.length,
        },
      })
      span?.end()

      return { success: true, tables }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      log.error(`Table extraction failed: ${errorMsg}`)
      span?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })
      return { success: false, message: errorMsg }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Extract tables tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Extract tables tool received input chunk', {
      toolCallId,
      inputTextDelta,
      abortSignal: abortSignal?.aborted,
      messageCount: messages.length,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Extract tables tool received input', {
      toolCallId,
      messageCount: messages.length,
      url: input.url,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log[output.success ? 'info' : 'warn']('Extract tables tool completed', {
      toolCallId,
      toolName,
      success: output.success,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export const monitorPageTool = createTool({
  id: 'monitorPageTool',
  description:
    'Monitor a webpage for changes by comparing content at intervals.',
  inputSchema: z.object({
    url: z.string().describe('URL to monitor'),
    selector: z
      .string()
      .optional()
      .describe('CSS selector to monitor (defaults to body)'),
    checkInterval: z
      .number()
      .optional()
      .default(5000)
      .describe('Interval in milliseconds between checks'),
    maxChecks: z
      .number()
      .optional()
      .default(10)
      .describe('Maximum number of checks before stopping'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    changed: z.boolean(),
    previousContent: z.string().optional(),
    currentContent: z.string().optional(),
    checkCount: z.number(),
    message: z.string().optional(),
  }),
  execute: async (inputData, context) => {
    const abortSignal = context?.abortSignal
    const tracingContext = context?.tracingContext
    const requestCtx = context?.requestContext as BrowserRequestContext | undefined
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: SpanType.TOOL_CALL,
      name: 'browser-monitor-page',
      input: inputData,
      metadata: {
        'tool.id': 'browser-monitor-page',
        'tool.input.url': inputData.url,
        'tool.input.selector': inputData.selector,
        'user.id': requestCtx?.userId,
      },
    })

    await context?.writer?.custom({
      type: 'data-tool-progress',
      data: { message: `👁️ Monitoring ${inputData.url}` },
    })

    try {
      if (typeof requestCtx?.userId === 'string') {
        log.debug('Executing page monitor for user', {
          userId: requestCtx.userId,
        })
      }
      if (abortSignal?.aborted === true) {
        throw new Error('Page monitor operation cancelled')
      }
      const browser = await getBrowser()
      const page = await browser.newPage()
      const selector = inputData.selector ?? 'body'

      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' })
      const previousContent = await page.$eval(
        selector,
        (el) => el.textContent ?? ''
      )

      let checkCount = 0
      let changed = false
      let currentContent = previousContent

      while (checkCount < (inputData.maxChecks ?? 10) && !changed) {
        await new Promise((resolve) =>
          setTimeout(resolve, inputData.checkInterval ?? 5000)
        )
        await page.reload({ waitUntil: 'domcontentloaded' })

        currentContent = await page.$eval(
          selector,
          (el) => el.textContent ?? ''
        )
        checkCount++

        if (currentContent !== previousContent) {
          changed = true
          await context?.writer?.custom({
            type: 'data-tool-progress',
            data: {
              message: `🔔 Change detected after ${checkCount} checks`,
            },
          })
        }
      }

      await page.close()

      span?.update({
        output: { success: true, changed, checkCount },
        metadata: {
          'tool.output.success': true,
          'tool.output.changed': changed,
          'tool.output.checkCount': checkCount,
        },
      })
      span?.end()
      return {
        success: true,
        changed,
        previousContent,
        currentContent,
        checkCount,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error'
      log.error(`Page monitoring failed: ${errorMsg}`)
      span?.error({
        error: e instanceof Error ? e : new Error(errorMsg),
        endSpan: true,
      })
      return {
        success: false,
        changed: false,
        checkCount: 0,
        message: errorMsg,
      }
    }
  },
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('Monitor page tool input streaming started', {
      toolCallId,
      messageCount: messages.length,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputStart',
    })
  },
  onInputDelta: ({ inputTextDelta, toolCallId, messages, abortSignal }) => {
    log.info('Monitor page tool received input chunk', {
      toolCallId,
      inputTextDelta,
      abortSignal: abortSignal?.aborted,
      messageCount: messages.length,
      hook: 'onInputDelta',
    })
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('Monitor page tool received input', {
      toolCallId,
      messageCount: messages.length,
      url: input.url,
      abortSignal: abortSignal?.aborted,
      hook: 'onInputAvailable',
    })
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log[output.success ? 'info' : 'warn']('Monitor page tool completed', {
      toolCallId,
      toolName,
      success: output.success,
      abortSignal: abortSignal?.aborted,
      hook: 'onOutput',
    })
  },
})

export type BrowserToolUITool = InferUITool<typeof browserTool>
export type ScreenshotToolUITool = InferUITool<typeof screenshotTool>
export type PdfGeneratorToolUITool = InferUITool<typeof pdfGeneratorTool>
export type ClickAndExtractToolUITool = InferUITool<typeof clickAndExtractTool>
export type FillFormToolUITool = InferUITool<typeof fillFormTool>
export type GoogleSearchUITool = InferUITool<typeof googleSearch>
export type ExtractTablesToolUITool = InferUITool<typeof extractTablesTool>
export type MonitorPageToolUITool = InferUITool<typeof monitorPageTool>
