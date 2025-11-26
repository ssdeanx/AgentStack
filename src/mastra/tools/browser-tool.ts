import { createTool } from '@mastra/core/tools';
import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing';
import { MDocument } from '@mastra/rag';
import { chromium, Browser } from 'playwright-core';
import { z } from 'zod';
import { log } from '../config/logger';

// Browser instance cache for reuse
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      chromiumSandbox: false,
    });
  }
  return browserInstance;
}

export const browserTool = createTool({
  id: 'browserTool',
  description: 'Browser Tool, opens a browser and navigates to a url capturing the content',
  inputSchema: z.object({
    url: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ context, tracingContext, writer }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'browser-scrape',
      input: { url: context.url },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: `🌐 Launching browser for ${context.url}` } });
    try {
      const browser = await getBrowser();
      const page = await browser.newPage();

      await page.goto(context.url, { waitUntil: 'domcontentloaded' });

      const docs = MDocument.fromHTML(await page.content());

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
      });

      await page.close();

      if (!docs.getText().length) {
        await writer?.write({ type: 'progress', data: { message: '⚠️ No content found' } });
        span?.end({ output: { success: false, reason: 'No content' } });
        return { message: 'No content' };
      }

      const result = docs.getText().join('\n');
      await writer?.write({ type: 'progress', data: { message: '✅ Content extracted successfully' } });
      span?.end({ output: { success: true, contentLength: result.length } });
      return { message: result };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Browser scrape failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { message: `Error: ${errorMsg}` };
    }
  },
});

export const screenshotTool = createTool({
  id: 'screenshotTool',
  description: 'Capture a screenshot of a webpage. Returns base64-encoded PNG image.',
  inputSchema: z.object({
    url: z.string().describe('URL to screenshot'),
    fullPage: z.boolean().optional().default(false).describe('Capture full page or viewport only'),
    width: z.number().optional().default(1280).describe('Viewport width'),
    height: z.number().optional().default(720).describe('Viewport height'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    screenshot: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context, tracingContext, writer }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'browser-screenshot',
      input: { url: context.url, fullPage: context.fullPage },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: `📸 Taking screenshot of ${context.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.setViewportSize({ width: context.width ?? 1280, height: context.height ?? 720 });
      await page.goto(context.url, { waitUntil: 'networkidle' });

      const screenshot = await page.screenshot({
        fullPage: context.fullPage ?? false,
        type: 'png',
      });

      await page.close();

      const base64 = screenshot.toString('base64');
      await writer?.write({ type: 'progress', data: { message: '✅ Screenshot captured' } });
      span?.end({ output: { success: true, size: screenshot.length } });

      return { success: true, screenshot: base64 };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Screenshot failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { success: false, error: errorMsg };
    }
  },
});

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
    error: z.string().optional(),
  }),
  execute: async ({ context, tracingContext, writer }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'browser-pdf-generate',
      input: { url: context.url, format: context.format },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: `📄 Generating PDF from ${context.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(context.url, { waitUntil: 'networkidle' });

      const pdf = await page.pdf({
        format: context.format ?? 'A4',
        landscape: context.landscape ?? false,
        printBackground: context.printBackground ?? true,
      });

      await page.close();

      const base64 = pdf.toString('base64');
      await writer?.write({ type: 'progress', data: { message: '✅ PDF generated' } });
      span?.end({ output: { success: true, size: pdf.length } });

      return { success: true, pdf: base64 };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`PDF generation failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { success: false, error: errorMsg };
    }
  },
});

export const clickAndExtractTool = createTool({
  id: 'clickAndExtractTool',
  description: 'Navigate to a URL, perform click actions, and extract content. Useful for SPAs and dynamic content.',
  inputSchema: z.object({
    url: z.string().describe('URL to navigate to'),
    clickSelector: z.string().optional().describe('CSS selector of element to click before extraction'),
    waitForSelector: z.string().optional().describe('CSS selector to wait for before extraction'),
    extractSelector: z.string().optional().describe('CSS selector to extract content from (defaults to body)'),
    timeout: z.number().optional().default(10000).describe('Timeout in milliseconds'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    content: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context, tracingContext, writer }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'browser-click-extract',
      input: { url: context.url, clickSelector: context.clickSelector },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: `🖱️ Navigating to ${context.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(context.url, { waitUntil: 'domcontentloaded' });

      if (context.clickSelector) {
        await writer?.write({ type: 'progress', data: { message: `🖱️ Clicking ${context.clickSelector}` } });
        await page.click(context.clickSelector, { timeout: context.timeout });
      }

      if (context.waitForSelector) {
        await writer?.write({ type: 'progress', data: { message: `⏳ Waiting for ${context.waitForSelector}` } });
        await page.waitForSelector(context.waitForSelector, { timeout: context.timeout });
      }

      const selector = context.extractSelector ?? 'body';
      const content = await page.$eval(selector, el => el.textContent ?? '');

      await page.close();

      await writer?.write({ type: 'progress', data: { message: '✅ Content extracted' } });
      span?.end({ output: { success: true, contentLength: content.length } });

      return { success: true, content: content.trim() };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Click and extract failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { success: false, error: errorMsg };
    }
  },
});

export const fillFormTool = createTool({
  id: 'fillFormTool',
  description: 'Fill out a form on a webpage and optionally submit it.',
  inputSchema: z.object({
    url: z.string().describe('URL containing the form'),
    fields: z.array(z.object({
      selector: z.string().describe('CSS selector for the input field'),
      value: z.string().describe('Value to fill in'),
    })).describe('Form fields to fill'),
    submitSelector: z.string().optional().describe('CSS selector for submit button'),
    waitForNavigation: z.boolean().optional().default(false),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    finalUrl: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context, tracingContext, writer }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'browser-fill-form',
      input: { url: context.url, fieldCount: context.fields.length },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: `📝 Filling form on ${context.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(context.url, { waitUntil: 'domcontentloaded' });

      for (const field of context.fields) {
        await page.fill(field.selector, field.value);
      }

      if (context.submitSelector) {
        await writer?.write({ type: 'progress', data: { message: '📤 Submitting form...' } });
        if (context.waitForNavigation) {
          await Promise.all([
            page.waitForNavigation(),
            page.click(context.submitSelector),
          ]);
        } else {
          await page.click(context.submitSelector);
        }
      }

      const finalUrl = page.url();
      await page.close();

      await writer?.write({ type: 'progress', data: { message: '✅ Form submitted' } });
      span?.end({ output: { success: true, finalUrl } });

      return { success: true, finalUrl };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Form fill failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { success: false, error: errorMsg };
    }
  },
});

export const googleSearch = createTool({
  id: 'googleSearch',
  description: 'Google Search. Passes the query to Google and returns the search results.',
  inputSchema: z.object({
    query: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ context, tracingContext, writer }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'google-search',
      input: { query: context.query },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: '🔍 Starting Google search for "' + context.query + '"' } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(context.query)}`);

      await writer?.write({ type: 'progress', data: { message: '⏳ Waiting for search results...' } });

      try {
        await page.click('button:has-text("Accept all")', { timeout: 5000 });
      } catch {
        // Cookie dialog didn't appear, continue
      }

      await page.waitForSelector('#search');

      const text = await page.evaluate(() => {
        const links: string[] = [];
        const searchResults = document.querySelectorAll('div.g a');

        searchResults.forEach(link => {
          const href = link.getAttribute('href');
          if (href?.startsWith('http') === true) {
            links.push(href);
          }
        });

        return links;
      });

      await page.close();

      if (!text.length) {
        await writer?.write({ type: 'progress', data: { message: '⚠️ No results found' } });
        span?.end({ output: { success: false, reason: 'No results' } });
        return { message: 'No results' };
      }

      await writer?.write({ type: 'progress', data: { message: '✅ Found ' + text.length + ' results' } });
      span?.end({ output: { success: true, resultCount: text.length } });
      return { message: text.join('\n') };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Google search failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { message: `Error: ${errorMsg}` };
    }
  },
});

export const extractTablesTool = createTool({
  id: 'extractTablesTool',
  description: 'Extract all tables from a webpage and return as structured JSON data.',
  inputSchema: z.object({
    url: z.string().describe('URL containing tables'),
    tableIndex: z.number().optional().describe('Specific table index to extract (0-based), extracts all if not specified'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    tables: z.array(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    })).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context, tracingContext, writer }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'browser-extract-tables',
      input: { url: context.url },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: `📊 Extracting tables from ${context.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(context.url, { waitUntil: 'domcontentloaded' });

      const tables = await page.evaluate((tableIndex) => {
        const allTables = document.querySelectorAll('table');
        const result: Array<{ headers: string[]; rows: string[][] }> = [];

        const tablesToProcess = tableIndex !== undefined
          ? [allTables[tableIndex]].filter(Boolean)
          : Array.from(allTables);

        for (const table of tablesToProcess) {
          const headers: string[] = [];
          const rows: string[][] = [];

          const headerCells = table.querySelectorAll('th');
          headerCells.forEach(cell => headers.push(cell.textContent?.trim() ?? ''));

          const bodyRows = table.querySelectorAll('tbody tr');
          bodyRows.forEach(row => {
            const rowData: string[] = [];
            row.querySelectorAll('td').forEach(cell => rowData.push(cell.textContent?.trim() ?? ''));
            if (rowData.length > 0) rows.push(rowData);
          });

          result.push({ headers, rows });
        }

        return result;
      }, context.tableIndex);

      await page.close();

      await writer?.write({ type: 'progress', data: { message: `✅ Extracted ${tables.length} table(s)` } });
      span?.end({ output: { success: true, tableCount: tables.length } });

      return { success: true, tables };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Table extraction failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { success: false, error: errorMsg };
    }
  },
});

export const monitorPageTool = createTool({
  id: 'monitorPageTool',
  description: 'Monitor a webpage for changes by comparing content at intervals.',
  inputSchema: z.object({
    url: z.string().describe('URL to monitor'),
    selector: z.string().optional().describe('CSS selector to monitor (defaults to body)'),
    checkInterval: z.number().optional().default(5000).describe('Interval in milliseconds between checks'),
    maxChecks: z.number().optional().default(10).describe('Maximum number of checks before stopping'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    changed: z.boolean(),
    previousContent: z.string().optional(),
    currentContent: z.string().optional(),
    checkCount: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ context, tracingContext, writer }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'browser-monitor-page',
      input: { url: context.url, selector: context.selector },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: `👁️ Monitoring ${context.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      const selector = context.selector ?? 'body';

      await page.goto(context.url, { waitUntil: 'domcontentloaded' });
      let previousContent = await page.$eval(selector, el => el.textContent ?? '');

      let checkCount = 0;
      let changed = false;
      let currentContent = previousContent;

      while (checkCount < (context.maxChecks ?? 10) && !changed) {
        await new Promise(resolve => setTimeout(resolve, context.checkInterval ?? 5000));
        await page.reload({ waitUntil: 'domcontentloaded' });

        currentContent = await page.$eval(selector, el => el.textContent ?? '');
        checkCount++;

        if (currentContent !== previousContent) {
          changed = true;
          await writer?.write({ type: 'progress', data: { message: `🔔 Change detected after ${checkCount} checks` } });
        }
      }

      await page.close();

      span?.end({ output: { success: true, changed, checkCount } });
      return { success: true, changed, previousContent, currentContent, checkCount };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Page monitoring failed: ${errorMsg}`);
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
      return { success: false, changed: false, checkCount: 0, error: errorMsg };
    }
  },
});
