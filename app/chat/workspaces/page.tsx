'use client'

import { useMemo, useState } from 'react'

import type {
    SkillMetadata,
    WorkspaceFileEntry,
    WorkspaceInfoResponse,
    WorkspaceItem,
} from '@mastra/client-js'

import {
    useSandboxDeleteMutation,
    useSandboxFiles,
    useSandboxIndexMutation,
    useSandboxInfo,
    useSandboxMkdirMutation,
    useSandboxReadFile,
    useSandboxSearch,
    useSandboxStat,
    useSandboxWriteFileMutation,
    useWorkspaceInfo,
    useWorkspaceSkill,
    useWorkspaceSkillReferences,
    useWorkspaceSkills,
    useWorkspaces,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select'
import { ScrollArea } from '@/ui/scroll-area'
import { Skeleton } from '@/ui/skeleton'
import { Textarea } from '@/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'
import {
    Artifact,
    ArtifactAction,
    ArtifactActions,
    ArtifactContent,
    ArtifactDescription,
    ArtifactHeader,
    ArtifactTitle,
} from '@/src/components/ai-elements/artifact'
import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle,
} from '@/src/components/ai-elements/code-block'
import { Panel } from '@/src/components/ai-elements/panel'
import { Terminal } from '@/src/components/ai-elements/terminal'
import { cn } from '@/lib/utils'
import {
    DatabaseIcon,
    FileTextIcon,
    FolderPlusIcon,
    HardDriveIcon,
    InfoIcon,
    Loader2Icon,
    PanelRightCloseIcon,
    PanelRightOpenIcon,
    PlayIcon,
    RefreshCcwIcon,
    SearchIcon,
    ShieldCheckIcon,
    SparklesIcon,
    TerminalSquareIcon,
    Trash2Icon,
} from 'lucide-react'

function normalizeCollection<T>(data: unknown, key: string): T[] {
    if (Array.isArray(data)) {
        return data as T[]
    }

    if (data && typeof data === 'object' && key in data) {
        const value = (data as Record<string, unknown>)[key]
        return Array.isArray(value) ? (value as T[]) : []
    }

    return []
}

function matchesQuery(value: string | undefined, query: string): boolean {
    return (value ?? '').toLowerCase().includes(query.toLowerCase())
}

function workspaceLabel(workspace: WorkspaceItem): string {
    return workspace.name || workspace.agentName || workspace.id
}

function workspaceMeta(workspace: WorkspaceItem): string {
    const parts: string[] = [workspace.source]

    if (workspace.agentName) {
        parts.push(workspace.agentName)
    }

    return parts.filter(Boolean).join(' • ')
}

function capabilityLabels(capabilities: WorkspaceInfoResponse['capabilities']): string[] {
    if (!capabilities) {
        return []
    }

    return Object.entries(capabilities)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([key]) => key.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim())
}

function safeJson(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return 'null'
    }
}

function joinWorkspacePath(basePath: string, segment: string): string {
    const normalizedBase = basePath === '/' ? '' : basePath.replace(/\/+$/u, '')
    const normalizedSegment = segment.replace(/^\/+|\/+$/gu, '')

    if (!normalizedBase && !normalizedSegment) {
        return '/'
    }

    if (!normalizedBase) {
        return `/${normalizedSegment}`
    }

    return `${normalizedBase}/${normalizedSegment}`
}

function parentWorkspacePath(path: string): string {
    if (!path || path === '/') {
        return '/'
    }

    const parts = path.replace(/\/+$/u, '').split('/').filter(Boolean)

    if (parts.length <= 1) {
        return '/'
    }

    return `/${parts.slice(0, -1).join('/')}`
}

/**
 * Explorer for live workspace metadata, skills, and sandbox files.
 */
export default function WorkspacesPage() {
    const workspacesQuery = useWorkspaces()
    const [showHelpPanel, setShowHelpPanel] = useState(true)
    const [workspaceSearch, setWorkspaceSearch] = useState('')
    const [skillSearch, setSkillSearch] = useState('')
    const [fileSearch, setFileSearch] = useState('')
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
    const [selectedSkillName, setSelectedSkillName] = useState('')
    const [filesystemPath, setFilesystemPath] = useState('/')
    const [filesystemRecursive, setFilesystemRecursive] = useState(false)
    const [selectedEntryPath, setSelectedEntryPath] = useState('')
    const [selectedEntryType, setSelectedEntryType] = useState<'file' | 'directory' | ''>('')
    const [filesystemSearch, setFilesystemSearch] = useState('')
    const [filesystemSearchMode, setFilesystemSearchMode] = useState<'bm25' | 'vector' | 'hybrid'>('hybrid')
    const [newFilePath, setNewFilePath] = useState('')
    const [newFileContent, setNewFileContent] = useState('')
    const [newFolderPath, setNewFolderPath] = useState('')
    const [editorContent, setEditorContent] = useState('')
    const [terminalOutput, setTerminalOutput] = useState('')

    const workspaces = useMemo<WorkspaceItem[]>(
        () => normalizeCollection<WorkspaceItem>(workspacesQuery.data, 'workspaces'),
        [workspacesQuery.data]
    )

    const filteredWorkspaces = useMemo(() => {
        const query = workspaceSearch.trim()

        if (!query) {
            return workspaces
        }

        return workspaces.filter((workspace) => {
            return (
                matchesQuery(workspace.id, query) ||
                matchesQuery(workspace.name, query) ||
                matchesQuery(workspace.agentName, query) ||
                matchesQuery(workspace.source, query) ||
                matchesQuery(workspace.status, query)
            )
        })
    }, [workspaceSearch, workspaces])

    const activeWorkspaceId =
        selectedWorkspaceId || filteredWorkspaces[0]?.id || workspaces[0]?.id || ''

    const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId)

    const workspaceInfoQuery = useWorkspaceInfo(activeWorkspaceId)
    const sandboxInfoQuery = useSandboxInfo(activeWorkspaceId)
    const workspaceSkillsQuery = useWorkspaceSkills(activeWorkspaceId)
    const sandboxFilesQuery = useSandboxFiles(activeWorkspaceId)

    const workspaceSkills = useMemo<SkillMetadata[]>(
        () => normalizeCollection<SkillMetadata>(workspaceSkillsQuery.data, 'skills'),
        [workspaceSkillsQuery.data]
    )

    const workspaceFilesQuery = useSandboxFiles(activeWorkspaceId, filesystemPath, filesystemRecursive)

    const workspaceEntries = useMemo<WorkspaceFileEntry[]>(
        () => normalizeCollection<WorkspaceFileEntry>(workspaceFilesQuery.data, 'entries'),
        [workspaceFilesQuery.data]
    )

    const visibleWorkspaceEntries = useMemo(() => {
        const query = fileSearch.trim()

        if (!query) {
            return workspaceEntries
        }

        return workspaceEntries.filter((entry) => matchesQuery(entry.name, query))
    }, [fileSearch, workspaceEntries])

    const workspaceSearchResultsQuery = useSandboxSearch(
        activeWorkspaceId,
        {
            query: filesystemSearch,
            topK: 12,
            mode: filesystemSearchMode,
        }
    )

    const workspaceReadFileQuery = useSandboxReadFile(
        activeWorkspaceId,
        selectedEntryType === 'file' ? selectedEntryPath : ''
    )

    const workspaceStatQuery = useSandboxStat(activeWorkspaceId, selectedEntryPath)

    const writeFileMutation = useSandboxWriteFileMutation(activeWorkspaceId)
    const deletePathMutation = useSandboxDeleteMutation(activeWorkspaceId)
    const mkdirMutation = useSandboxMkdirMutation(activeWorkspaceId)
    const indexMutation = useSandboxIndexMutation(activeWorkspaceId)

    const workspaceSearchResults = workspaceSearchResultsQuery.data?.results ?? []
    const selectedFileContent = editorContent || workspaceReadFileQuery.data?.content || ''

    const activeSkillName = selectedSkillName || workspaceSkills[0]?.name || ''
    const activeSkillQuery = useWorkspaceSkill(activeWorkspaceId, activeSkillName)
    const activeSkillReferencesQuery = useWorkspaceSkillReferences(activeWorkspaceId, activeSkillName)

    const sandboxFiles = useMemo<WorkspaceFileEntry[]>(
        () => normalizeCollection<WorkspaceFileEntry>(sandboxFilesQuery.data, 'entries'),
        [sandboxFilesQuery.data]
    )

    const appendTerminalLine = (line: string) => {
        setTerminalOutput((current) => (current ? `${current}\n${line}` : line))
    }

    const filteredSkills = useMemo(() => {
        const query = skillSearch.trim()

        if (!query) {
            return workspaceSkills
        }

        return workspaceSkills.filter((skill) => {
            return [skill.name, skill.description, skill.path, skill.license, skill.compatibility]
                .filter((part): part is string => typeof part === 'string' && part.length > 0)
                .some((part) => matchesQuery(part, query))
        })
    }, [skillSearch, workspaceSkills])

    const filteredFiles = useMemo(() => {
        const query = fileSearch.trim()

        if (!query) {
            return sandboxFiles
        }

        return sandboxFiles.filter((file) => matchesQuery(file.name, query))
    }, [fileSearch, sandboxFiles])

    const workspaceCapabilities = capabilityLabels(workspaceInfoQuery.data?.capabilities)
    const sandboxCapabilities = capabilityLabels(sandboxInfoQuery.data?.capabilities)

    const workspaceSummary = useMemo(
        () => ({
            id: activeWorkspaceId,
            name: workspaceInfoQuery.data?.name ?? activeWorkspace?.name ?? activeWorkspaceId,
            status: workspaceInfoQuery.data?.status ?? activeWorkspace?.status ?? 'unknown',
            configured: workspaceInfoQuery.data?.isWorkspaceConfigured ?? false,
            source: activeWorkspace?.source ?? 'unknown',
            agentName: activeWorkspace?.agentName ?? activeWorkspace?.agentId ?? null,
            capabilities: workspaceCapabilities,
            sandboxCapabilities,
            readOnly: workspaceInfoQuery.data?.safety?.readOnly ?? activeWorkspace?.safety?.readOnly ?? false,
            skillCount: workspaceSkills.length,
            fileCount: sandboxFiles.length,
        }),
        [
            activeWorkspace,
            activeWorkspaceId,
            sandboxFiles.length,
            sandboxCapabilities,
            workspaceCapabilities,
            workspaceInfoQuery.data,
            workspaceSkills.length,
        ]
    )

    return (
        <TooltipProvider delayDuration={150}>
            <div className="relative flex h-full min-h-0 flex-col gap-6 p-6">
            <div className="rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            <HardDriveIcon className="size-3.5" />
                            Live workspace explorer
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
                            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                Inspect live workspaces, sandbox files, and skill metadata from the installed Mastra client hooks.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary">{workspaces.length} total</Badge>
                                </TooltipTrigger>
                                <TooltipContent>All live workspaces returned by the Mastra client.</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary">{workspaceSkills.length} skills</Badge>
                                </TooltipTrigger>
                                <TooltipContent>Skills installed for the selected workspace.</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="secondary">{sandboxFiles.length} sandbox files</Badge>
                                </TooltipTrigger>
                                <TooltipContent>Files and folders exposed by sandbox hooks.</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="w-full max-w-xl space-y-3 lg:w-lg">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                Workspace dropdown
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className="inline-flex items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                                            aria-label="Workspace dropdown help"
                                        >
                                            <InfoIcon className="size-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Jump between every available workspace without using the list.
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setShowHelpPanel((current) => !current)}
                            >
                                {showHelpPanel ? (
                                    <PanelRightCloseIcon className="size-4" />
                                ) : (
                                    <PanelRightOpenIcon className="size-4" />
                                )}
                                {showHelpPanel ? 'Hide panel' : 'Show panel'}
                            </Button>
                        </div>

                        <Select
                            value={activeWorkspaceId}
                            onValueChange={(value) => {
                                setSelectedWorkspaceId(value)
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a workspace" />
                            </SelectTrigger>
                            <SelectContent>
                                {workspaces.map((workspace) => (
                                    <SelectItem key={workspace.id} value={workspace.id}>
                                        <span className="flex flex-col items-start">
                                            <span>{workspaceLabel(workspace)}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {workspaceMeta(workspace) || workspace.id}
                                            </span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="relative">
                            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={workspaceSearch}
                                onChange={(event) => {
                                    setWorkspaceSearch(event.target.value)
                                }}
                                placeholder="Search workspaces by name, agent, source, or status"
                                className="pl-9"
                            />
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Select a workspace to inspect its skills, sandbox, and configuration details.
                        </p>
                    </div>
                </div>
            </div>

            {showHelpPanel ? (
                <Panel position="top-right" className="pointer-events-auto z-20 w-88">
                    <div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold text-foreground">Workspace help</div>
                                <div className="text-xs text-muted-foreground">
                                    Live guidance for the current workspace studio.
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHelpPanel(false)}
                                aria-label="Close workspace help panel"
                            >
                                <PanelRightCloseIcon className="size-4" />
                            </Button>
                        </div>

                        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                            <p>Use the dropdown to jump across workspaces, then inspect the sandbox tree, file editor, and terminal log.</p>
                            <p>Artifact previews render as code blocks so copied snippets stay readable and easy to reuse.</p>
                            <p>Terminal actions are powered by sandbox hooks and can be cleared any time from the terminal toolbar.</p>
                        </div>
                    </div>
                </Panel>
            ) : null}

            <div className="grid min-h-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <Card className="border-border/60 bg-card/80 shadow-sm">
                    <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-base">All workspaces</CardTitle>
                            <Badge variant="secondary">{filteredWorkspaces.length} shown</Badge>
                        </div>
                        <div className="relative">
                            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={workspaceSearch}
                                onChange={(event) => {
                                    setWorkspaceSearch(event.target.value)
                                }}
                                placeholder="Filter the workspace list"
                                className="pl-9"
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {workspacesQuery.isLoading ? (
                            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                                <Loader2Icon className="size-4 animate-spin" />
                                Loading workspaces...
                            </div>
                        ) : filteredWorkspaces.length === 0 ? (
                            <div className="px-4 py-8 text-sm text-muted-foreground">
                                No workspaces matched your search.
                            </div>
                        ) : (
                            <ScrollArea className="h-155">
                                <div className="space-y-2 p-3">
                                    {filteredWorkspaces.map((workspace) => {
                                        const isActive = workspace.id === activeWorkspaceId

                                        return (
                                            <button
                                                key={workspace.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedWorkspaceId(workspace.id)
                                                }}
                                                className={cn(
                                                    'w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                                                    isActive
                                                        ? 'border-primary/30 bg-primary/10 text-foreground shadow-sm'
                                                        : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 space-y-1">
                                                        <div className="truncate text-sm font-medium text-foreground">
                                                            {workspaceLabel(workspace)}
                                                        </div>
                                                        <div className="truncate text-xs text-muted-foreground">
                                                            {workspaceMeta(workspace) || workspace.id}
                                                        </div>
                                                    </div>
                                                    <Badge variant={isActive ? 'default' : 'secondary'} className="shrink-0 capitalize">
                                                        {workspace.status}
                                                    </Badge>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                                                        {workspace.id}
                                                    </Badge>
                                                    {workspace.agentName ? (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            {workspace.agentName}
                                                        </Badge>
                                                    ) : null}
                                                    <Badge variant="secondary" className="text-[10px] capitalize">
                                                        {workspace.source}
                                                    </Badge>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                <div className="grid min-h-0 gap-5 xl:grid-cols-2">
                    <Card className="border-border/60 bg-card/80 shadow-sm xl:col-span-2">
                        <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <CardTitle className="text-base">Workspace overview</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Live configuration, safety state, and capability flags.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="gap-1.5">
                                        <DatabaseIcon className="size-3.5" />
                                        {workspaceSummary.status}
                                    </Badge>
                                    <Badge variant={workspaceSummary.readOnly ? 'destructive' : 'secondary'} className="gap-1.5">
                                        <ShieldCheckIcon className="size-3.5" />
                                        {workspaceSummary.readOnly ? 'Read only' : 'Writable'}
                                    </Badge>
                                    <Badge variant="secondary" className="gap-1.5">
                                        <SparklesIcon className="size-3.5" />
                                        {workspaceSummary.skillCount} skills
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4 p-5">
                            {!activeWorkspaceId ? (
                                <div className="text-sm text-muted-foreground">Select a workspace to inspect its live details.</div>
                            ) : workspaceInfoQuery.isLoading ? (
                                <Skeleton className="h-36 w-full" />
                            ) : workspaceInfoQuery.data ? (
                                <>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Configured</div>
                                            <div className="mt-2 text-lg font-semibold">
                                                {workspaceInfoQuery.data.isWorkspaceConfigured ? 'Yes' : 'No'}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Source</div>
                                            <div className="mt-2 text-lg font-semibold capitalize">
                                                {activeWorkspace?.source ?? 'unknown'}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Skills</div>
                                            <div className="mt-2 text-lg font-semibold">{workspaceSkills.length}</div>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Sandbox files</div>
                                            <div className="mt-2 text-lg font-semibold">{sandboxFiles.length}</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                                            {workspaceSummary.id}
                                        </Badge>
                                        {workspaceSummary.agentName ? (
                                            <Badge variant="secondary">{workspaceSummary.agentName}</Badge>
                                        ) : null}
                                        {workspaceCapabilities.length > 0 ? (
                                            workspaceCapabilities.map((label) => (
                                                <Badge key={label} variant="secondary" className="capitalize">
                                                    {label}
                                                </Badge>
                                            ))
                                        ) : (
                                            <Badge variant="secondary">No capability flags</Badge>
                                        )}
                                    </div>

                                    <CodeBlock code={safeJson(workspaceSummary)} language="json" showLineNumbers>
                                        <CodeBlockHeader>
                                            <CodeBlockTitle>workspace.json</CodeBlockTitle>
                                            <CodeBlockActions>
                                                <CodeBlockCopyButton />
                                            </CodeBlockActions>
                                        </CodeBlockHeader>
                                    </CodeBlock>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    Workspace info is unavailable for the selected workspace.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base">Skills</CardTitle>
                                <Badge variant="secondary">{filteredSkills.length} shown</Badge>
                            </div>
                            <div className="relative">
                                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={skillSearch}
                                    onChange={(event) => {
                                        setSkillSearch(event.target.value)
                                    }}
                                    placeholder="Filter skills by name, description, or path"
                                    className="pl-9"
                                />
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4 p-0">
                            {workspaceSkillsQuery.isLoading ? (
                                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                                    <Loader2Icon className="size-4 animate-spin" />
                                    Loading skills...
                                </div>
                            ) : filteredSkills.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-muted-foreground">No skills matched your filter.</div>
                            ) : (
                                <ScrollArea className="h-85">
                                    <div className="space-y-2 p-3">
                                        {filteredSkills.map((skill) => {
                                            const isSelected = skill.name === selectedSkillName

                                            return (
                                                <button
                                                    key={skill.name}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedSkillName(skill.name)
                                                    }}
                                                    className={cn(
                                                        'w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                                                        isSelected
                                                            ? 'border-primary/30 bg-primary/10 text-foreground shadow-sm'
                                                            : 'border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="truncate text-sm font-medium text-foreground">
                                                                {skill.name}
                                                            </div>
                                                            <div className="line-clamp-2 text-xs text-muted-foreground">
                                                                {skill.description}
                                                            </div>
                                                        </div>
                                                        <SparklesIcon className={cn('size-4 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.2em]">
                                                            {skill.path}
                                                        </Badge>
                                                        {skill.compatibility ? (
                                                            <Badge variant="secondary" className="text-[10px]">
                                                                {skill.compatibility}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            )}

                            {activeSkillQuery.data ? (
                                <div className="border-t border-border/40 p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-medium text-foreground">
                                                {activeSkillQuery.data.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {activeSkillQuery.data.path}
                                            </div>
                                        </div>
                                        {activeSkillReferencesQuery.data?.references?.length ? (
                                            <Badge variant="secondary">
                                                {activeSkillReferencesQuery.data.references.length} references
                                            </Badge>
                                        ) : null}
                                    </div>

                                    <CodeBlock
                                        code={activeSkillQuery.data.instructions}
                                        language="markdown"
                                        showLineNumbers
                                    >
                                        <CodeBlockHeader>
                                            <CodeBlockTitle>{activeSkillQuery.data.name}.md</CodeBlockTitle>
                                            <CodeBlockActions>
                                                <CodeBlockCopyButton />
                                            </CodeBlockActions>
                                        </CodeBlockHeader>
                                    </CodeBlock>

                                    {activeSkillReferencesQuery.data?.references?.length ? (
                                        <div className="mt-4 space-y-2">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                                References
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {activeSkillReferencesQuery.data.references.map((reference: string) => (
                                                    <Badge key={reference} variant="outline" className="max-w-full truncate">
                                                        {reference}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/80 shadow-sm">
                        <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                            <div className="flex items-center justify-between gap-3">
                                <CardTitle className="text-base">Sandbox</CardTitle>
                                <Badge variant="secondary">{sandboxFiles.length} files</Badge>
                            </div>
                            <div className="relative">
                                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={fileSearch}
                                    onChange={(event) => {
                                        setFileSearch(event.target.value)
                                    }}
                                    placeholder="Filter sandbox files"
                                    className="pl-9"
                                />
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4 p-4">
                            {!activeWorkspaceId ? (
                                <div className="text-sm text-muted-foreground">Select a workspace to view its sandbox.</div>
                            ) : sandboxInfoQuery.isLoading ? (
                                <Skeleton className="h-24 w-full" />
                            ) : (
                                <>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Filesystem</div>
                                            <div className="mt-2 text-lg font-semibold">
                                                {sandboxCapabilities.includes('Filesystem') ? 'Available' : 'Unavailable'}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Sandbox</div>
                                            <div className="mt-2 text-lg font-semibold">
                                                {sandboxCapabilities.includes('Sandbox') ? 'Ready' : 'Unavailable'}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Hybrid search</div>
                                            <div className="mt-2 text-lg font-semibold">
                                                {sandboxCapabilities.includes('Hybrid') ? 'Enabled' : 'Disabled'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant={sandboxCapabilities.includes('Skills') ? 'secondary' : 'outline'}>
                                            {sandboxCapabilities.includes('Skills') ? 'Skills enabled' : 'Skills disabled'}
                                        </Badge>
                                        <Badge variant={sandboxCapabilities.includes('Vector') ? 'secondary' : 'outline'}>
                                            {sandboxCapabilities.includes('Vector') ? 'Vector search' : 'No vector search'}
                                        </Badge>
                                        <Badge variant={sandboxCapabilities.includes('BM25') ? 'secondary' : 'outline'}>
                                            {sandboxCapabilities.includes('BM25') ? 'BM25 search' : 'No BM25 search'}
                                        </Badge>
                                    </div>

                                    <ScrollArea className="h-70 pr-3">
                                        <div className="space-y-2">
                                            {filteredFiles.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">No sandbox files matched your filter.</div>
                                            ) : (
                                                filteredFiles.map((file) => (
                                                    <div
                                                        key={file.name}
                                                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
                                                    >
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <FileTextIcon className="size-4 shrink-0 text-primary" />
                                                            <div className="min-w-0">
                                                                <div className="truncate text-sm font-medium text-foreground">
                                                                    {file.name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {file.type}
                                                                    {typeof file.size === 'number' ? ` • ${file.size} bytes` : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Badge variant="secondary" className="shrink-0 capitalize">
                                                            {file.type}
                                                        </Badge>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-card/80 shadow-sm xl:col-span-2">
                        <CardHeader className="space-y-3 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <CardTitle className="text-base">Filesystem studio</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Create, read, edit, search, index, and delete files or folders directly in the active workspace.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{workspaceEntries.length} entries</Badge>
                                    <Badge variant="secondary">{workspaceSearchResults.length} hits</Badge>
                                    <Badge variant={filesystemRecursive ? 'default' : 'outline'}>
                                        {filesystemRecursive ? 'Recursive' : 'Flat'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
                                <div className="space-y-2">
                                    <Label htmlFor="workspace-path">Current path</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="workspace-path"
                                            value={filesystemPath}
                                            onChange={(event) => {
                                                setFilesystemPath(event.target.value || '/')
                                            }}
                                            placeholder="/"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setFilesystemPath('/')
                                            }}
                                        >
                                            Root
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setFilesystemPath(parentWorkspacePath(filesystemPath))
                                            }}
                                        >
                                            Up
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="workspace-search">Search content</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="workspace-search"
                                            value={filesystemSearch}
                                            onChange={(event) => {
                                                setFilesystemSearch(event.target.value)
                                            }}
                                            placeholder="Search workspace files"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setFilesystemRecursive((current) => !current)
                                            }}
                                        >
                                            {filesystemRecursive ? 'Recursive on' : 'Recursive off'}
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(['bm25', 'vector', 'hybrid'] as const).map((mode) => (
                                            <Button
                                                key={mode}
                                                variant={filesystemSearchMode === mode ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => {
                                                    setFilesystemSearchMode(mode)
                                                }}
                                            >
                                                {mode.toUpperCase()}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="grid gap-5 p-5 xl:grid-cols-[1fr_1.2fr]">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-medium text-foreground">Directory entries</div>
                                        <Badge variant="secondary">{visibleWorkspaceEntries.length} shown</Badge>
                                    </div>
                                    <ScrollArea className="h-96 rounded-2xl border border-border/60 bg-background/70 p-2">
                                        <div className="space-y-2">
                                            {workspaceFilesQuery.isLoading ? (
                                                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                                                    <Loader2Icon className="size-4 animate-spin" />
                                                    Loading files...
                                                </div>
                                            ) : visibleWorkspaceEntries.length === 0 ? (
                                                <div className="px-3 py-8 text-sm text-muted-foreground">
                                                    No files or folders in this path.
                                                </div>
                                            ) : (
                                                visibleWorkspaceEntries.map((entry) => {
                                                    const fullPath = joinWorkspacePath(filesystemPath, entry.name)
                                                    const isActive = selectedEntryPath === fullPath

                                                    return (
                                                        <button
                                                            key={fullPath}
                                                            type="button"
                                                            onClick={() => {
                                                                appendTerminalLine(`selected ${fullPath}`)
                                                                setSelectedEntryPath(fullPath)
                                                                setSelectedEntryType(entry.type)
                                                                setEditorContent('')
                                                                if (entry.type === 'directory') {
                                                                    setFilesystemPath(fullPath)
                                                                }
                                                            }}
                                                            className={cn(
                                                                'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                                                                isActive
                                                                    ? 'border-primary/30 bg-primary/10 text-foreground'
                                                                    : 'border-border/50 bg-background/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                                            )}
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="truncate text-sm font-medium text-foreground">
                                                                    {entry.name}
                                                                </div>
                                                                <div className="text-xs capitalize text-muted-foreground">
                                                                    {entry.type}
                                                                    {typeof entry.size === 'number' ? ` • ${entry.size} bytes` : ''}
                                                                </div>
                                                            </div>
                                                            <Badge variant={entry.type === 'directory' ? 'secondary' : 'outline'}>
                                                                {entry.type}
                                                            </Badge>
                                                        </button>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>

                                <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-medium text-foreground">Create folder</div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                void (async () => {
                                                    await mkdirMutation.mutateAsync({
                                                        path: newFolderPath,
                                                        recursive: true,
                                                    })
                                                    appendTerminalLine(`mkdir ${newFolderPath}`)
                                                })()
                                            }}
                                            disabled={mkdirMutation.isPending || newFolderPath.trim().length === 0}
                                        >
                                            <FolderPlusIcon className="mr-2 size-4" />
                                            {mkdirMutation.isPending ? 'Creating...' : 'Create'}
                                        </Button>
                                    </div>
                                    <Input
                                        value={newFolderPath}
                                        onChange={(event) => {
                                            setNewFolderPath(event.target.value)
                                        }}
                                        placeholder="/notes/new-folder"
                                    />
                                </div>

                                <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-medium text-foreground">Create file</div>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                void (async () => {
                                                    await writeFileMutation.mutateAsync({
                                                        path: newFilePath,
                                                        content: newFileContent,
                                                        options: { recursive: true },
                                                    })
                                                    appendTerminalLine(`write ${newFilePath}`)
                                                })()
                                            }}
                                            disabled={writeFileMutation.isPending || newFilePath.trim().length === 0}
                                        >
                                            {writeFileMutation.isPending ? 'Saving...' : 'Save file'}
                                        </Button>
                                    </div>
                                    <Input
                                        value={newFilePath}
                                        onChange={(event) => {
                                            setNewFilePath(event.target.value)
                                        }}
                                        placeholder="/notes/todo.md"
                                    />
                                    <Textarea
                                        value={newFileContent}
                                        onChange={(event) => {
                                            setNewFileContent(event.target.value)
                                        }}
                                        placeholder="File content"
                                        className="min-h-32"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-medium text-foreground">Selected entry</div>
                                            <div className="text-xs text-muted-foreground">
                                                {selectedEntryPath || 'Choose a file or folder'}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="secondary">
                                                {selectedEntryType || 'none'}
                                            </Badge>
                                            {workspaceStatQuery.data ? (
                                                <Badge variant="outline">
                                                    {workspaceStatQuery.data.type}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Type</div>
                                            <div className="mt-1 text-sm font-medium">
                                                {workspaceStatQuery.data?.type ?? '—'}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Size</div>
                                            <div className="mt-1 text-sm font-medium">
                                                {typeof workspaceStatQuery.data?.size === 'number'
                                                    ? `${workspaceStatQuery.data.size} bytes`
                                                    : '—'}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Modified</div>
                                            <div className="mt-1 text-sm font-medium">
                                                {workspaceStatQuery.data?.modifiedAt ?? '—'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                const content = workspaceReadFileQuery.data?.content ?? ''
                                                setEditorContent(content)
                                                appendTerminalLine(`read ${selectedEntryPath}`)
                                                appendTerminalLine(content || '<empty>')
                                            }}
                                            disabled={selectedEntryType !== 'file' || workspaceReadFileQuery.isLoading}
                                        >
                                            Load file
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                void (async () => {
                                                    await indexMutation.mutateAsync({
                                                        path: selectedEntryPath,
                                                        content:
                                                            editorContent ||
                                                            workspaceReadFileQuery.data?.content ||
                                                            '',
                                                        metadata: {
                                                            source: 'workspaces-ui',
                                                        },
                                                    })
                                                    appendTerminalLine(`index ${selectedEntryPath}`)
                                                })()
                                            }}
                                            disabled={selectedEntryType !== 'file' || indexMutation.isPending}
                                        >
                                            {indexMutation.isPending ? 'Indexing...' : 'Index'}
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                void (async () => {
                                                    await writeFileMutation.mutateAsync({
                                                        path: selectedEntryPath,
                                                        content:
                                                            editorContent ||
                                                            workspaceReadFileQuery.data?.content ||
                                                            '',
                                                        options: { recursive: true },
                                                    })
                                                    appendTerminalLine(`save ${selectedEntryPath}`)
                                                })()
                                            }}
                                            disabled={selectedEntryType !== 'file' || writeFileMutation.isPending || !selectedEntryPath}
                                        >
                                            {writeFileMutation.isPending ? 'Saving...' : 'Save'}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                void (async () => {
                                                    await deletePathMutation.mutateAsync({
                                                        path: selectedEntryPath,
                                                        options: {
                                                            recursive: selectedEntryType === 'directory',
                                                            force: true,
                                                        },
                                                    })
                                                    appendTerminalLine(`delete ${selectedEntryPath}`)
                                                })()
                                            }}
                                            disabled={deletePathMutation.isPending || !selectedEntryPath}
                                        >
                                            <Trash2Icon className="mr-2 size-4" />
                                            {deletePathMutation.isPending ? 'Deleting...' : 'Delete'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-medium text-foreground">Read / edit file</div>
                                        <Badge variant="secondary">
                                            {selectedEntryType === 'file' ? 'file' : 'inactive'}
                                        </Badge>
                                    </div>
                                    {workspaceReadFileQuery.isLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2Icon className="size-4 animate-spin" />
                                            Loading file content...
                                        </div>
                                    ) : selectedEntryType === 'file' ? (
                                        <Artifact className="border-border/60 bg-background/80">
                                            <ArtifactHeader>
                                                <div className="min-w-0">
                                                    <ArtifactTitle className="truncate">
                                                        {selectedEntryPath || 'file.txt'}
                                                    </ArtifactTitle>
                                                    <ArtifactDescription className="truncate">
                                                        Code preview rendered from the current sandbox file.
                                                    </ArtifactDescription>
                                                </div>
                                                <ArtifactActions>
                                                    <ArtifactAction
                                                        tooltip="Preview in terminal"
                                                        icon={PlayIcon}
                                                        onClick={() => {
                                                            appendTerminalLine(`preview ${selectedEntryPath}`)
                                                            appendTerminalLine(selectedFileContent || '<empty>')
                                                        }}
                                                    />
                                                    <ArtifactAction
                                                        tooltip="Reload from sandbox"
                                                        icon={RefreshCcwIcon}
                                                        onClick={() => {
                                                            setEditorContent(workspaceReadFileQuery.data?.content ?? '')
                                                            appendTerminalLine(`reload ${selectedEntryPath}`)
                                                        }}
                                                    />
                                                </ArtifactActions>
                                            </ArtifactHeader>
                                            <ArtifactContent>
                                                <div className="space-y-3">
                                                    <Textarea
                                                        value={selectedFileContent}
                                                        onChange={(event) => {
                                                            setEditorContent(event.target.value)
                                                        }}
                                                        className="min-h-56 font-mono text-xs"
                                                    />
                                                    <CodeBlock
                                                        code={selectedFileContent}
                                                        language="markdown"
                                                        showLineNumbers
                                                    >
                                                        <CodeBlockHeader>
                                                            <CodeBlockTitle>{selectedEntryPath || 'file.txt'}</CodeBlockTitle>
                                                            <CodeBlockActions>
                                                                <CodeBlockCopyButton />
                                                            </CodeBlockActions>
                                                        </CodeBlockHeader>
                                                    </CodeBlock>
                                                </div>
                                            </ArtifactContent>
                                        </Artifact>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            Select a file to preview and edit its contents.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-medium text-foreground">Workspace search</div>
                                        <Badge variant="secondary">{workspaceSearchResults.length} hits</Badge>
                                    </div>
                                    <ScrollArea className="h-52 rounded-xl border border-border/60 bg-background/60 p-2">
                                        <div className="space-y-2">
                                            {workspaceSearchResultsQuery.isLoading ? (
                                                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                                                    <Loader2Icon className="size-4 animate-spin" />
                                                    Searching workspace...
                                                </div>
                                            ) : workspaceSearchResults.length === 0 ? (
                                                <div className="px-3 py-8 text-sm text-muted-foreground">
                                                    No search results yet.
                                                </div>
                                            ) : (
                                                workspaceSearchResults.map((result) => (
                                                    <button
                                                        key={result.id}
                                                        type="button"
                                                        onClick={() => {
                                                            appendTerminalLine(`jump ${result.id}`)
                                                            setSelectedEntryPath(result.id)
                                                            setSelectedEntryType('file')
                                                            setFilesystemPath(parentWorkspacePath(result.id))
                                                            setEditorContent('')
                                                        }}
                                                        className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="truncate text-sm font-medium text-foreground">
                                                                    {result.id}
                                                                </div>
                                                                <div className="line-clamp-2 text-xs text-muted-foreground">
                                                                    {result.content}
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline">
                                                                {result.score.toFixed(2)}
                                                            </Badge>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>

                                <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                            <TerminalSquareIcon className="size-4 text-primary" />
                                            Sandbox terminal
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            appendTerminalLine(`preview ${selectedEntryPath || filesystemPath}`)
                                                            appendTerminalLine(selectedFileContent || '<empty>')
                                                        }}
                                                        disabled={!selectedEntryPath && selectedFileContent.length === 0}
                                                    >
                                                        <PlayIcon className="mr-2 size-4" />
                                                        Preview
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    Send the current sandbox file preview into the terminal log.
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            appendTerminalLine('clear')
                                                            setTerminalOutput('')
                                                        }}
                                                    >
                                                        Clear
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Clear the sandbox terminal output.</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <Terminal
                                        output={terminalOutput}
                                        onClear={() => {
                                            setTerminalOutput('')
                                        }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            </div>
        </TooltipProvider>
    )
}