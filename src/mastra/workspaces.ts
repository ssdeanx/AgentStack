import type {
    LSPConfig,
    LSPDiagnostic,
    //LSPServerDef,
    Lifecycle,
    LocalFilesystemOptions,
    LocalSandboxOptions,
    SandboxLifecycle,
    SkillSearchOptions,
    FilesystemLifecycleHook,
    MastraFilesystemOptions,
    ProcessHandle,
    SandboxProcessManager,
    SandboxDetectionResult,
    SandboxError,
    SandboxLifecycleHook,
    SandboxExecutionError,
    SandboxFeatureNotSupportedError,
    SandboxInfo,
    SandboxNotAvailableError,
    SandboxNotReadyError,
    SandboxOperation,
    SandboxTimeoutError,
    SearchNotAvailableError,
    SkillSearchResult,
    Skill,
    SkillFormat,
    SkillMetadata,
    SkillPublishResult,
    SkillSource,
    StaleFileError,
    SkillsContext,
    SkillsResolver,
    SkillSourceStat,
    SkillSourceEntry,
    SpawnProcessOptions,
    ProcessInfo,
    ListOptions,
    FilesystemLifecycle,
    FileContent,
    FilesystemError,
    FilesystemMountConfig,
    FileEntry,
    FileStat,
    FileExistsError,
    FileNotFoundError,
    FileReadRequiredError,
    FilesystemIcon,
    FilesystemInfo,
    FilesystemNotAvailableError,
    FilesystemNotMountableError,
    FilesystemNotReadyError,
    WorkspaceNotAvailableError,
    WorkspaceInfo,
    WorkspaceSandbox,
    WorkspaceFilesystem,
    WorkspaceConfig,
    WorkspaceError,
    WorkspaceNotReadyError,
    WorkspaceSkills,
    WorkspaceStatus,
    WriteOptions,
    WorkspaceReadOnlyError,
    MastraSandbox,
    MastraFilesystem,
    MastraSandboxOptions
} from '@mastra/core/workspace'
import {
    Workspace,
    LocalFilesystem,
    LocalSandbox,
    WORKSPACE_TOOLS,
} from '@mastra/core/workspace'
//import { createFilesystem } from '@mastra/core/workspace/filesystem'
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

//import { VersionedSkillSource } from '@mastra/core/workspace'
//import { SandboxContent } from '../components/ai-elements/sandbox';
import { fastembed } from '@mastra/fastembed'
import { S3Filesystem } from '@mastra/s3'


const s3filesystem = new S3Filesystem({
  bucket: 'my-bucket',
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
})


export const localWorkspacePath = process.env.WORKSPACE_PATH ?? './workspace'
export const daytonaWorkspacePath =
    process.env.DAYTONA_WORKSPACE_PATH ?? './daytona-workspace'
export const workspaceSkillPaths = [ 'skills', './**/skills']
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

export const filesystemLifecycleStateHook: FilesystemLifecycle = {
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
  searchPaths: [process.cwd()],
  root: localWorkspacePath,
  diagnosticTimeout: 5000,
  initTimeout: 15_000,
  disableServers: [],
  packageRunner: 'npx --yes',
}

export const daytonaLspConfig: LSPConfig = {
    root: daytonaWorkspacePath,
    diagnosticTimeout: 5_000,
    initTimeout: 15_000,
    disableServers: [],
    searchPaths: [process.cwd()],
    packageRunner: 'npx --yes',
}


export const workspaceLspDiagnostics: LSPDiagnostic[] = []
export const agentFsSdk = AgentFS


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
    isolation: 'none',
    instructions: 'This is the main sandbox for the workspace. You can use this sandbox to execute commands and run processes as part of your tasks. Always be careful when executing commands and make sure to follow the instructions provided by the user',
    nativeSandbox: {
        allowNetwork: true, // Block network access (default)
        readWritePaths: ['*'], // Additional writable paths
        readOnlyPaths: [], // Additional read-only paths
        allowSystemBinaries: true, // Allow access to system binaries (default: false)
    },
    onStart: sandboxStartHook,
    onStop: sandboxStopHook,
    env: {
        PATH: sandboxPathEnv,
        NODE_ENV: sandboxNodeEnv,
        API_URL: process.env.API_URL ?? 'http://localhost:4111/api',
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
    sandbox:new LocalSandbox(mainSandboxOptions),
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
        functionId: 'mainWorkspace-embedder',
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
    bm25: {
    k1: 1.5,
    b: 0.75,
    },
    autoIndexPaths: ['/docs', '/support/faq', '/skills', '/**/*.md', '/**/*.txt'],
    //skillSource: new VersionedSkillSource(versionTree, blobStore, versionCreatedAt),
})

//const handle = await mainSandbox.processes.spawn('typescript-language-server --stdio', {
//    cwd: '/',
//    env: {
//        ...process.env,
//        NODE_ENV: 'development',
//    },
//    timeout: 60_000,
//})

//const connection = createMessageConnection(
//  new StreamMessageReader(handle.reader),
//  new StreamMessageWriter(handle.writer),
//)
//connection.listen()

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
      model: fastembed,
      value: text,
      maxRetries: 3,
      abortSignal: new AbortController().signal,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
        functionId: 'mainWorkspace-embedder',
        },
    })
    return embedding
    },
    lsp: true,
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



export const workspaceVariants = {
    mainWorkspace,
    agentFsWorkspace,
    daytonaWorkspace,
    // Add more workspace variants here
    // variantName: new Workspace({ ... })
} as const
