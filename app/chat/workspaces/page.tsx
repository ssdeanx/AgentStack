'use client'

import { useMemo, useState } from 'react'
import { useMastraQuery } from '@/lib/hooks/use-mastra-query'
import {
    FileTree,
    FileTreeFile,
    FileTreeFolder,
} from '@/src/components/ai-elements/file-tree'
import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle,
} from '@/src/components/ai-elements/code-block'
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/ui/resizable'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/ui/breadcrumb'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select'
import { Card, CardContent } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { Input } from '@/ui/input'
import { Button } from '@/ui/button'
import { ScrollArea } from '@/ui/scroll-area'
import { Skeleton } from '@/ui/skeleton'
import {
    FolderTreeIcon,
    FileIcon,
    FolderIcon,
    WrenchIcon,
    SearchIcon,
    RefreshCwIcon,
    CodeIcon,
    BoxIcon,
} from 'lucide-react'
import type { BundledLanguage } from 'shiki'

interface WorkspaceFileNode {
    path: string
    name: string
    isDirectory: boolean
}

const toLanguage = (path: string): BundledLanguage => {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    const map: Record<string, BundledLanguage> = {
        ts: 'typescript', tsx: 'typescript',
        js: 'javascript', jsx: 'javascript',
        json: 'json', md: 'markdown',
        yml: 'yaml', yaml: 'yaml',
        py: 'python', css: 'css', html: 'html',
        sh: 'bash', bash: 'bash',
    }
    return map[ext] ?? 'markdown'
}

const splitNodes = (files: WorkspaceFileNode[]) => {
    const folders = files.filter((f) => f.isDirectory)
    const plainFiles = files.filter((f) => !f.isDirectory)
    return { folders, plainFiles }
}

export default function WorkspacesPage() {
    const {
        useWorkspaces,
        useSandboxFiles,
        useSandboxReadFile,
        useWorkspaceSkills,
        useWorkspaceSearch,
    } = useMastraQuery()

    const workspacesResult = useWorkspaces()
    const workspaces = workspacesResult.data?.workspaces ?? []

    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('')
    const activeWorkspaceId = selectedWorkspaceId || workspaces[0]?.id || ''
    const activeWorkspaceName =
        workspaces.find((ws) => ws.id === activeWorkspaceId)?.name ??
        activeWorkspaceId

    const [selectedFilePath, setSelectedFilePath] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')

    const filesResult = useSandboxFiles(activeWorkspaceId, '/', true)
    const fileNodes = useMemo(() => {
        const payload = filesResult.data as unknown
        if (typeof payload !== 'object' || payload === null) {
            return [] as WorkspaceFileNode[]
        }

        const recordPayload = payload as Record<string, unknown>
        const candidate =
            (recordPayload.entries as unknown[]) ??
            (recordPayload.items as unknown[]) ??
            (recordPayload.files as unknown[]) ??
            []

        if (!Array.isArray(candidate)) {
            return [] as WorkspaceFileNode[]
        }

        return candidate
            .filter((item) => typeof item === 'object' && item !== null)
            .map((item) => {
                const rec = item as Record<string, unknown>
                const path =
                    typeof rec.path === 'string' && rec.path.length > 0
                        ? rec.path
                        : typeof rec.name === 'string'
                          ? rec.name
                          : ''
                const name =
                    typeof rec.name === 'string' && rec.name.length > 0
                        ? rec.name
                        : path.split('/').filter(Boolean).pop() ?? path
                const isDirectory =
                    rec.isDirectory === true ||
                    rec.type === 'directory' ||
                    rec.type === 'dir'

                return { path, name, isDirectory }
            })
            .filter((node) => node.path.length > 0)
    }, [filesResult.data])

    const readFileResult = useSandboxReadFile(
        activeWorkspaceId,
        selectedFilePath,
        'utf-8'
    )

    const skillsResult = useWorkspaceSkills(activeWorkspaceId)
    const skills = skillsResult.data?.skills ?? []

    const searchResult = useWorkspaceSearch(activeWorkspaceId, { query: searchQuery })

    const selectedContent =
        (readFileResult.data as { content?: string } | undefined)?.content ?? ''

    const { folders, plainFiles } = useMemo(
        () => splitNodes(fileNodes),
        [fileNodes]
    )

    const fileCount = plainFiles.length
    const folderCount = folders.length

    const breadcrumbParts = useMemo(() => {
        if (!selectedFilePath) {
            return []
        }
        return selectedFilePath.split('/').filter(Boolean)
    }, [selectedFilePath])

    const searchResults = useMemo<Array<Record<string, unknown>>>(() => {
        if (!searchQuery.trim()) {
            return []
        }
        const data = searchResult.data as unknown
        if (Array.isArray(data)) {
            return data as Array<Record<string, unknown>>
        }
        if (data !== null && data !== undefined && typeof data === 'object' && 'results' in data) {
            const r = (data as { results?: unknown }).results
            if (Array.isArray(r)) {
                return r as Array<Record<string, unknown>>
            }
        }
        return []
    }, [searchResult.data, searchQuery])

    return (
        <div className="flex h-full min-h-0 flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FolderTreeIcon className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            Workspaces
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Explore files, code, and skills across your agent
                            workspaces
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        value={activeWorkspaceId}
                        onValueChange={(v) => {
                            setSelectedWorkspaceId(v)
                            setSelectedFilePath('')
                        }}
                    >
                        <SelectTrigger className="w-[200px] h-9 text-sm bg-card/50 border-white/10">
                            <SelectValue placeholder="Select workspace" />
                        </SelectTrigger>
                        <SelectContent>
                            {workspaces.map((ws) => (
                                <SelectItem key={ws.id} value={ws.id}>
                                    {ws.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            void filesResult.refetch()
                            void skillsResult.refetch()
                        }}
                        className="gap-1.5"
                    >
                        <RefreshCwIcon className="size-3.5" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <FolderIcon className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                Folders
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">
                            {filesResult.isLoading ? (
                                <Skeleton className="h-8 w-10" />
                            ) : (
                                folderCount
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <FileIcon className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                Files
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">
                            {filesResult.isLoading ? (
                                <Skeleton className="h-8 w-10" />
                            ) : (
                                fileCount
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <WrenchIcon className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                Skills
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums">
                            {skillsResult.isLoading ? (
                                <Skeleton className="h-8 w-10" />
                            ) : (
                                skills.length
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-card/50 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <BoxIcon className="size-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                Workspace
                            </span>
                        </div>
                        <div className="mt-2 text-sm font-bold truncate">
                            {activeWorkspaceName || '—'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="pl-9 h-9 text-sm bg-card/50 border-white/10"
                />
            </div>

            {/* Search Results Overlay */}
            {searchQuery.trim() && searchResults.length > 0 && (
                <div className="rounded-xl border border-white/5 bg-card/50 backdrop-blur-xl p-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
                        Search Results ({searchResults.length})
                    </h3>
                    <div className="space-y-2">
                        {searchResults.slice(0, 10).map((r, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    const path =
                                        typeof r.path === 'string'
                                            ? r.path
                                            : typeof r.file === 'string'
                                              ? r.file
                                              : ''
                                    if (path) {
                                        setSelectedFilePath(path)
                                        setSearchQuery('')
                                    }
                                }}
                                className="w-full text-left rounded-lg p-2 hover:bg-white/5 transition-colors duration-200"
                            >
                                <div className="flex items-center gap-2">
                                    <FileIcon className="size-3.5 text-muted-foreground" />
                                    <span className="text-sm font-mono truncate">
                                        {typeof r.path === 'string' ? r.path : typeof r.file === 'string' ? r.file : typeof r.name === 'string' ? r.name : `Result ${String(i + 1)}`}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main 3-Panel Layout */}
            <div className="flex-1 min-h-0 rounded-xl border border-white/5 bg-card/30 backdrop-blur-xl overflow-hidden">
                <ResizablePanelGroup orientation="horizontal">
                    {/* File Tree Panel */}
                    <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                        <div className="h-full flex flex-col">
                            <div className="p-3 border-b border-white/5">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                                    <FolderTreeIcon className="size-3.5" />
                                    Files
                                </h2>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2">
                                    {filesResult.isLoading ? (
                                        <div className="p-3 space-y-2">
                                            {Array.from({ length: 8 }).map(
                                                (_, i) => (
                                                    <Skeleton
                                                        key={`skel-${i}`}
                                                        className="h-6 w-full"
                                                    />
                                                )
                                            )}
                                        </div>
                                    ) : fileNodes.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                            <FolderIcon className="size-8 text-muted-foreground/20 mb-2" />
                                            <p className="text-xs text-muted-foreground">
                                                No files
                                            </p>
                                        </div>
                                    ) : (
                                        <FileTree
                                            selectedPath={selectedFilePath}
                                            onSelect={(value) => {
                                                if (typeof value === 'string') {
                                                    setSelectedFilePath(value)
                                                }
                                            }}
                                        >
                                            {folders.map((folder) => (
                                                <FileTreeFolder
                                                    key={folder.path}
                                                    path={folder.path}
                                                    name={folder.name}
                                                />
                                            ))}
                                            {plainFiles.map((file) => (
                                                <FileTreeFile
                                                    key={file.path}
                                                    path={file.path}
                                                    name={file.name}
                                                />
                                            ))}
                                        </FileTree>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Code Viewer Panel */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="h-full flex flex-col">
                            {/* Breadcrumb */}
                            <div className="px-4 py-2 border-b border-white/5">
                                {breadcrumbParts.length > 0 ? (
                                    <Breadcrumb>
                                        <BreadcrumbList>
                                            <BreadcrumbItem>
                                                <BreadcrumbLink
                                                    className="text-xs cursor-pointer"
                                                    onClick={() =>
                                                        setSelectedFilePath('')
                                                    }
                                                >
                                                    {activeWorkspaceName}
                                                </BreadcrumbLink>
                                            </BreadcrumbItem>
                                            {breadcrumbParts.map(
                                                (part, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <BreadcrumbSeparator />
                                                        <BreadcrumbItem>
                                                            {idx ===
                                                            breadcrumbParts.length -
                                                                1 ? (
                                                                <BreadcrumbPage className="text-xs">
                                                                    {part}
                                                                </BreadcrumbPage>
                                                            ) : (
                                                                <BreadcrumbLink className="text-xs">
                                                                    {part}
                                                                </BreadcrumbLink>
                                                            )}
                                                        </BreadcrumbItem>
                                                    </div>
                                                )
                                            )}
                                        </BreadcrumbList>
                                    </Breadcrumb>
                                ) : (
                                    <span className="text-xs text-muted-foreground/50 flex items-center gap-1.5">
                                        <CodeIcon className="size-3.5" />
                                        Select a file to view its contents
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 overflow-auto">
                                {readFileResult.isLoading ? (
                                    <div className="p-6 space-y-2">
                                        {Array.from({ length: 12 }).map(
                                            (_, i) => (
                                                <Skeleton
                                                    key={`code-skel-${i}`}
                                                    className="h-4 w-full"
                                                />
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <CodeBlock
                                        code={
                                            selectedContent ||
                                            '// Select a file from the workspace tree'
                                        }
                                        language={toLanguage(
                                            selectedFilePath || 'text'
                                        )}
                                        showLineNumbers
                                    >
                                        <CodeBlockHeader>
                                            <CodeBlockTitle>
                                                {selectedFilePath ||
                                                    'No file selected'}
                                            </CodeBlockTitle>
                                            <CodeBlockActions>
                                                <CodeBlockCopyButton />
                                            </CodeBlockActions>
                                        </CodeBlockHeader>
                                    </CodeBlock>
                                )}
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Skills Panel */}
                    <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                        <div className="h-full flex flex-col">
                            <div className="p-3 border-b border-white/5">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                                    <WrenchIcon className="size-3.5" />
                                    Skills
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] ml-auto"
                                    >
                                        {skills.length}
                                    </Badge>
                                </h2>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-2 space-y-1">
                                    {skillsResult.isLoading ? (
                                        <div className="p-3 space-y-3">
                                            {Array.from({ length: 4 }).map(
                                                (_, i) => (
                                                    <Skeleton
                                                        key={`skill-skel-${i}`}
                                                        className="h-16 w-full"
                                                    />
                                                )
                                            )}
                                        </div>
                                    ) : skills.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                            <WrenchIcon className="size-8 text-muted-foreground/20 mb-2" />
                                            <p className="text-xs text-muted-foreground">
                                                No skills
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                                                Skills will appear when defined
                                                in the workspace
                                            </p>
                                        </div>
                                    ) : (
                                        skills.map((skill, idx) => (
                                            <Card
                                                key={`${skill.name ?? 'skill'}-${idx}`}
                                                className="border-white/5 bg-card/30 hover:bg-white/5 transition-colors duration-200"
                                            >
                                                <CardContent className="p-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium truncate">
                                                                {skill.name ??
                                                                    `Skill ${idx + 1}`}
                                                            </p>
                                                            {typeof skill.description ===
                                                                'string' &&
                                                                skill.description
                                                                    .trim()
                                                                    .length >
                                                                    0 && (
                                                                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-3">
                                                                        {
                                                                            skill.description
                                                                        }
                                                                    </p>
                                                                )}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] ml-2 shrink-0"
                                                        >
                                                            skill
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
}
