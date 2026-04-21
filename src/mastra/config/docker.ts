import { LocalFilesystem, Workspace, WORKSPACE_TOOLS } from '@mastra/core/workspace'
import { DockerSandbox } from '@mastra/docker'
import { libsqlvector } from './libsql'
import { embed } from 'ai'
import { fastembed } from '@mastra/fastembed'
import { log } from './logger'


export const dockerWorkspace = new Workspace({
    id: 'docker-workspace',
    sandbox: new DockerSandbox({
        id: 'node:22-slim',
        image: 'node:22-slim',
        timeout: 60000,
        volumes: {
            '/app': '/app',
        },
    }),
    filesystem: new LocalFilesystem({ id: 'docker-workspace', basePath: './docker-workspace' }),
    vectorStore: libsqlvector,
    embedder: async (text: string) => {
        const { embedding } = await embed({
            model: fastembed,
            value: text,
            maxRetries: 3,
            abortSignal: new AbortController().signal,
            providerOptions: {
            },
            experimental_telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
            functionId: 'dockerWorkspace-embedder',
            },
      })
      return embedding
      },
    lsp: true,
    tools: {
            [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: {
                backgroundProcesses: {
                    abortSignal: undefined,
                    onStdout: (data, meta) => {
                        log.info('Workspace process stdout', {
                            pid: meta.pid,
                            toolCallId: meta.toolCallId,
                            data,
                        })
                    },
                    onStderr: (data, meta) => {
                        log.error('Workspace process stderr', {
                            pid: meta.pid,
                            toolCallId: meta.toolCallId,
                            data,
                        })
                    },
                    onExit: meta => {
                        log.info('Workspace process exited', {
                            pid: meta.pid,
                            exitCode: meta.exitCode,
                            toolCallId: meta.toolCallId,
                        })
                    },
                },
            },
    },
    skills: ['/skills'],
    bm25: { k1: 1.5, b: 0.75,},
    autoIndexPaths: ['/docs', '/support/faq', '/skills', '/**/*.md', '/**/*.txt'],
})