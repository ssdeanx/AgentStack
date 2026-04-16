'use client'

import { useMemo, useState } from 'react'

import {
    useAgent,
    useSandboxReadFile,
    useSandboxFiles,
    useSandboxInfo,
    useSandboxStat,
    useSandboxDeleteMutation,
    useSandboxMkdirMutation,
    useSandboxWriteFileMutation,
    useWorkspaceReadFile,
    useWorkspaceFiles,
    useWorkspaceInfo,
    useWorkspaceStat,
    useWorkspaceDeleteMutation,
    useWorkspaceMkdirMutation,
    useWorkspaceWriteFileMutation,
} from '@/lib/hooks/use-mastra-query'
import { MainSidebar } from './main-sidebar'
import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import {
    Context,
    ContextCacheUsage,
    ContextContent,
    ContextContentBody,
    ContextContentFooter,
    ContextContentHeader,
    ContextInputUsage,
    ContextOutputUsage,
    ContextReasoningUsage,
    ContextTrigger,
} from '@/src/components/ai-elements/context'
import {
    FileTree,
    FileTreeFile,
    FileTreeFolder,
} from '@/src/components/ai-elements/file-tree'
import {
    EnvironmentVariable,
    EnvironmentVariableGroup,
    EnvironmentVariables,
    EnvironmentVariablesContent,
    EnvironmentVariablesHeader,
    EnvironmentVariablesTitle,
    EnvironmentVariablesToggle,
} from '@/src/components/ai-elements/environment-variables'
import {
    PackageInfo,
    PackageInfoChangeType,
    PackageInfoContent,
    PackageInfoDependencies,
    PackageInfoDependency,
    PackageInfoDescription,
    PackageInfoHeader,
    PackageInfoName,
    PackageInfoVersion,
} from '@/src/components/ai-elements/package-info'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import { SidebarProvider } from '@/ui/sidebar'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import { Panel } from '@/src/components/ai-elements/panel'
import { ChevronLeftIcon, FolderIcon, InfoIcon, PanelRightCloseIcon, PanelRightOpenIcon } from 'lucide-react'

import { CodeAgentChat } from './code-agent-chat'
import { CodeStudio } from './code-studio'

interface FsEntry {
    name: string
    type: 'file' | 'directory'
    size?: number
}

type BrowserSource = 'workspace' | 'sandbox'

type SelectedFileSnapshot = {
    content: string
    errorText: string | null
    hasJsxPreview: boolean
    isDirectory: boolean
    language:
        | 'tsx'
        | 'jsx'
        | 'ts'
        | 'js'
        | 'json'
        | 'mdx'
        | 'css'
        | 'html'
        | 'yaml'
        | 'python'
        | 'rust'
    state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
    stateLabel: string
}

interface BrowserSelection {
    source: BrowserSource
    path: string
    type: FsEntry['type']
}

function joinPath(basePath: string, name: string): string {
    const trimmedBase = basePath.replace(/\/+$/, '')
    if (trimmedBase === '' || trimmedBase === '/') {
        return `/${name}`
    }

    return `${trimmedBase}/${name}`
}

function parentPath(path: string): string {
    const trimmed = path.replace(/\/+$/, '')

    if (trimmed === '' || trimmed === '/') {
        return '/'
    }

    const segments = trimmed.split('/').filter(Boolean)
    segments.pop()

    return segments.length > 0 ? `/${segments.join('/')}` : '/'
}

function sourceLabel(source: BrowserSource): string {
    return source === 'workspace' ? 'Workspace' : 'Sandbox'
}

function fullPath(rootPath: string, name: string): string {
    const normalizedRoot = rootPath === '/' ? '' : rootPath.replace(/\/+$/, '')
    const normalizedName = name.replace(/^\/+/, '')
    return normalizedRoot ? `${normalizedRoot}/${normalizedName}` : `/${normalizedName}`
}

function getSelectedFileLanguage(path: string): SelectedFileSnapshot['language'] {
    const lowerPath = path.toLowerCase()

    if (lowerPath.endsWith('.tsx')) return 'tsx'
    if (lowerPath.endsWith('.jsx')) return 'jsx'
    if (lowerPath.endsWith('.mdx')) return 'mdx'
    if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) return 'yaml'
    if (lowerPath.endsWith('.css')) return 'css'
    if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) return 'html'
    if (lowerPath.endsWith('.json')) return 'json'
    if (lowerPath.endsWith('.ts')) return 'ts'
    if (lowerPath.endsWith('.js')) return 'js'
    if (lowerPath.endsWith('.py')) return 'python'
    if (lowerPath.endsWith('.rs')) return 'rust'

    return 'yaml'
}

function getSelectedFileState({
    isError,
    isLoading,
    hasContent,
}: {
    isError: boolean
    isLoading: boolean
    hasContent: boolean
}): SelectedFileSnapshot['state'] {
    if (isError) return 'output-error'
    if (isLoading) return 'input-streaming'
    if (hasContent) return 'output-available'
    return 'input-available'
}

function PathBrowser({
    source,
    title,
    path,
    entries,
    selectedPath,
    onSelectPath,
    onUp,
    isLoading,
    status,
    badgeLabel,
    onCreateFile,
    onCreateFolder,
    onDeleteSelection,
    selectedSelection,
    onRefresh,
}: {
    source: BrowserSource
    title: string
    path: string
    entries: FsEntry[]
    selectedPath: string
    onSelectPath: (path: string, type: FsEntry['type']) => void
    onUp: () => void
    isLoading: boolean
    status: string
    badgeLabel: string
    onCreateFile: (path: string, content: string) => Promise<void>
    onCreateFolder: (path: string) => Promise<void>
    onDeleteSelection: (path: string, type: FsEntry['type']) => Promise<void>
    selectedSelection: BrowserSelection
    onRefresh: () => Promise<void>
}) {
    const [newFileName, setNewFileName] = useState('')
    const [newFileContent, setNewFileContent] = useState('')
    const [newFolderName, setNewFolderName] = useState('')
    const [message, setMessage] = useState<string | null>(null)

    const canDelete = selectedSelection.source === source && selectedSelection.path !== '/'

    return (
        <section className="rounded-2xl border border-border/60 bg-card/50 p-3">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <FolderIcon className="size-4 text-muted-foreground" />
                        <h3 className="font-medium text-sm">{title}</h3>
                    </div>
                    <p className="mt-1 text-muted-foreground text-xs">{path}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-normal">
                        {badgeLabel}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                        {status}
                    </Badge>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={onUp}
                        disabled={path === '/' || isLoading}
                        title="Go up one folder"
                    >
                        <ChevronLeftIcon className="size-4" />
                    </Button>
                </div>
            </div>

            <div className="mb-3 grid gap-3 rounded-xl border border-border/60 bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <p className="font-medium text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Actions
                        </p>
                        <p className="text-muted-foreground text-xs">
                            Create files and folders or delete the selected item.
                        </p>
                    </div>
                    {message ? (
                        <Badge variant="secondary" className="font-normal">
                            {message}
                        </Badge>
                    ) : null}
                </div>

                <div className="grid gap-2">
                    <Input
                        value={newFileName}
                        onChange={(event) => setNewFileName(event.target.value)}
                        placeholder="new-file.tsx"
                    />
                    <Textarea
                        value={newFileContent}
                        onChange={(event) => setNewFileContent(event.target.value)}
                        placeholder="Initial file content"
                        rows={4}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            onClick={async () => {
                                if (!newFileName.trim()) {
                                    setMessage('Enter a file name')
                                    return
                                }

                                setMessage('Creating file...')
                                await onCreateFile(fullPath(path, newFileName), newFileContent)
                                await onRefresh()
                                setNewFileName('')
                                setNewFileContent('')
                                setMessage('File created')
                            }}
                        >
                            New file
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                                if (!newFolderName.trim()) {
                                    setMessage('Enter a folder name')
                                    return
                                }

                                setMessage('Creating folder...')
                                await onCreateFolder(fullPath(path, newFolderName))
                                await onRefresh()
                                setNewFolderName('')
                                setMessage('Folder created')
                            }}
                        >
                            New folder
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            disabled={!canDelete}
                            onClick={async () => {
                                if (!canDelete) {
                                    setMessage('Select a file or folder first')
                                    return
                                }

                                setMessage('Deleting...')
                                await onDeleteSelection(selectedSelection.path, selectedSelection.type)
                                await onRefresh()
                                setMessage('Deleted')
                            }}
                        >
                            Delete selected
                        </Button>
                    </div>

                    <Input
                        value={newFolderName}
                        onChange={(event) => setNewFolderName(event.target.value)}
                        placeholder="new-folder"
                    />
                </div>
            </div>

            <FileTree
                selectedPath={selectedPath}
                onSelect={(nextPath) => {
                    const entry = entries.find((item) => joinPath(path, item.name) === nextPath)
                    if (!entry) {
                        return
                    }

                    onSelectPath(nextPath, entry.type)
                }}
            >
                <FileTreeFolder
                    name={path === '/' ? title : path.split('/').filter(Boolean).at(-1) ?? title}
                    path={path}
                >
                    {entries.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border/60 px-3 py-4 text-muted-foreground text-xs">
                            Directory is empty.
                        </div>
                    ) : (
                        entries.map((entry) => {
                            const entryPath = joinPath(path, entry.name)

                            return entry.type === 'directory' ? (
                                <FileTreeFolder key={entryPath} name={entry.name} path={entryPath}>
                                    <span className="sr-only">Folder</span>
                                </FileTreeFolder>
                            ) : (
                                <FileTreeFile key={entryPath} name={entry.name} path={entryPath} />
                            )
                        })
                    )}
                </FileTreeFolder>
            </FileTree>
        </section>
    )
}

export function CodeLayout() {
    const {
        resourceId,
        selectedAgent,
        selectedModel,
        availableModels,
        usage,
    } = useChatContext()

    const agentQuery = useAgent(selectedAgent)
    const workspaceInfo = useWorkspaceInfo(resourceId)
    const sandboxInfo = useSandboxInfo(resourceId)
    const workspaceWrite = useWorkspaceWriteFileMutation(resourceId)
    const workspaceMkdir = useWorkspaceMkdirMutation(resourceId)
    const workspaceDelete = useWorkspaceDeleteMutation(resourceId)
    const sandboxWrite = useSandboxWriteFileMutation(resourceId)
    const sandboxMkdir = useSandboxMkdirMutation(resourceId)
    const sandboxDelete = useSandboxDeleteMutation(resourceId)

    const [workspacePath, setWorkspacePath] = useState('/')
    const [sandboxPath, setSandboxPath] = useState('/')
    const [selection, setSelection] = useState<BrowserSelection | null>(null)
    const [showHelpPanel, setShowHelpPanel] = useState(true)

    const workspaceFiles = useWorkspaceFiles(resourceId, workspacePath, false)
    const sandboxFiles = useSandboxFiles(resourceId, sandboxPath, false)

    const workspaceEntries = useMemo<FsEntry[]>(
        () => workspaceFiles.data?.entries ?? [],
        [workspaceFiles.data]
    )
    const sandboxEntries = useMemo<FsEntry[]>(
        () => sandboxFiles.data?.entries ?? [],
        [sandboxFiles.data]
    )

    const activeSelection = useMemo<BrowserSelection>(() => {
        if (selection) {
            return selection
        }

        const firstFile = workspaceEntries.find((entry) => entry.type === 'file')
        return firstFile
            ? {
                  source: 'workspace',
                  path: joinPath(workspacePath, firstFile.name),
                  type: 'file',
              }
            : {
                  source: 'workspace',
                  path: '/',
                  type: 'directory',
              }
    }, [selection, workspaceEntries, workspacePath])

    const activeSelectedPath = activeSelection.path

    const workspaceSelectedRead = useWorkspaceReadFile(resourceId, activeSelectedPath)
    const sandboxSelectedRead = useSandboxReadFile(resourceId, activeSelectedPath)
    const workspaceSelectedStat = useWorkspaceStat(resourceId, activeSelectedPath)
    const sandboxSelectedStat = useSandboxStat(resourceId, activeSelectedPath)

    const selectedRead =
        activeSelection.source === 'workspace'
            ? workspaceSelectedRead
            : sandboxSelectedRead
    const selectedStat =
        activeSelection.source === 'workspace'
            ? workspaceSelectedStat
            : sandboxSelectedStat

    const selectedFileContent = selectedRead.data?.content ?? ''
    const selectedFileLanguage = getSelectedFileLanguage(activeSelectedPath)
    const selectedFileIsDirectory = selectedStat.data?.type === 'directory'
    const selectedFileHasJsxPreview =
        !selectedFileIsDirectory && /\.(tsx|jsx)$/i.test(activeSelectedPath)
    const selectedFileState = getSelectedFileState({
        isError: Boolean(selectedRead.error || selectedStat.error),
        isLoading: selectedRead.isLoading || selectedStat.isLoading,
        hasContent: selectedFileContent.trim().length > 0,
    })

    const selectedFile: SelectedFileSnapshot = {
        content: selectedFileContent,
        errorText: selectedRead.error?.message ?? selectedStat.error?.message ?? null,
        hasJsxPreview: selectedFileHasJsxPreview,
        isDirectory: selectedFileIsDirectory,
        language: selectedFileLanguage,
        state: selectedFileState,
        stateLabel: selectedFileIsDirectory
            ? 'Directory'
            : selectedRead.error || selectedStat.error
              ? 'Error'
              : selectedRead.isLoading || selectedStat.isLoading
                ? 'Loading'
                : selectedFileContent.trim().length > 0
                  ? 'Loaded'
                  : 'Empty',
    }

    const modelLabels = useMemo(
        () =>
            availableModels.slice(0, 4).map((model) => `${model.provider}/${model.name}`),
        [availableModels]
    )

    const contextUsage = usage ?? undefined

    const workspaceRootStatus = workspaceInfo.data?.isWorkspaceConfigured
        ? workspaceInfo.data?.status ?? 'workspace connected'
        : 'workspace not configured'
    const sandboxRootStatus = sandboxInfo.data?.isWorkspaceConfigured
        ? sandboxInfo.data?.status ?? 'sandbox connected'
        : 'sandbox not configured'

    const workspaceCapabilities = workspaceInfo.data?.capabilities
    const sandboxCapabilities = sandboxInfo.data?.capabilities

    async function createEntry(source: BrowserSource, path: string, content = ''): Promise<void> {
        if (source === 'workspace') {
            await workspaceWrite.mutateAsync({ path, content })
            await workspaceFiles.refetch()
            return
        }

        await sandboxWrite.mutateAsync({ path, content })
        await sandboxFiles.refetch()
    }

    async function createFolder(source: BrowserSource, path: string): Promise<void> {
        if (source === 'workspace') {
            await workspaceMkdir.mutateAsync({ path })
            await workspaceFiles.refetch()
            return
        }

        await sandboxMkdir.mutateAsync({ path })
        await sandboxFiles.refetch()
    }

    async function deleteEntry(source: BrowserSource, path: string, type: FsEntry['type']): Promise<void> {
        void type

        if (source === 'workspace') {
            await workspaceDelete.mutateAsync({ path })
            await workspaceFiles.refetch()
            return
        }

        await sandboxDelete.mutateAsync({ path })
        await sandboxFiles.refetch()
    }

    return (
        <TooltipProvider delayDuration={150}>
            <div className="chat-shell-bg relative flex min-h-[calc(100vh-4rem)]">
                {showHelpPanel ? (
                    <Panel position="top-right" className="pointer-events-auto z-20 w-88">
                        <div className="chat-panel rounded-3xl p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <InfoIcon className="size-4 text-primary" />
                                        <div className="text-sm font-semibold text-foreground">Code studio help</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Workspace, sandbox, and browser surfaces at a glance.
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowHelpPanel(false)}
                                    aria-label="Close code studio help panel"
                                >
                                    <PanelRightCloseIcon className="size-4" />
                                </Button>
                            </div>

                            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                                <p>Use the left sidebar to switch agents or models, then browse the workspace tree in the middle panel.</p>
                                <p>The sandbox browser and terminal live on the right so you can test files without leaving the studio.</p>
                                <p>Hover the badges and headers for quick explanations when exploring a new workspace.</p>
                            </div>
                        </div>
                    </Panel>
                ) : null}
            <SidebarProvider>
                <aside className="chat-sidebar-surface w-70 shrink-0">
                    <MainSidebar />
                </aside>
            </SidebarProvider>

            <div className="grid min-w-0 flex-1 grid-cols-[300px_minmax(0,1fr)_420px]">
                <aside className="min-h-0 overflow-auto border-r border-border/70 bg-background/72 p-4 backdrop-blur-xl">
                <div className="space-y-4">
                    <div className="flex items-center justify-end">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    onClick={() => setShowHelpPanel((current) => !current)}
                                    aria-label={showHelpPanel ? 'Hide code studio help' : 'Show code studio help'}
                                >
                                    {showHelpPanel ? (
                                        <PanelRightCloseIcon className="size-4" />
                                    ) : (
                                        <PanelRightOpenIcon className="size-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {showHelpPanel ? 'Hide the code studio help panel.' : 'Show the code studio help panel.'}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <PackageInfo
                        currentVersion={selectedModel.id}
                        changeType="minor"
                        name={agentQuery.data?.name ?? selectedAgent}
                        newVersion={selectedModel.name}
                    >
                        <PackageInfoHeader>
                            <PackageInfoName />
                            <PackageInfoVersion />
                            <PackageInfoChangeType />
                        </PackageInfoHeader>
                        <PackageInfoDescription>
                            {agentQuery.data?.description ??
                                'Live agent metadata mirrored from the chat backend.'}
                        </PackageInfoDescription>
                        <PackageInfoContent>
                            <PackageInfoDependencies>
                                {modelLabels.map((label) => (
                                    <PackageInfoDependency
                                        key={label}
                                        name={label}
                                        version={selectedModel.id}
                                    />
                                ))}
                            </PackageInfoDependencies>
                        </PackageInfoContent>
                    </PackageInfo>

                    <div className="grid gap-2 text-xs">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="font-normal">
                                {workspaceRootStatus}
                            </Badge>
                            {workspaceCapabilities?.hasFilesystem && (
                                <Badge variant="outline" className="font-normal">
                                    filesystem
                                </Badge>
                            )}
                            {workspaceCapabilities?.hasSandbox && (
                                <Badge variant="outline" className="font-normal">
                                    sandbox
                                </Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="font-normal">
                                {sandboxRootStatus}
                            </Badge>
                            {sandboxCapabilities?.hasFilesystem && (
                                <Badge variant="outline" className="font-normal">
                                    filesystem
                                </Badge>
                            )}
                            {sandboxCapabilities?.hasSandbox && (
                                <Badge variant="outline" className="font-normal">
                                    sandbox
                                </Badge>
                            )}
                        </div>
                    </div>

                    {selectedModel.contextWindow !== undefined && (
                        <Context
                            maxTokens={selectedModel.contextWindow}
                            modelId={selectedModel.id}
                            usage={contextUsage}
                            usedTokens={usage?.totalTokens ?? 0}
                        >
                            <ContextTrigger className="w-full" />
                            <ContextContent>
                                <ContextContentHeader />
                                <ContextContentBody>
                                    <ContextInputUsage />
                                    <ContextOutputUsage />
                                    <ContextReasoningUsage />
                                </ContextContentBody>
                                <ContextContentFooter>
                                    <ContextCacheUsage />
                                </ContextContentFooter>
                            </ContextContent>
                        </Context>
                    )}

                    <div className="space-y-3">
                        <PathBrowser
                            source="workspace"
                            title="Workspace"
                            path={workspacePath}
                            entries={workspaceEntries}
                            selectedPath={activeSelectedPath}
                            onSelectPath={(path, type) => {
                                setSelection({
                                    source: 'workspace',
                                    path,
                                    type,
                                })

                                if (type === 'directory') {
                                    setWorkspacePath(path)
                                }
                            }}
                            onUp={() => {
                                const next = parentPath(workspacePath)
                                setWorkspacePath(next)
                            }}
                            isLoading={workspaceFiles.isLoading}
                            status={workspaceRootStatus}
                            badgeLabel={resourceId}
                            selectedSelection={activeSelection}
                            onCreateFile={async (path, content) => createEntry('workspace', path, content)}
                            onCreateFolder={async (path) => createFolder('workspace', path)}
                            onDeleteSelection={async (path, type) => deleteEntry('workspace', path, type)}
                            onRefresh={async () => {
                                await workspaceFiles.refetch()
                            }}
                        />

                        <PathBrowser
                            source="sandbox"
                            title="Sandbox"
                            path={sandboxPath}
                            entries={sandboxEntries}
                            selectedPath={activeSelectedPath}
                            onSelectPath={(path, type) => {
                                setSelection({
                                    source: 'sandbox',
                                    path,
                                    type,
                                })

                                if (type === 'directory') {
                                    setSandboxPath(path)
                                }
                            }}
                            onUp={() => {
                                const next = parentPath(sandboxPath)
                                setSandboxPath(next)
                            }}
                            isLoading={sandboxFiles.isLoading}
                            status={sandboxRootStatus}
                            badgeLabel={selectedModel.provider}
                            selectedSelection={activeSelection}
                            onCreateFile={async (path, content) => createEntry('sandbox', path, content)}
                            onCreateFolder={async (path) => createFolder('sandbox', path)}
                            onDeleteSelection={async (path, type) => deleteEntry('sandbox', path, type)}
                            onRefresh={async () => {
                                await sandboxFiles.refetch()
                            }}
                        />
                    </div>

                    <EnvironmentVariables>
                        <EnvironmentVariablesHeader>
                            <EnvironmentVariablesTitle>
                                Environment
                            </EnvironmentVariablesTitle>
                            <EnvironmentVariablesToggle />
                        </EnvironmentVariablesHeader>
                        <EnvironmentVariablesContent>
                            <EnvironmentVariableGroup>
                                <EnvironmentVariable
                                    name="RESOURCE_ID"
                                    value={resourceId}
                                />
                                <EnvironmentVariable
                                    name="SELECTED_AGENT"
                                    value={selectedAgent}
                                />
                                <EnvironmentVariable
                                    name="SELECTED_MODEL"
                                    value={`${selectedModel.provider}/${selectedModel.name}`}
                                />
                                <EnvironmentVariable
                                    name="SELECTED_SOURCE"
                                    value={sourceLabel(activeSelection.source)}
                                />
                                <EnvironmentVariable
                                    name="SELECTED_PATH"
                                    value={activeSelection.path}
                                />
                                <EnvironmentVariable
                                    name="WORKSPACE_STATUS"
                                    value={workspaceRootStatus}
                                />
                                <EnvironmentVariable
                                    name="SANDBOX_STATUS"
                                    value={sandboxRootStatus}
                                />
                            </EnvironmentVariableGroup>
                        </EnvironmentVariablesContent>
                    </EnvironmentVariables>
                </div>
                </aside>

                <main className="min-w-0 border-r border-border bg-background">
                    <CodeStudio
                        selectedPath={activeSelectedPath}
                        selectedSource={activeSelection.source}
                        workspacePath={workspacePath}
                        sandboxPath={sandboxPath}
                    />
                </main>

                <aside className="min-h-0 bg-card/15">
                    <CodeAgentChat
                        selectedPath={activeSelectedPath}
                        selectedSource={activeSelection.source}
                        selectedFile={selectedFile}
                    />
                </aside>
            </div>
        </div>
        </TooltipProvider>
    )
}
