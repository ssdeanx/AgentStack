import { delay } from '@mastra/core';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import chalk from 'chalk';
import { execa } from 'execa';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { z } from 'zod';
import { log } from '../config/logger';

// Mock slack for now - remove this when proper integration is ready
const slack = {
  connect: async () => {},
  listTools: async () => [],
};

const stepA1 = createStep({
  id: 'stepA1',
  description: 'Get a git diff',
  inputSchema: z.object({
    channelId: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ mastra }) => {
    // For today
    try {
      // @ts-ignore
      await slack.connect();
    } catch (e) {
      log.error(e instanceof Error ? e.message : String(e));
    }

    const today = new Date().toISOString().split('T')[0];

    if (existsSync(`generated-changelogs/changelog-${today}`)) {
      log.info(chalk.red(`Changelog for today already exists`));
      return {
        message: readFileSync(`generated-changelogs/changelog-${today}`, 'utf-8'),
      };
    }

    log.info(today);

    // For 7 days ago
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    log.info(weekAgo);
    const cwd = process.cwd();

    log.info(cwd);

    const modulePaths = [
      'packages/core',
      'packages/cli',
      'packages/create-mastra',
      'packages/deployer',
      'packages/evals',
      'packages/rag',
      'packages/memory',
      'packages/mcp',

      // Deployers
      'deployers/cloudflare',
      'deployers/netlify',
      'deployers/vercel',

      // Speech modules
      'speech/azure',
      'speech/deepgram',
      'speech/elevenlabs',
      'speech/google',
      'speech/ibm',
      'speech/murf',
      'speech/openai',
      'speech/playai',
      'speech/replicate',
      'speech/speechify',

      // Storage modules
      'stores/pg',
      'stores/astra',
      'stores/chroma',
      'stores/pinecone',
      'stores/qdrant',
      'stores/upstash',
      'stores/vectorize',
    ];

    const moduleChangelogs = [];

    let generatedText = '';

    let TOKEN_LIMIT = 80000;

    for (const modulePath of modulePaths) {
      const args = [
        '--no-pager',
        'diff',
        '--unified=1', // Reduced context to 1 line
        '--no-prefix',
        '--color=never',
        `main@{${weekAgo}}`,
        `main@{${today}}`,
        '--',
        modulePath,
        ':!**/node_modules/**',
        ':!**/.turbo/**',
        ':!**/.next/**',
        ':!**/coverage/**',
        ':!**/package-lock.json',
        ':!**/pnpm-lock.yaml',
        ':!**/yarn.lock',
        ':!**/*.bin',
        ':!**/*.exe',
        ':!**/*.dll',
        ':!**/*.so',
        ':!**/*.dylib',
        ':!**/*.class',
        ':!**/dist/**',
      ];
      log.info(`git ${args.join(' ')}`);

      try {
        const diff = await execa('git', args, {
          cwd,
        });

        const output = diff.stdout.trim();

        if (output) {
          // Only generate changelog if there are changes
          log.info(`${modulePath} changes length: ${output.length}`);

          const modulePrompt = `
            Time: ${weekAgo} - ${today}
            Module: ${modulePath}

            Git diff to generate from: ${output}

            # Task
            1. Create a structured narrative changelog that highlights key updates and improvements for this module.
            2. Focus only on meaningful changes, ignore trivial ones.
            3. Group changes into categories:
            - New features
            - Improvements
            - Notable bug fixes
            - Build/deployment improvements
            - Performance optimizations
          `;

          const agent = mastra?.getAgent('daneChangeLog');

          if (agent === undefined) {
            throw new Error('LLM not found');
          }

          const result = await agent.generate(modulePrompt);

          moduleChangelogs.push({
            module: modulePath,
            changelog: result.text,
          });

          generatedText += `\n ## ${modulePath}\n${result.text}`;
          writeFileSync(`generated-changelogs/changelog-${today}`, generatedText);

          if (result.usage?.totalTokens !== undefined) {
            log.info(`Total tokens used: ${result.usage.totalTokens}`);
          }

          TOKEN_LIMIT -= result.usage?.totalTokens ?? 0;

          if (TOKEN_LIMIT < 20000) {
            await delay(60000);
            TOKEN_LIMIT = 80000;
          }
        }
      } catch (e: unknown) {
        log.error(`Error processing ${modulePath}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Combine all changelogs
    const combinedChangelog = moduleChangelogs
      .map(({ module, changelog }) => `## ${module}\n${changelog}`)
      .join('\n\n');

    writeFileSync(`generated-changelogs/changelog-${today}`, combinedChangelog);

    return {
      message: combinedChangelog,
    };
  },
});

const stepA2 = createStep({
  id: 'stepA2',
  description: 'Make changelog',
  inputSchema: z.object({
    message: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {

    const agent = mastra?.getAgent('daneChangeLog');

    if (agent === undefined) {
      throw new Error('LLM not found');
    }

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const tools = await slack.listTools();

    const channelId = 'default-channel'; // TODO: Pass channelId through workflow properly

    const prompt = `
            Time: ${weekAgo} - ${today}

            ${inputData.message}
            # Task
            1. create a structured narrative changelog that highlights key updates and improvements.
            2. Include what packages were changed

            ## Structure

            1. Opening
            - Brief welcome/context (1-2 sentences)
            - Time period covered

            2. Major Updates (3-4 key highlights)
            - Lead with the most impactful changes
            - Include brief technical context where needed
            - Reference relevant PR numbers
            - Link to examples/docs where applicable

            3. Technical Improvements
            - Group related changes
            - Focus on developer impact
            - Include code snippets if helpful

            4. Documentation & Examples
            - New guides/tutorials
            - Updated examples
            - API documentation changes

            5. Bug Fixes & Infrastructure
            - Notable bug fixes
            - Build/deployment improvements
            - Performance optimizations

            Finally send this to this slack channel: "${channelId}" with the tool slack_post_message
        `;

    log.info(chalk.green(`Generating...`));

    try {
      const result = await agent.generate(prompt, {
        toolsets: {
          slack: tools,
        },
      });

      log.info(chalk.green(result.text));

      return {
        message: result.text,
      };
    } catch (e) {
      log.error(e instanceof Error ? e.message : String(e));
      return {
        message: e as string,
      };
    }
  },
});

const changelogWorkflow = createWorkflow({
  id: 'changelog',
  inputSchema: z.object({
    channelId: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
})
  .then(stepA1)
  .then(stepA2);

changelogWorkflow.commit();

export { changelogWorkflow };
