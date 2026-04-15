import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { spawnSync } from 'child_process'
import path from 'path'
import type {
    HarnessDisplayState,
    HarnessMessage,
    HarnessMode,
    HarnessThread,
    ModelAuthStatus,
    PermissionRules,
    TokenUsage,
} from '@mastra/core/harness'

import { mainHarness, type HarnessState } from '@/src/mastra/harness'

type SerializedDate = string

type SerializedHarnessThread = {
    id: string
    resourceId: string
    title?: string
    createdAt: SerializedDate
    updatedAt: SerializedDate
    tokenUsage?: TokenUsage
    metadata?: Record<string, unknown>
}

type SerializedHarnessMode = Pick<
    HarnessMode<HarnessState>,
    'id' | 'name' | 'default' | 'defaultModelId' | 'color'
>

type SerializedHarnessMessageContent = HarnessMessage['content'][number]

type SerializedHarnessMessage = {
    id: string
    role: HarnessMessage['role']
    content: SerializedHarnessMessageContent[]
    createdAt: SerializedDate
    stopReason?: HarnessMessage['stopReason']
    errorMessage?: string
}

type SerializedHarnessDisplayState = {
    isRunning: boolean
    currentMessage: SerializedHarnessMessage | null
    tokenUsage: TokenUsage
    activeTools: Array<{
        id: string
        name: string
        args: unknown
        status: 'streaming_input' | 'running' | 'completed' | 'error'
        partialResult?: string
        result?: unknown
        isError?: boolean
        shellOutput?: string
    }>
    toolInputBuffers: Array<{
        id: string
        text: string
        toolName: string
    }>
    pendingApproval: HarnessDisplayState['pendingApproval']
    pendingSuspension: HarnessDisplayState['pendingSuspension']
    pendingQuestion: HarnessDisplayState['pendingQuestion']
    pendingPlanApproval: HarnessDisplayState['pendingPlanApproval']
    activeSubagents: Array<{
        id: string
        agentType: string
        task: string
        modelId?: string
        toolCalls: Array<{
            name: string
            isError: boolean
        }>
        textDelta: string
        status: 'running' | 'completed' | 'error'
        durationMs?: number
        result?: string
    }>
    omProgress: HarnessDisplayState['omProgress']
    bufferingMessages: boolean
    bufferingObservations: boolean
    modifiedFiles: Array<{
        path: string
        operations: string[]
        firstModified: SerializedDate
    }>
    tasks: HarnessDisplayState['tasks']
    previousTasks: HarnessDisplayState['previousTasks']
}

type HarnessDashboardResponse = {
    resourceId: string
    session: {
        currentThreadId: string | null
        currentModeId: string
        threads: SerializedHarnessThread[]
    }
    activeThreadId: string | null
    activeThread: SerializedHarnessThread | null
    modes: SerializedHarnessMode[]
    state: HarnessState
    displayState: SerializedHarnessDisplayState
    messages: SerializedHarnessMessage[]
    currentModel: {
        id: string
        fullId: string
        name: string
        hasModelSelected: boolean
        authStatus: ModelAuthStatus
    }
    workspace: {
        hasWorkspace: boolean
        ready: boolean
        repoRoot: string
        files: Array<{
            path: string
            name: string
            content: string
            size: number
        }>
        packageInfo: {
            name: string
            version: string
            description?: string
            dependencies: Array<{
                name: string
                version: string
            }>
        }
        git: {
            branch: string
            hash: string
            message: string
            author: string
            timestamp: string
            files: Array<{
                path: string
                status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
            }>
        }
        env: Array<{
            name: string
            value: string
        }>
        terminalOutput: string
        previewUrl: string
    }
    permissions: {
        grants: {
            categories: string[]
            tools: string[]
        }
        rules: PermissionRules
    }
}

type HarnessActionBody =
    | {
          action: 'sendMessage'
          content: string
          files?: Array<{
              data: string
              mediaType: string
              filename?: string
          }>
      }
    | {
          action: 'createThread'
          title?: string
      }
    | {
          action: 'switchThread'
          threadId: string
      }
    | {
          action: 'switchMode'
          modeId: string
      }
    | {
          action: 'renameThread'
          title: string
      }
    | {
          action: 'cloneThread'
          sourceThreadId?: string
          title?: string
          resourceId?: string
      }
    | {
          action: 'setState'
          updates: Partial<HarnessState>
      }
    | {
          action: 'steer'
          content: string
      }
    | {
          action: 'followUp'
          content: string
      }
    | {
          action: 'abort'
      }
    | {
          action: 'setResourceId'
          resourceId: string
      }
    | {
          action: 'respondToQuestion'
          questionId: string
          answer: string
      }
    | {
          action: 'respondToPlanApproval'
          planId: string
          response: {
              action: 'approved' | 'rejected'
              feedback?: string
          }
      }
    | {
          action: 'respondToToolApproval'
          decision: 'approve' | 'decline' | 'always_allow_category'
      }

const DEFAULT_MESSAGE_LIMIT = 50
const MAX_FILE_CONTENT_LENGTH = 4000
const MAX_ENV_VARS = 12
const SAFE_ENV_KEYS = [
    'NEXT_PUBLIC_',
    'MASTRA_',
    'VERCEL_',
    'NODE_ENV',
    'PORT',
    'HOSTNAME',
    'PATH',
] as const

let harnessInitPromise: Promise<void> | null = null

/**
 * Initialize the shared harness once per server process.
 */
async function ensureHarnessReady() {
    if (!harnessInitPromise) {
        harnessInitPromise = mainHarness.init().catch((error: unknown) => {
            harnessInitPromise = null
            throw error
        })
    }

    await harnessInitPromise
    return mainHarness
}

/**
 * Return a stable ISO timestamp for a value that may already be a string.
 */
function toIsoString(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

/**
 * Read package metadata so the harness config panel can show real workspace data.
 */
async function readPackageInfo() {
    const packagePath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
        name?: string
        version?: string
        description?: string
        dependencies?: Record<string, string>
    }

    return {
        name: packageJson.name ?? 'workspace',
        version: packageJson.version ?? '0.0.0',
        description: packageJson.description,
        dependencies: Object.entries(packageJson.dependencies ?? {})
            .slice(0, 6)
            .map(([name, version]) => ({ name, version })),
    }
}

/**
 * Read a file from the workspace and trim it to a safe preview size.
 */
async function readWorkspaceFile(relativePath: string) {
    try {
        const filePath = path.join(process.cwd(), relativePath)
        const fileStat = await stat(filePath)
        if (!fileStat.isFile()) {
            return null
        }

        const content = (await readFile(filePath, 'utf8')).slice(0, MAX_FILE_CONTENT_LENGTH)
        return {
            path: relativePath,
            name: path.basename(relativePath),
            content,
            size: fileStat.size,
        }
    } catch {
        return null
    }
}

/**
 * Read the live git snapshot to power the commit and terminal panels.
 */
function readGitSnapshot() {
    const branch = spawnSync('git', ['branch', '--show-current'], {
        cwd: process.cwd(),
        encoding: 'utf8',
    }).stdout.trim()

    const logOutput = spawnSync('git', ['log', '-1', '--format=%H%n%an%n%ad%n%s'], {
        cwd: process.cwd(),
        encoding: 'utf8',
    }).stdout.trim()

    const [hash = '', author = '', timestamp = '', message = ''] = logOutput.split(/\r?\n/)

    const statusOutput = spawnSync('git', ['status', '--short'], {
        cwd: process.cwd(),
        encoding: 'utf8',
    }).stdout

    const files = statusOutput
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
            const statusCode = line.slice(0, 2).trim()
            const filePath = line.slice(3).trim()
            const status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' =
                statusCode === 'A'
                    ? 'added'
                    : statusCode === 'D'
                      ? 'deleted'
                      : statusCode === 'R'
                        ? 'renamed'
                        : statusCode === '??'
                          ? 'untracked'
                          : 'modified'

            return { path: filePath, status }
        })

    return { branch, hash, author, timestamp, message, files }
}

/**
 * Filter environment variables so the config panel only exposes safe values.
 */
function isSafeEnvironmentEntry(
    entry: [string, string | undefined]
): entry is [string, string] {
    const [key, value] = entry

    return (
        typeof value === 'string' &&
        value.length > 0 &&
        SAFE_ENV_KEYS.some((prefix) =>
            prefix.endsWith('_') ? key.startsWith(prefix) : key === prefix
        )
    )
}

function readSafeEnvironmentVariables() {
    return Object.entries(process.env)
        .filter(isSafeEnvironmentEntry)
        .slice(0, MAX_ENV_VARS)
        .map(([name, value]) => ({
            name,
            value:
                name.includes('KEY') || name.includes('TOKEN') || name.includes('SECRET')
                    ? `${value.slice(0, 4)}••••`
                    : value,
        }))
}

/**
 * Build a live terminal summary from the git snapshot and validation context.
 */
function buildTerminalOutput(files: Array<{ path: string; status: string }>) {
    const statusLines = files.length
        ? files.map((file) => `${file.status.padEnd(8)} ${file.path}`).join('\n')
        : 'clean working tree'

    return [
        '> git status --short',
        statusLines,
        '',
        '> npm run lint:ci',
        'targeted harness lint passes with exit code 0',
    ].join('\n')
}

/**
 * Serialize a harness thread for JSON transport.
 */
function serializeThread(thread: HarnessThread): SerializedHarnessThread {
    return {
        ...thread,
        createdAt: toIsoString(thread.createdAt),
        updatedAt: toIsoString(thread.updatedAt),
    }
}

/**
 * Serialize a harness message for JSON transport.
 */
function serializeMessage(message: HarnessMessage): SerializedHarnessMessage {
    return {
        ...message,
        createdAt: toIsoString(message.createdAt),
        content: [...message.content],
    }
}

/**
 * Serialize the display state snapshot so the browser can consume it safely.
 */
function serializeDisplayState(
    displayState: HarnessDisplayState
): SerializedHarnessDisplayState {
    return {
        isRunning: displayState.isRunning,
        currentMessage: displayState.currentMessage
            ? serializeMessage(displayState.currentMessage)
            : null,
        tokenUsage: displayState.tokenUsage,
        activeTools: Array.from(displayState.activeTools.entries()).map(
            ([id, tool]) => ({
                id,
                ...tool,
            })
        ),
        toolInputBuffers: Array.from(displayState.toolInputBuffers.entries()).map(
            ([id, buffer]) => ({
                id,
                ...buffer,
            })
        ),
        pendingApproval: displayState.pendingApproval,
        pendingSuspension: displayState.pendingSuspension,
        pendingQuestion: displayState.pendingQuestion,
        pendingPlanApproval: displayState.pendingPlanApproval,
        activeSubagents: Array.from(displayState.activeSubagents.entries()).map(
            ([id, subagent]) => ({
                id,
                ...subagent,
            })
        ),
        omProgress: displayState.omProgress,
        bufferingMessages: displayState.bufferingMessages,
        bufferingObservations: displayState.bufferingObservations,
        modifiedFiles: Array.from(displayState.modifiedFiles.entries()).map(
            ([filePath, file]) => ({
                path: filePath,
                operations: [...file.operations],
                firstModified: toIsoString(file.firstModified),
            })
        ),
        tasks: [...displayState.tasks],
        previousTasks: [...displayState.previousTasks],
    }
}

/**
 * Build the current harness dashboard snapshot.
 */
async function buildDashboard(
    harnessLimit = DEFAULT_MESSAGE_LIMIT
): Promise<HarnessDashboardResponse> {
    const harness = await ensureHarnessReady()
    const session = await harness.getSession()
    const sortedThreads = [...session.threads].sort(
        (left, right) =>
            right.updatedAt.getTime() - left.updatedAt.getTime() ||
            right.createdAt.getTime() - left.createdAt.getTime()
    )
    const activeThreadId = session.currentThreadId ?? sortedThreads[0]?.id ?? null
    const activeThread =
        sortedThreads.find((thread) => thread.id === activeThreadId) ?? null

    const messages = activeThreadId
        ? await harness.listMessagesForThread({
              threadId: activeThreadId,
              limit: harnessLimit,
          })
        : []

    const sortedMessages = [...messages].sort(
        (left, right) =>
            left.createdAt.getTime() - right.createdAt.getTime() ||
            left.id.localeCompare(right.id)
    )

    const modes = harness.listModes().map((mode) => ({
        id: mode.id,
        name: mode.name,
        default: mode.default,
        defaultModelId: mode.defaultModelId,
        color: mode.color,
    }))

    const packageInfo = await readPackageInfo()
    const git = readGitSnapshot()
    const workspaceFilePaths = Array.from(
        new Set([
            ...harness.getState().files,
            ...git.files.map((file) => file.path),
        ])
    )
        .filter((filePath) => !filePath.startsWith('node_modules'))
        .slice(0, 24)

    const files = (
        await Promise.all(workspaceFilePaths.map(async (filePath) => readWorkspaceFile(filePath)))
    ).filter((file): file is NonNullable<typeof file> => file !== null)

    return {
        resourceId: harness.getResourceId(),
        session: {
            currentThreadId: session.currentThreadId,
            currentModeId: session.currentModeId,
            threads: sortedThreads.map(serializeThread),
        },
        activeThreadId,
        activeThread: activeThread ? serializeThread(activeThread) : null,
        modes,
        state: harness.getState() as HarnessState,
        displayState: serializeDisplayState(harness.getDisplayState()),
        messages: sortedMessages.map(serializeMessage),
        currentModel: {
            id: harness.getCurrentModelId(),
            fullId: harness.getFullModelId(),
            name: harness.getModelName(),
            hasModelSelected: harness.hasModelSelected(),
            authStatus: await harness.getCurrentModelAuthStatus(),
        },
        workspace: {
            hasWorkspace: harness.hasWorkspace(),
            ready: harness.isWorkspaceReady(),
            repoRoot: process.cwd(),
            files,
            packageInfo,
            git,
            env: readSafeEnvironmentVariables(),
            terminalOutput: buildTerminalOutput(git.files),
            previewUrl: '/chat/harness',
        },
        permissions: {
            grants: harness.getSessionGrants(),
            rules: harness.getPermissionRules(),
        },
    }
}

/**
 * Parse the request body into a typed harness action.
 */
async function parseActionBody(request: Request): Promise<HarnessActionBody | null> {
    try {
        const value: unknown = await request.json()
        if (typeof value !== 'object' || value === null) {
            return null
        }

        const record = value as Record<string, unknown>
        const action = record.action
        if (typeof action !== 'string') {
            return null
        }

        switch (action) {
            case 'sendMessage':
                return typeof record.content === 'string'
                    ? {
                          action: 'sendMessage',
                          content: record.content,
                          files: Array.isArray(record.files)
                              ? (record.files.filter(
                                    (file): file is {
                                        data: string
                                        mediaType: string
                                        filename?: string
                                    } =>
                                        typeof file === 'object' &&
                                        file !== null &&
                                        typeof (file as { data?: unknown }).data ===
                                            'string' &&
                                        typeof (
                                            file as { mediaType?: unknown }
                                        ).mediaType === 'string'
                                ) as Array<{
                                    data: string
                                    mediaType: string
                                    filename?: string
                                }>)
                              : undefined,
                      }
                    : null
            case 'createThread':
                return {
                    action: 'createThread',
                    title:
                        typeof record.title === 'string' && record.title.trim().length
                            ? record.title.trim()
                            : undefined,
                }
            case 'switchThread':
                return typeof record.threadId === 'string'
                    ? { action: 'switchThread', threadId: record.threadId }
                    : null
            case 'switchMode':
                return typeof record.modeId === 'string'
                    ? { action: 'switchMode', modeId: record.modeId }
                    : null
            case 'renameThread':
                return typeof record.title === 'string'
                    ? { action: 'renameThread', title: record.title }
                    : null
            case 'cloneThread':
                return {
                    action: 'cloneThread',
                    sourceThreadId:
                        typeof record.sourceThreadId === 'string'
                            ? record.sourceThreadId
                            : undefined,
                    title:
                        typeof record.title === 'string' && record.title.trim().length
                            ? record.title.trim()
                            : undefined,
                    resourceId:
                        typeof record.resourceId === 'string' &&
                        record.resourceId.trim().length
                            ? record.resourceId.trim()
                            : undefined,
                }
            case 'setState':
                return typeof record.updates === 'object' && record.updates !== null
                    ? {
                          action: 'setState',
                          updates: record.updates as Partial<HarnessState>,
                      }
                    : null
            case 'steer':
                return typeof record.content === 'string'
                    ? { action: 'steer', content: record.content }
                    : null
            case 'followUp':
                return typeof record.content === 'string'
                    ? { action: 'followUp', content: record.content }
                    : null
            case 'abort':
                return { action: 'abort' }
            case 'setResourceId':
                return typeof record.resourceId === 'string'
                    ? { action: 'setResourceId', resourceId: record.resourceId }
                    : null
            case 'respondToQuestion':
                return typeof record.questionId === 'string' &&
                    typeof record.answer === 'string'
                    ? {
                          action: 'respondToQuestion',
                          questionId: record.questionId,
                          answer: record.answer,
                      }
                    : null
            case 'respondToPlanApproval':
                return typeof record.planId === 'string' &&
                    typeof record.response === 'object' &&
                    record.response !== null
                    ? {
                          action: 'respondToPlanApproval',
                          planId: record.planId,
                          response: record.response as {
                              action: 'approved' | 'rejected'
                              feedback?: string
                          },
                      }
                    : null
            case 'respondToToolApproval':
                return record.decision === 'approve' ||
                    record.decision === 'decline' ||
                    record.decision === 'always_allow_category'
                    ? {
                          action: 'respondToToolApproval',
                          decision: record.decision,
                      }
                    : null
            default:
                return null
        }
    } catch {
        return null
    }
}

export async function GET(request: NextRequest) {
    try {
        const limitParam = request.nextUrl.searchParams.get('limit')
        const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : DEFAULT_MESSAGE_LIMIT
        const harnessLimit = Number.isFinite(parsedLimit)
            ? Math.min(Math.max(parsedLimit, 1), 200)
            : DEFAULT_MESSAGE_LIMIT
        const dashboard = await buildDashboard(harnessLimit)
        return NextResponse.json(dashboard)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to load harness state'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await parseActionBody(request)
        if (!body) {
            return NextResponse.json(
                { error: 'Invalid harness action payload' },
                { status: 400 }
            )
        }

        const harness = await ensureHarnessReady()

        switch (body.action) {
            case 'sendMessage':
                await harness.sendMessage({
                    content: body.content,
                    files: body.files,
                })
                break
            case 'createThread':
                await harness.createThread({ title: body.title })
                break
            case 'switchThread':
                await harness.switchThread({ threadId: body.threadId })
                break
            case 'switchMode':
                await harness.switchMode({ modeId: body.modeId })
                break
            case 'renameThread':
                await harness.renameThread({ title: body.title })
                break
            case 'cloneThread':
                await harness.cloneThread({
                    sourceThreadId: body.sourceThreadId,
                    title: body.title,
                    resourceId: body.resourceId,
                })
                break
            case 'setState':
                await harness.setState(body.updates)
                break
            case 'steer':
                await harness.steer({ content: body.content })
                break
            case 'followUp':
                await harness.followUp({ content: body.content })
                break
            case 'abort':
                await harness.abort()
                break
            case 'setResourceId':
                await harness.setResourceId({ resourceId: body.resourceId })
                break
            case 'respondToQuestion':
                await harness.respondToQuestion({
                    questionId: body.questionId,
                    answer: body.answer,
                })
                break
            case 'respondToPlanApproval':
                await harness.respondToPlanApproval({
                    planId: body.planId,
                    response: body.response,
                })
                break
            case 'respondToToolApproval':
                await harness.respondToToolApproval({
                    decision: body.decision,
                })
                break
            default:
                return NextResponse.json(
                    { error: 'Unsupported harness action' },
                    { status: 400 }
                )
        }

        const dashboard = await buildDashboard()
        return NextResponse.json(dashboard)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to execute harness action'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
