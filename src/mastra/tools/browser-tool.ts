import { createTool } from '@mastra/core/tools';
import { MDocument } from '@mastra/rag';
import chalk from 'chalk';
import { chromium } from 'playwright-core';
import { z } from 'zod';
import { log } from '../config/logger';

export const browserTool = createTool({
  id: 'browserTool',
  description: 'Browser Tool, opens a browser and navigates to a url capturing the content',
  inputSchema: z.object({
    url: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ context, writer }) => {
    await writer?.write({ type: 'progress', data: { message: `🌐 Launching browser for ${context.url}` } });
    try {
      const browser = await chromium.launch({
        headless: true,
      });

      const page = await browser.newPage();

      await page.goto(context.url);

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
      await browser.close();

      if (!docs.getText().length) {
        await writer?.write({ type: 'progress', data: { message: '⚠️ No content found' } });
        return { message: 'No content' };
      }

      await writer?.write({ type: 'progress', data: { message: '✅ Content extracted successfully' } });
      return { message: docs.getText().join('\n') };
    } catch (e) {
      if (e instanceof Error) {
        log.info(`\n${chalk.red(e.message)}`);
        return { message: `Error: ${e.message}` };
      }
      return { message: 'Error' };
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
  execute: async ({ context, writer }) => {
    await writer?.write({ type: 'progress', data: { message: '🔍 Starting Google search for "' + context.query + '"' } });
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
      });
    } catch (e) {
      if (e instanceof Error) {
        log.info(`\n${chalk.red(e.message)}`);
        return { message: `Error: ${e.message}` };
      }
      return { message: 'Error' };
    }

    try {
      const page = await browser.newPage();
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(context.query)}`);

      await writer?.write({ type: 'progress', data: { message: '⏳ Waiting for search results...' } });
      log.info(`\n`);
      log.info(chalk.blue('Waiting for search results...'));

      try {
        await page.click('button:has-text("Accept all")', { timeout: 5000 });
      } catch {
        // Cookie dialog didn't appear, continue
      }
      // Wait for results and click first organic result
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
      await browser.close();

      if (!text.length) {
        await writer?.write({ type: 'progress', data: { message: '⚠️ No results found' } });
        return { message: 'No results' };
      }

      await writer?.write({ type: 'progress', data: { message: '✅ Found ' + text.length + ' results' } });
      return { message: text.join('\n') };
    } catch (e) {
      if (e instanceof Error) {
        log.info(`\n${chalk.red(e.message)}`);
        return { message: `Error: ${e.message}` };
      }
      return { message: `Error` };
    }
  },
});
