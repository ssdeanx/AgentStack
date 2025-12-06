import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing'
import { createTool, InferUITool } from "@mastra/core/tools"
import chalk from 'chalk'
import execa from 'execa'
import type { ExecaError as ExecaErrorType } from 'execa'
import { readFileSync } from 'fs'
import * as path from 'path'
import { z } from 'zod'
import { log } from '../config/logger'
import { RuntimeContext } from '@mastra/core/runtime-context'

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
  execute: async ({ context, writer, runtimeContext, tracingContext }) => {
    const pnpmContext = runtimeContext?.get('pnpmToolContext');
    const { verbose } = pnpmContextSchema.parse(pnpmContext || {});

    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'pnpm-build',
      input: { name: context.name, packagePath: context.packagePath },
      tracingPolicy: { internal: InternalSpans.TOOL },
      runtimeContext: runtimeContext as RuntimeContext<PnpmContext>
    });

    const { name, packagePath } = context
    if (verbose) await writer?.write({ type: 'progress', data: { message: `🔨 Building ${name} at ${packagePath}` } });
    try {
      if (verbose) log.info(chalk.green(`\n Building: ${name} at ${packagePath}`))
      const p = execa(`pnpm`, ['build'], {
        stdio: 'inherit',
        cwd: packagePath,
        reject: false,
      })
      if (verbose) log.info(`\n`)
      await p
      if (verbose) await writer?.write({ type: 'progress', data: { message: `✅ Build complete for ${name}` } });
      span?.end({ output: { success: true } });
      return { message: 'Done' }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      log.error(errorMsg)
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
  execute: async ({ context, writer, runtimeContext, tracingContext }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'pnpm-changeset-status',
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    await writer?.write({ type: 'progress', data: { message: '🔍 Checking changeset status...' } });
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

      await writer?.write({ type: 'progress', data: { message: `✅ Found ${packages.length} packages to publish` } });
      span?.end({ output: { packageCount: packages.length } });
      return { message: packages }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      log.error(errorMsg)
      span?.error({ error: e instanceof Error ? e : new Error(errorMsg), endSpan: true });
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
  execute: async ({ context, writer, runtimeContext, tracingContext }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'pnpm-changeset-publish',
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    const { } = context
    await writer?.write({ type: 'progress', data: { message: '🚀 Publishing changesets...' } });
    try {
      log.info(chalk.green(`Publishing...`))
      const p = execa(`pnpm`, ['changeset', 'publish'], {
        stdio: 'inherit',
        reject: false,
      })
      log.info(`\n`)
      await p
      await writer?.write({ type: 'progress', data: { message: '✅ Publish complete' } });
      span?.end({ output: { success: true } });
      return { message: 'Done' }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      log.error(errorMsg)
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
  execute: async ({ context, writer, runtimeContext, tracingContext }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'active-dist-tag',
      input: { packagePath: context.packagePath },
      tracingPolicy: { internal: InternalSpans.ALL }
    });

    const { packagePath } = context
    await writer?.write({ type: 'progress', data: { message: `🏷️ Setting active dist tag for ${packagePath}` } });
    try {
      const pkgJson = JSON.parse(
        readFileSync(path.join(packagePath, 'package.json'), 'utf-8')
      )
      const {version} = pkgJson
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
      await writer?.write({ type: 'progress', data: { message: `✅ Dist tag set to latest for ${pkgJson.name}@${version}` } });
      span?.end({ output: { success: true } });
      return { message: 'Done' }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      log.error(errorMsg)
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
  execute: async ({ context, writer, runtimeContext, tracingContext }) => {
    const span = tracingContext?.currentSpan?.createChildSpan({
      type: AISpanType.TOOL_CALL,
      name: 'pnpm-run',
      input: { script: context.script, args: context.args, packagePath: context.packagePath },
      tracingPolicy: { internal: InternalSpans.TOOL }
    });

    const { script, args = [], packagePath } = context
    await writer?.write({ type: 'progress', data: { message: `🏃 Running pnpm ${script} ${args.join(' ')}` } });
    try {
      log.info(chalk.green(`\n Running: pnpm ${script} ${args.join(' ')}`))
      const p = execa('pnpm', ['run', script, ...args], {
        stdio: 'inherit',
        cwd: packagePath,
        reject: false,
      })
      log.info(`\n`)
      await p
      await writer?.write({ type: 'progress', data: { message: `✅ Script ${script} complete` } });
      span?.end({ output: { success: true } });
      return { message: 'Done' }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      log.error(errorMsg)
      return { message: errorMsg || 'Error' }
    }
  },
})

export type PnpmRunUITool = InferUITool<typeof pnpmRun>;
