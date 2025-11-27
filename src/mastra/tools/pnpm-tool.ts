import { AISpanType, InternalSpans } from '@mastra/core/ai-tracing'
import { createTool } from '@mastra/core/tools'
import chalk from 'chalk'
import { execa, ExecaError } from 'execa'
import { readFileSync } from 'fs'
import path from 'path'
import { z } from 'zod'
import { log } from '../config/logger'

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
    execute: async ({ context, writer, tracingContext }) => {
        const span = tracingContext?.currentSpan?.createChildSpan({
            type: AISpanType.TOOL_CALL,
            name: 'pnpm-build',
            input: { name: context.name, packagePath: context.packagePath },
            tracingPolicy: { internal: InternalSpans.TOOL }
        });

        const { name, packagePath } = context
        await writer?.write({ type: 'progress', data: { message: `🔨 Building ${name} at ${packagePath}` } });
        try {
            log.info(chalk.green(`\n Building: ${name} at ${packagePath}`))
            const p = execa(`pnpm`, ['build'], {
                stdio: 'inherit',
                cwd: packagePath,
                reject: false,
            })
            log.info(`\n`)
            await p
            await writer?.write({ type: 'progress', data: { message: `✅ Build complete for ${name}` } });
            span?.end({ output: { success: true } });
            return { message: 'Done' }
        } catch (e) {
            log.error(e instanceof Error ? e.message : String(e))
            if (e instanceof ExecaError) {
                return { message: e.message }
            }
            return { message: 'Error' }
        }
    },
})

export const pnpmChangesetStatus = createTool({
    id: 'pnpmChangesetStatus',
    description: 'Used to check which pnpm modules need to be published',
    inputSchema: z.object({}),
    outputSchema: z.object({
        message: z.array(z.string()),
    }),
    execute: async ({ context, writer, tracingContext }) => {
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

            const lines = result.all.split('\n')
            const filteredLines = lines.filter((line) => line.startsWith('+'))
            const packages = filteredLines.map((line) =>
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

export const pnpmChangesetPublish = createTool({
    id: 'pnpmChangesetPublish',
    description: 'Used to publish the pnpm module',
    inputSchema: z.object({}),
    outputSchema: z.object({
        message: z.string(),
    }),
    execute: async ({ context, writer, tracingContext }) => {
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
            log.error(e instanceof Error ? e.message : String(e))
            if (e instanceof ExecaError) {
                return { message: e.message }
            }
            return { message: 'Error' }
        }
    },
})

export const activeDistTag = createTool({
    id: 'activeDistTag',
    description: 'Set active dist tag on pnpm module',
    inputSchema: z.object({
        packagePath: z.string(),
    }),
    outputSchema: z.object({
        message: z.string(),
    }),
    execute: async ({ context, writer, tracingContext }) => {
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
            const version = pkgJson.version
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
            log.error(e instanceof Error ? e.message : String(e))
            if (e instanceof ExecaError) {
                return { message: e.message }
            }
            return { message: 'Error' }
        }
    },
})
