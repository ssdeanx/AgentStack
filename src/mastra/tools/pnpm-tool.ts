import type { RequestContext } from '@mastra/core/request-context';
import type { InferUITool } from "@mastra/core/tools";
import { createTool } from "@mastra/core/tools";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import chalk from 'chalk';
import type { ExecaError as ExecaErrorType } from 'execa';
import execa from 'execa';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { log } from '../config/logger';


const pnpmContextSchema = z.object({
  verbose: z.boolean().default(true),
});

export type PnpmContext = z.infer<typeof pnpmContextSchema>;

export const pnpmBuild = createTool({
  id: 'pnpmBuild',
  description: 'Used to build the pnpm module',
  inputSchema: z.object({
    name: z.string(),
    packagePath: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('pnpmBuild tool input streaming started', { toolCallId, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('pnpmBuild received input', {
      toolCallId,
      inputData: {
        name: input.name,
        packagePath: input.packagePath,
      },
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('pnpmBuild completed', {
      toolCallId,
      toolName,
      outputData: {
        message: output.message,
      },
      hook: 'onOutput'
    });
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const requestContext = context?.requestContext as RequestContext<{ pnpmToolContext: PnpmContext }>;
    const pnpmContext = requestContext?.get('pnpmToolContext');
    const { verbose } = pnpmContextSchema.parse(pnpmContext ?? {});

    const tracer = trace.getTracer('pnpm-tool');
    const span = tracer.startSpan('pnpm-build', {
      attributes: {
        name: inputData.name,
        packagePath: inputData.packagePath,
        operation: 'pnpm-build'
      }
    });

    const { name, packagePath } = inputData
    if (verbose) { await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🔨 Building ${name} at ${packagePath}`, stage: 'pnpmBuild' }, id: 'pnpmBuild' }); }
    try {
      if (verbose) { log.info(chalk.green(`\n Building: ${name} at ${packagePath}`)) }
      const p = execa(`pnpm`, ['build'], {
        stdio: 'inherit',
        cwd: packagePath,
        reject: false,
      })
      if (verbose) { log.info(`\n`) }
      await p
      if (verbose) { await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Build complete for ${name}`, stage: 'pnpmBuild' }, id: 'pnpmBuild' }); }

      span.end();
      return { message: 'Done' }
    } catch (e) {
      const error = e as ExecaErrorType
      const errorMsg = error.message || String(e)
      log.error(errorMsg)
      span.recordException(new Error(errorMsg));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();
      return { message: errorMsg || 'Error' }
    }
  },
})

export type PnpmBuildUITool = InferUITool<typeof pnpmBuild>;

export const pnpmChangesetStatus = createTool({
  id: 'pnpmChangesetStatus',
  description: 'Used to check which pnpm modules need to be published',
  inputSchema: z.object({}),
  outputSchema: z.object({
    message: z.array(z.string()),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('pnpmChangesetStatus tool input streaming started', { toolCallId, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('pnpmChangesetStatus received input', {
      toolCallId,
      inputData: input,
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('pnpmChangesetStatus completed', {
      toolCallId,
      toolName,
      outputData: {
        message: output.message,
      },
      hook: 'onOutput'
    });
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const tracer = trace.getTracer('pnpm-tool');
    const span = tracer.startSpan('pnpm-changeset-status', {
      attributes: {
        operation: 'pnpm-changeset-status'
      }
    });

    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🔍 Checking changeset status...', stage: 'pnpmChangesetStatus' }, id: 'pnpmChangesetStatus' });
    try {
      log.info(
        chalk.green(
          `\nRunning command: pnpm publish -r --dry-run --no-git-checks`
        )
      )
      const result = await execa(
        'pnpm',
        ['publish', '-r', '--dry-run', '--no-git-checks'],
        {
          all: true,
          // We want to see stderr too since pnpm sometimes puts important info there
        }
      )

      const lines = (result.all ?? '').split('\n')
      const filteredLines = lines.filter((line: string) => line.startsWith('+'))
      const packages = filteredLines.map((line: string) =>
        line.trim().substring(2).split('@').slice(0, -1).join('@')
      )

      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Found ${packages.length} packages to publish`, stage: 'pnpmChangesetStatus' }, id: 'pnpmChangesetStatus' });

      span.setAttribute('packageCount', packages.length);
      span.end();
      return { message: packages }
    } catch (e) {
      const error = e as ExecaErrorType
      const errorMsg = error.message || String(e);
      log.error(errorMsg)
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();
      return { message: [] }
    }
  },
})

export type PnpmChangesetStatusUITool = InferUITool<typeof pnpmChangesetStatus>;

export const pnpmChangesetPublish = createTool({
  id: 'pnpmChangesetPublish',
  description: 'Used to publish the pnpm module',
  inputSchema: z.object({}),
  outputSchema: z.object({
    message: z.string(),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('pnpmChangesetPublish tool input streaming started', { toolCallId, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('pnpmChangesetPublish received input', {
      toolCallId,
      inputData: input,
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('pnpmChangesetPublish completed', {
      toolCallId,
      toolName,
      outputData: {
        message: output.message,
      },
      hook: 'onOutput'
    });
  },
  execute: async (inputData, context) => {
    const writer = context?.writer;
    const tracer = trace.getTracer('pnpm-tool');
    const span = tracer.startSpan('pnpm-changeset-publish', {
      attributes: {
        operation: 'pnpm-changeset-publish'
      }
    });

    // const {value} = input // unused
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: '🚀 Publishing changesets...', stage: 'pnpmChangesetPublish' }, id: 'pnpmChangesetPublish' });
    try {
      log.info(chalk.green(`Publishing...`))
      const p = execa(`pnpm`, ['changeset', 'publish'], {
        stdio: 'inherit',
        reject: false,
      })
      log.info(`\n`)
      await p
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: '✅ Publish complete', stage: 'pnpmChangesetPublish' }, id: 'pnpmChangesetPublish' });

      span.end();
      return { message: 'Done' }
    } catch (e) {
      const error = e as ExecaErrorType
      const errorMsg = error.message || String(e)
      log.error(errorMsg)
      span.recordException(new Error(errorMsg));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();
      if (e instanceof Error && 'message' in e) {
        return { message: errorMsg }
      }
      return { message: 'Error' }
    }
  },
})

export type PnpmChangesetPublishUITool = InferUITool<typeof pnpmChangesetPublish>;

export const activeDistTag = createTool({
  id: 'activeDistTag',
  description: 'Set active dist tag on pnpm module',
  inputSchema: z.object({
    packagePath: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('activeDistTag tool input streaming started', { toolCallId, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('activeDistTag received input', {
      toolCallId,
      inputData: {
        packagePath: input.packagePath,
      },
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('activeDistTag completed', {
      toolCallId,
      toolName,
      outputData: {
        message: output.message,
      },
      hook: 'onOutput'
    });
  },
  execute: async (input, context) => {
    const writer = context?.writer;
    const tracer = trace.getTracer('pnpm-tool');
    const span = tracer.startSpan('active-dist-tag', {
      attributes: {
        packagePath: input.packagePath,
        operation: 'active-dist-tag'
      }
    });

    const { packagePath } = input
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🏷️ Setting active dist tag for ${packagePath}`, stage: 'activeDistTag' }, id: 'activeDistTag' });
    try {
      const pkgJson = JSON.parse(
        readFileSync(path.join(packagePath, 'package.json'), 'utf-8')
      )
      const { version } = pkgJson
      log.info(
        chalk.green(
          `Setting active tag to latest for ${pkgJson.name}@${version}`
        )
      )
      const p = execa(
        `npm`,
        ['dist-tag', `add`, `${pkgJson.name}@${version}`, `latest`],
        {
          stdio: 'inherit',
          reject: false,
        }
      )
      log.info(`\n`)
      await p
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Dist tag set to latest for ${pkgJson.name}@${version}`, stage: 'activeDistTag' }, id: 'activeDistTag' });
      span.end();
      return { message: 'Done' }
    } catch (e) {
      const error = e as ExecaErrorType
      const errorMsg = error.message || String(e)
      log.error(errorMsg)
      span.recordException(new Error(errorMsg));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();
      if (e instanceof Error && 'message' in e) {
        return { message: errorMsg }
      }
      return { message: 'Error' }
    }
  },
})

export type ActiveDistTagUITool = InferUITool<typeof activeDistTag>;

export const pnpmRun = createTool({
  id: 'pnpmRun',
  description: 'Run a pnpm script',
  inputSchema: z.object({
    script: z.string(),
    args: z.array(z.string()).optional(),
    packagePath: z.string().optional(),
  }),
  outputSchema: z.object({
    message: z.string(),
  }),
  onInputStart: ({ toolCallId, messages, abortSignal }) => {
    log.info('pnpmRun tool input streaming started', { toolCallId, hook: 'onInputStart' });
  },
  onInputAvailable: ({ input, toolCallId, messages, abortSignal }) => {
    log.info('pnpmRun received input', {
      toolCallId,
      inputData: {
        script: input.script,
        args: input.args,
        packagePath: input.packagePath,
      },
      hook: 'onInputAvailable'
    });
  },
  onOutput: ({ output, toolCallId, toolName, abortSignal }) => {
    log.info('pnpmRun completed', {
      toolCallId,
      toolName,
      outputData: {
        message: output.message,
      },
      hook: 'onOutput'
    });
  },
  execute: async (input, context) => {
    const writer = context?.writer;
    const tracer = trace.getTracer('pnpm-tool');
    const span = tracer.startSpan('pnpm-run', {
      attributes: {
        script: input.script,
        args: JSON.stringify(input.args),
        packagePath: input.packagePath,
        operation: 'pnpm-run'
      }
    });

    const { script, args = [], packagePath } = input
    await writer?.custom({ type: 'data-tool-progress', data: { status: 'in-progress', message: `🏃 Running pnpm ${script} ${args.join(' ')}`, stage: 'pnpmRun' }, id: 'pnpmRun' });
    try {
      log.info(chalk.green(`\n Running: pnpm ${script} ${args.join(' ')}`))
      const p = execa('pnpm', ['run', script, ...args], {
        stdio: 'inherit',
        cwd: packagePath,
        reject: false,
      })
      log.info(`\n`)
      await p
      await writer?.custom({ type: 'data-tool-progress', data: { status: 'done', message: `✅ Script ${script} complete`, stage: 'pnpmRun' }, id: 'pnpmRun' });
      span.end();
      return { message: 'Done' }
    } catch (e) {
      const error = e as ExecaErrorType
      const errorMsg = error.message || String(e)
      log.error(errorMsg)
      span.recordException(new Error(errorMsg));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end();
      return { message: errorMsg || 'Error' }
    }
  },
})

export type PnpmRunUITool = InferUITool<typeof pnpmRun>;
