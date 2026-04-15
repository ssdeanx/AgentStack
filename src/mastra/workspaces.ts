import type {
    LSPConfig,
    LSPDiagnostic,
    LSPServerDef,
    Lifecycle,
    LocalFilesystemOptions,
    LocalSandboxOptions,
    SandboxLifecycle,
    SkillSearchOptions,
    SandboxLifecycleHook,
    FilesystemLifecycle,
    MastraFilesystemOptions,
    ProcessHandle,
    SandboxProcessManager,
} from '@mastra/core/workspace'
import {
    Workspace,
    LocalFilesystem,
    LocalSandbox,
    WORKSPACE_TOOLS,
} from '@mastra/core/workspace'
import type { ProcessInfo, SpawnProcessOptions } from '@mastra/core/workspace'
import { DaytonaSandbox } from '@mastra/daytona'
import { AgentFSFilesystem } from '@mastra/agentfs'
import { AgentFS } from 'agentfs-sdk'
import { log } from './config/logger'
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node'
import { libsqlvector } from './config/libsql'
import { embed } from 'ai'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { VersionedSkillSource } from '@mastra/core/workspace'

export const localWorkspacePath = process.env.WORKSPACE_PATH ?? './workspace'
export const daytonaWorkspacePath =
    process.env.DAYTONA_WORKSPACE_PATH ?? './daytona-workspace'
export const workspaceSkillPaths = ['.agents/skills', '/skills', './**/skills']
export const agentFsAgentId =
    process.env.AGENTFS_AGENT_ID ?? 'agentFs-db'
export const sandboxPathEnv = process.env.PATH ?? ''
export const sandboxNodeEnv = process.env.NODE_ENV
export const agentFsDbPath = process.env.AGENTFS_DB_PATH ?? './agentfs-db'

export const workspaceLifecycleState: Lifecycle = {
    status: 'pending',
}

export const filesystemLifecycleState: FilesystemLifecycle = {
    status: 'pending',
}

export const sandboxLifecycleState: SandboxLifecycle = {
    status: 'pending',
}

export const workspaceSkillSearchOptions: SkillSearchOptions = {
    includeReferences: true,
}

export const filesystemLifecycleOptions: MastraFilesystemOptions = {
    onInit: async ({ filesystem }) => {
        log.info('Workspace filesystem ready', {
            filesystemId: filesystem.id,
            provider: filesystem.provider,
        })
        await Promise.resolve()
    },
    onDestroy: async ({ filesystem }) => {
        log.info('Workspace filesystem destroyed', {
            filesystemId: filesystem.id,
            provider: filesystem.provider,
        })
        await Promise.resolve()
    },
}

export const sandboxStartHook: SandboxLifecycleHook = async ({ sandbox }) => {
    log.info('Workspace sandbox started', {
        sandboxId: sandbox.id,
        provider: sandbox.provider,
    })
    await Promise.resolve()
}

export const sandboxStopHook: SandboxLifecycleHook = async ({ sandbox }) => {
    log.info('Workspace sandbox stopped', {
        sandboxId: sandbox.id,
        provider: sandbox.provider,
    })
    await Promise.resolve()
}

export const workspaceLspConfig: LSPConfig = {
  binaryOverrides: {
    typescript: 'typescript-language-server --stdio',
    eslint: 'vscode-eslint-language-server --stdio',
  },
  searchPaths: [process.cwd()],
  root: localWorkspacePath,
  diagnosticTimeout: 5000,
  initTimeout: 15_000,
  disableServers: [],
  packageRunner: 'npx --yes',
}

export const daytonaLspConfig: LSPConfig = {
    binaryOverrides: {
        typescript: 'typescript-language-server --stdio',
        eslint: 'vscode-eslint-language-server --stdio',
    },
    root: daytonaWorkspacePath,
    diagnosticTimeout: 5_000,
    initTimeout: 15_000,
    disableServers: [],
    searchPaths: [process.cwd()],
    packageRunner: 'npx --yes',
}

export const workspaceLspServers: LSPServerDef[] = [
    {
        id: 'typescript',
        name: 'TypeScript Language Server',
        languageIds: [
            'typescript',
            'typescriptreact',
            'javascript',
            'javascriptreact',
        ],
        markers: ['package.json', 'tsconfig.json', 'jsconfig.json'],
        command: () => 'typescript-language-server --stdio',
        initialization: () => ({
            preferences: {
                includeCompletionsForModuleExports: true,
            },
        }),
    },
    {
        id: 'eslint',
        name: 'ESLint Language Server',
        languageIds: [
            'typescript',
            'typescriptreact',
            'javascript',
            'javascriptreact',
        ],
        markers: ['eslint.config.js', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json'],
        command: () => 'vscode-eslint-language-server --stdio',
        initialization: () => ({
            validate: 'on',
        }),
    },
]

export const workspaceLspDiagnostics: LSPDiagnostic[] = []
export const agentFsSdk = AgentFS

export const localTypescriptOnlyLspConfig: LSPConfig = {
    ...workspaceLspConfig,
    disableServers: ['eslint'],
}

export const localEslintOnlyLspConfig: LSPConfig = {
    ...workspaceLspConfig,
    disableServers: ['typescript'],
}

export const daytonaTypescriptOnlyLspConfig: LSPConfig = {
    ...daytonaLspConfig,
    disableServers: ['eslint'],
}

export const daytonaEslintOnlyLspConfig: LSPConfig = {
    ...daytonaLspConfig,
    disableServers: ['typescript'],
}

export const workspaceSpawnOptions: SpawnProcessOptions = {
    cwd: localWorkspacePath,
    env: {
        PATH: sandboxPathEnv,
        NODE_ENV: sandboxNodeEnv,
    },
    timeout: 120_000,
}

export const mainFilesystemOptions: LocalFilesystemOptions = {
    ...filesystemLifecycleOptions,
    id: 'filesystem',
    basePath: localWorkspacePath,
}

export const mainSandboxOptions: LocalSandboxOptions = {
    id: 'sandbox',
    workingDirectory: localWorkspacePath,
    onStart: sandboxStartHook,
    onStop: sandboxStopHook,
    env: {
        PATH: sandboxPathEnv,
        NODE_ENV: sandboxNodeEnv,
    },
    timeout: 120_000,
}

export const daytonaFilesystemOptions: LocalFilesystemOptions = {
    ...filesystemLifecycleOptions,
    id: 'daytona-filesystem',
    basePath: daytonaWorkspacePath,
}

export const mainFilesystem = new LocalFilesystem(mainFilesystemOptions)
export const mainSandbox = new LocalSandbox(mainSandboxOptions)

export const agentFsFilesystem = new AgentFSFilesystem(
    typeof agentFsDbPath === 'string' && agentFsDbPath.length > 0
        ? {
              id: 'agentfs-filesystem',
              path: agentFsDbPath,
          }
        : {
              id: 'agentfs-filesystem',
              agentId: agentFsAgentId,
          }
)

export const daytonaFilesystem = new LocalFilesystem(daytonaFilesystemOptions)

export const listWorkspaceProcesses = async (
    sandbox: { processes: SandboxProcessManager } = mainSandbox
): Promise<ProcessInfo[]> => {
    return sandbox.processes.list()
}

export function getWorkspaceProcessStreams(handle: ProcessHandle): {
    reader: ProcessHandle['reader']
    writer: ProcessHandle['writer']
} {
    return {
        reader: handle.reader,
        writer: handle.writer,
    }
}

export function createWorkspaceLspConnection(handle: ProcessHandle) {
    const connection = createMessageConnection(
        new StreamMessageReader(handle.reader),
        new StreamMessageWriter(handle.writer)
    )

    connection.listen()

    return connection
}

export async function spawnWorkspaceProcess(
    command: string,
    options: SpawnProcessOptions = workspaceSpawnOptions,
    sandbox: { processes: SandboxProcessManager } = mainSandbox
): Promise<ProcessHandle> {
    return sandbox.processes.spawn(command, options)
}

export async function spawnWorkspaceLspProcess(
    command: string,
    options: SpawnProcessOptions = workspaceSpawnOptions,
    sandbox: { processes: SandboxProcessManager } = mainSandbox
): Promise<{
    handle: ProcessHandle
    connection: ReturnType<typeof createWorkspaceLspConnection>
    reader: ProcessHandle['reader']
    writer: ProcessHandle['writer']
}> {
    const handle = await sandbox.processes.spawn(command, options)
    return {
        handle,
        connection: createWorkspaceLspConnection(handle),
        ...getWorkspaceProcessStreams(handle),
    }
}

export const getWorkspaceProcessHandle = async (
    pid: string,
    sandbox: { processes: SandboxProcessManager } = mainSandbox
): Promise<ProcessHandle | undefined> => {
    return sandbox.processes.get(pid)
}

export const killWorkspaceProcess = async (
    pid: string,
    sandbox: { processes: SandboxProcessManager } = mainSandbox
): Promise<boolean> => {
    return sandbox.processes.kill(pid)
}

export const mainWorkspace = new Workspace({
    id: 'main-Workspace',
    name: 'MainWorkspace',
    filesystem: mainFilesystem,
    sandbox: mainSandbox,
    vectorStore: libsqlvector,
    embedder: async (text: string) => {
    const { embedding } = await embed({
      model: new ModelRouterEmbeddingModel(
              'google/gemini-embedding-2-preview'
          ),
      value: text,
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
    bm25: {
    k1: 1.5,
    b: 0.75,
    },
    //skillSource: new VersionedSkillSource(versionTree, blobStore, versionCreatedAt),
})

export const localFilesystemOnlyWorkspace = new Workspace({
    id: 'local-filesystem-only-workspace',
    name: 'LocalFilesystemOnlyWorkspace',
    filesystem: new LocalFilesystem(mainFilesystemOptions),
    skills: workspaceSkillPaths,
    bm25: true,
})

export const localSandboxOnlyWorkspace = new Workspace({
    id: 'local-sandbox-only-workspace',
    name: 'LocalSandboxOnlyWorkspace',
    sandbox: new LocalSandbox(mainSandboxOptions),
    lsp: workspaceLspConfig,
})

export const localReadOnlyWorkspace = new Workspace({
    id: 'local-readonly-workspace',
    name: 'LocalReadonlyWorkspace',
    filesystem: new LocalFilesystem({
        ...mainFilesystemOptions,
        id: 'filesystem-readonly',
        readOnly: true,
    }),
    sandbox: new LocalSandbox(mainSandboxOptions),
    lsp: workspaceLspConfig,
    skills: workspaceSkillPaths,
    bm25: true,
})

export const localApprovalWorkspace = new Workspace({
    id: 'local-approval-workspace',
    name: 'LocalApprovalWorkspace',
    filesystem: new LocalFilesystem(mainFilesystemOptions),
    sandbox: new LocalSandbox(mainSandboxOptions),
    lsp: workspaceLspConfig,
    tools: {
        [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
            requireReadBeforeWrite: true,
        },
        [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: {
            requireReadBeforeWrite: true,
        },
        [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: {
            requireApproval: true,
        },
        [WORKSPACE_TOOLS.FILESYSTEM.AST_EDIT]: {
            requireReadBeforeWrite: true,
        },
        [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
            requireApproval: true,
        },
    },
    skills: workspaceSkillPaths,
    bm25: true,
})

export const localLspWorkspace = new Workspace({
    id: 'local-lsp-workspace',
    name: 'LocalLspWorkspace',
    filesystem: new LocalFilesystem(mainFilesystemOptions),
    sandbox: new LocalSandbox(mainSandboxOptions),
    lsp: workspaceLspConfig,
    skills: workspaceSkillPaths,
    bm25: true,
})

export const localTypescriptLspWorkspace = new Workspace({
    id: 'local-typescript-lsp-workspace',
    name: 'LocalTypescriptLspWorkspace',
    filesystem: new LocalFilesystem(mainFilesystemOptions),
    sandbox: new LocalSandbox(mainSandboxOptions),
    lsp: localTypescriptOnlyLspConfig,
    skills: workspaceSkillPaths,
    bm25: true,
})

export const localEslintLspWorkspace = new Workspace({
    id: 'local-eslint-lsp-workspace',
    name: 'LocalEslintLspWorkspace',
    filesystem: new LocalFilesystem(mainFilesystemOptions),
    sandbox: new LocalSandbox(mainSandboxOptions),
    lsp: localEslintOnlyLspConfig,
    skills: workspaceSkillPaths,
    bm25: true,
})

export const agentFsWorkspace = new Workspace({
    id: 'agentfs-workspace',
    name: 'AgentFSWorkspace',
    filesystem: new AgentFSFilesystem({
        id: 'agentFS-filesystem',
        agentId: 'agent',
        readOnly: false,
    }),
    sandbox: new LocalSandbox({
    workingDirectory: 'file:./agentfs',
    nativeSandbox: {
        allowNetwork: true, // Block network access (default)
        readWritePaths: ['/tmp/extra',
      '../.agents/**/skills',
      '/skills',
      '/',
      '.agents/skills'
        ], // Additional writable paths
        },
        }),
    skills: workspaceSkillPaths,
    vectorStore: libsqlvector,
    embedder: async (text: string) => {
    const { embedding } = await embed({
      model: new ModelRouterEmbeddingModel(
              'google/gemini-embedding-2-preview'
          ),
      value: text,
    })
    return embedding
    },
    lsp: true,
    bm25: true,
})

export const agentFsReadOnlyWorkspace = new Workspace({
    id: 'agentfs-readonly-workspace',
    name: 'AgentFSReadonlyWorkspace',
    filesystem: new AgentFSFilesystem(
        typeof agentFsDbPath === 'string' && agentFsDbPath.length > 0
            ? {
                  id: 'agentfs-filesystem-readonly',
                  path: agentFsDbPath,
                  readOnly: true,
              }
            : {
                  id: 'agentfs-filesystem-readonly',
                  agentId: agentFsAgentId,
                  readOnly: true,
              }
    ),
    skills: workspaceSkillPaths,
    bm25: true,
})

export const daytonaSandbox = new DaytonaSandbox({
    id: 'daytona-sandbox',
    name: 'Daytona Sandbox',
    image: 'node:20-slim',
    resources: { cpu: 2, memory: 4, disk: 6 },
    language: 'typescript',
    timeout: 120_000,
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL,
})

export const daytonaWorkspace = new Workspace({
    id: 'daytona-Workspace',
    name: 'DaytonaWorkspace',
    filesystem: daytonaFilesystem,
    sandbox: daytonaSandbox,
    skills: workspaceSkillPaths,
    bm25: true,
})

export const daytonaLspWorkspace = new Workspace({
    id: 'daytona-lsp-workspace',
    name: 'DaytonaLspWorkspace',
    filesystem: new LocalFilesystem(daytonaFilesystemOptions),
    sandbox: new DaytonaSandbox({
        id: 'daytona-lsp-sandbox',
        name: 'Daytona LSP Sandbox',
        image: 'node:20-slim',
        resources: { cpu: 2, memory: 4, disk: 6 },
        language: 'typescript',
        timeout: 120_000,
        apiKey: process.env.DAYTONA_API_KEY,
        apiUrl: process.env.DAYTONA_API_URL,
    }),
    lsp: daytonaLspConfig,
    skills: workspaceSkillPaths,
    bm25: true,
})

export const daytonaTypescriptLspWorkspace = new Workspace({
    id: 'daytona-typescript-lsp-workspace',
    name: 'DaytonaTypescriptLspWorkspace',
    filesystem: new LocalFilesystem(daytonaFilesystemOptions),
    sandbox: new DaytonaSandbox({
        id: 'daytona-typescript-lsp-sandbox',
        name: 'Daytona TypeScript LSP Sandbox',
        image: 'node:20-slim',
        resources: { cpu: 2, memory: 4, disk: 6 },
        language: 'typescript',
        timeout: 120_000,
        apiKey: process.env.DAYTONA_API_KEY,
        apiUrl: process.env.DAYTONA_API_URL,
    }),
    lsp: daytonaTypescriptOnlyLspConfig,
    skills: workspaceSkillPaths,
    bm25: true,
})

export const daytonaEslintLspWorkspace = new Workspace({
    id: 'daytona-eslint-lsp-workspace',
    name: 'DaytonaEslintLspWorkspace',
    filesystem: new LocalFilesystem(daytonaFilesystemOptions),
    sandbox: new DaytonaSandbox({
        id: 'daytona-eslint-lsp-sandbox',
        name: 'Daytona ESLint LSP Sandbox',
        image: 'node:20-slim',
        resources: { cpu: 2, memory: 4, disk: 6 },
        language: 'typescript',
        timeout: 120_000,
        apiKey: process.env.DAYTONA_API_KEY,
        apiUrl: process.env.DAYTONA_API_URL,
    }),
    lsp: daytonaEslintOnlyLspConfig,
    skills: workspaceSkillPaths,
    bm25: true,
})

export const workspaceVariants = {
    mainWorkspace,
    localFilesystemOnlyWorkspace,
    localSandboxOnlyWorkspace,
    localReadOnlyWorkspace,
    localApprovalWorkspace,
    localLspWorkspace,
    localTypescriptLspWorkspace,
    localEslintLspWorkspace,
    agentFsWorkspace,
    agentFsReadOnlyWorkspace,
    daytonaWorkspace,
    daytonaLspWorkspace,
    daytonaTypescriptLspWorkspace,
    daytonaEslintLspWorkspace,
} as const
