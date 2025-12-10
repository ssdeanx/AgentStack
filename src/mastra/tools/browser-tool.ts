import type { InferUITool} from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { MDocument } from '@mastra/rag';
import type { Browser} from 'playwright-core';
import { chromium } from 'playwright-core';
import { z } from 'zod';
import { trace } from "@opentelemetry/api";
import { log } from '../config/logger';
import type { RequestContext } from '@mastra/core/request-context';

// Browser instance cache for reuse
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance?.isConnected()) {
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
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('browser-tool', '1.0.0');
    const span = tracer.startSpan('browser-scrape', {
      attributes: {
        'tool.id': 'browser-scrape',
        'tool.input.url': inputData.url,
      }
    });

    await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `🌐 Launching browser for ${inputData.url}` } });
    try {
      const browser = await getBrowser();
      const page = await browser.newPage();

      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' });

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
        await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '⚠️ No content found' } });
        span.setAttributes({ 'tool.output.success': false, 'tool.output.reason': 'No content' });
        span.end();
        return { message: 'No content' };
      }

      const result = docs.getText().join('\n');
      await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '✅ Content extracted successfully' } });
      span.setAttributes({ 'tool.output.success': true, 'tool.output.contentLength': result.length });
      span.end();
      return { message: result };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Browser scrape failed: ${errorMsg}`);
      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();
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
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('screenshot-tool', '1.0.0');
    const span = tracer.startSpan('browser-screenshot', {
      attributes: {
        'tool.id': 'browser-screenshot',
        'tool.input.url': inputData.url,
        'tool.input.fullPage': inputData.fullPage,
      }
    });

    await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `📸 Taking screenshot of ${inputData.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.setViewportSize({ width: inputData.width ?? 1280, height: inputData.height ?? 720 });
      await page.goto(inputData.url, { waitUntil: 'networkidle' });

      const screenshot = await page.screenshot({
        fullPage: inputData.fullPage ?? false,
        type: 'png',
      });

      await page.close();

      const base64 = screenshot.toString('base64');
      await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '✅ Screenshot captured' } });
      span.setAttributes({ 'tool.output.success': true, 'tool.output.size': screenshot.length });
      span.end();

      return { success: true, screenshot: base64 };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Screenshot failed: ${errorMsg}`);
      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();
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
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('pdf-generator-tool', '1.0.0');
    const span = tracer.startSpan('browser-pdf-generate', {
      attributes: {
        'tool.id': 'browser-pdf-generate',
        'tool.input.url': inputData.url,
        'tool.input.format': inputData.format,
      }
    });

    await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `📄 Generating PDF from ${inputData.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(inputData.url, { waitUntil: 'networkidle' });

      const pdf = await page.pdf({
        format: inputData.format ?? 'A4',
        landscape: inputData.landscape ?? false,
        printBackground: inputData.printBackground ?? true,
      });

      await page.close();

      const base64 = pdf.toString('base64');
      await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '✅ PDF generated' } });
      span.setAttributes({ 'tool.output.success': true, 'tool.output.size': pdf.length });
      span.end();

      return { success: true, pdf: base64 };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`PDF generation failed: ${errorMsg}`);
      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();
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
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('click-extract-tool', '1.0.0');
    const span = tracer.startSpan('browser-click-extract', {
      attributes: {
        'tool.id': 'browser-click-extract',
        'tool.input.url': inputData.url,
        'tool.input.clickSelector': inputData.clickSelector,
      }
    });

    await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `🖱️ Navigating to ${inputData.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' });

      if (inputData.clickSelector !== undefined && inputData.clickSelector !== null) {
        await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `🖱️ Clicking ${inputData.clickSelector}` } });
        await page.click(inputData.clickSelector, { timeout: inputData.timeout });
      }

      if (inputData.waitForSelector !== undefined && inputData.waitForSelector !== null) {
        await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `⏳ Waiting for ${inputData.waitForSelector}` } });
        await page.waitForSelector(inputData.waitForSelector, { timeout: inputData.timeout });
      }

      const selector = inputData.extractSelector ?? 'body';
      const content = await page.$eval(selector, el => el.textContent ?? '');

      await page.close();

      await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '✅ Content extracted' } });
      span.setAttributes({ 'tool.output.success': true, 'tool.output.contentLength': content.length });
      span.end();

      return { success: true, content: content.trim() };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Click and extract failed: ${errorMsg}`);
      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();
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
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('fill-form-tool', '1.0.0');
    const span = tracer.startSpan('browser-fill-form', {
      attributes: {
        'tool.id': 'browser-fill-form',
        'tool.input.url': inputData.url,
        'tool.input.fieldCount': inputData.fields.length,
      }
    });

    await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `📝 Filling form on ${inputData.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' });

      for (const field of inputData.fields) {
        await page.fill(field.selector, field.value);
      }

      if (inputData.submitSelector !== undefined && inputData.submitSelector !== null) {
        await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '📤 Submitting form...' } });
        if (inputData.waitForNavigation) {
          await Promise.all([
            page.waitForNavigation(),
            page.click(inputData.submitSelector),
          ]);
        } else {
          await page.click(inputData.submitSelector);
        }
      }

      const finalUrl = page.url();
      await page.close();

      await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '✅ Form submitted' } });
      span.setAttributes({ 'tool.output.success': true, 'tool.output.finalUrl': finalUrl });
      span.end();

      return { success: true, finalUrl };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Form fill failed: ${errorMsg}`);
      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();
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
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('google-search-tool', '1.0.0');
    const span = tracer.startSpan('google-search', {
      attributes: {
        'tool.id': 'google-search',
        'tool.input.query': inputData.query,
      }
    });

    await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '🔍 Starting Google search for "' + inputData.query + '"' } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(inputData.query)}`);

      await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '⏳ Waiting for search results...' } });

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
        await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '⚠️ No results found' } });
        span.setAttributes({ 'tool.output.success': false, 'tool.output.reason': 'No results' });
        span.end();
        return { message: 'No results' };
      }

      await context?.writer?.custom({ type: 'data-tool-progress', data: { message: '✅ Found ' + text.length + ' results' } });
      span.setAttributes({ 'tool.output.success': true, 'tool.output.resultCount': text.length });
      span.end();
      return { message: text.join('\n') };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Google search failed: ${errorMsg}`);
      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();
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
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('extract-tables-tool', '1.0.0');
    const span = tracer.startSpan('browser-extract-tables', {
      attributes: {
        'tool.id': 'browser-extract-tables',
        'tool.input.url': inputData.url,
      }
    });

    await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `📊 Extracting tables from ${inputData.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' });

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
            if (rowData.length > 0) {rows.push(rowData);}
          });

          result.push({ headers, rows });
        }

        return result;
      }, inputData.tableIndex);

      await page.close();

      await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `✅ Extracted ${tables.length} table(s)` } });
      span.setAttributes({ 'tool.output.success': true, 'tool.output.tableCount': tables.length });
      span.end();

      return { success: true, tables };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Table extraction failed: ${errorMsg}`);
      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();
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
  execute: async (inputData, context) => {
    const tracer = trace.getTracer('monitor-page-tool', '1.0.0');
    const span = tracer.startSpan('browser-monitor-page', {
      attributes: {
        'tool.id': 'browser-monitor-page',
        'tool.input.url': inputData.url,
        'tool.input.selector': inputData.selector,
      }
    });

    await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `👁️ Monitoring ${inputData.url}` } });

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      const selector = inputData.selector ?? 'body';

      await page.goto(inputData.url, { waitUntil: 'domcontentloaded' });
      const previousContent = await page.$eval(selector, el => el.textContent ?? '');

      let checkCount = 0;
      let changed = false;
      let currentContent = previousContent;

      while (checkCount < (inputData.maxChecks ?? 10) && !changed) {
        await new Promise(resolve => setTimeout(resolve, inputData.checkInterval ?? 5000));
        await page.reload({ waitUntil: 'domcontentloaded' });

        currentContent = await page.$eval(selector, el => el.textContent ?? '');
        checkCount++;

        if (currentContent !== previousContent) {
          changed = true;
          await context?.writer?.custom({ type: 'data-tool-progress', data: { message: `🔔 Change detected after ${checkCount} checks` } });
        }
      }

      await page.close();

      span.setAttributes({ 'tool.output.success': true, 'tool.output.changed': changed, 'tool.output.checkCount': checkCount });
      span.end();
      return { success: true, changed, previousContent, currentContent, checkCount };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Page monitoring failed: ${errorMsg}`);
      if (e instanceof Error) {
        span.recordException(e);
      }
      span.setStatus({ code: 2, message: errorMsg });
      span.end();
      return { success: false, changed: false, checkCount: 0, error: errorMsg };
    }
  },
});

export type BrowserToolUITool = InferUITool<typeof browserTool>;
export type ScreenshotToolUITool = InferUITool<typeof screenshotTool>;
export type PdfGeneratorToolUITool = InferUITool<typeof pdfGeneratorTool>;
export type ClickAndExtractToolUITool = InferUITool<typeof clickAndExtractTool>;
export type FillFormToolUITool = InferUITool<typeof fillFormTool>;
export type GoogleSearchUITool = InferUITool<typeof googleSearch>;
export type ExtractTablesToolUITool = InferUITool<typeof extractTablesTool>;
export type MonitorPageToolUITool = InferUITool<typeof monitorPageTool>;
