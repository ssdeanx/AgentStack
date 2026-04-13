'use client'

import { useMemo, useState } from 'react'
import type { ComponentProps } from 'react'

import {
    useSandboxInfo,
    useSandboxReadFile,
    useSandboxSearch,
    useWorkspaceInfo,
    useWorkspaceReadFile,
    useWorkspaceSearch,
    useWorkspaceStat,
} from '@/lib/hooks/use-mastra-query'
import { useChatContext } from '@/app/chat/providers/chat-context-hooks'
import type { QueuedTask } from '@/app/chat/providers/chat-context-types'
import {
    Artifact,
    ArtifactActions,
    ArtifactContent,
    ArtifactDescription,
    ArtifactHeader,
    ArtifactTitle,
} from '@/src/components/ai-elements/artifact'
import {
    CodeBlock,
    CodeBlockActions,
    CodeBlockContent,
    CodeBlockCopyButton,
    CodeBlockFilename,
    CodeBlockHeader,
    CodeBlockTitle,
} from '@/src/components/ai-elements/code-block'
import {
    OpenIn,
    OpenInChatGPT,
    OpenInClaude,
    OpenInContent,
    OpenInCursor,
    OpenInLabel,
    OpenInSeparator,
    OpenInTrigger,
} from '@/src/components/ai-elements/open-in-chat'
import {
    Commit,
    CommitContent,
    CommitHeader,
} from '@/src/components/ai-elements/commit'
import {
    JSXPreview,
} from '@/src/components/ai-elements/jsx-preview'
import {
    Plan,
    PlanContent,
    PlanDescription,
    PlanHeader,
    PlanTitle,
    PlanTrigger,
} from '@/src/components/ai-elements/plan'
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from '@/src/components/ai-elements/reasoning'
import {
    SchemaDisplay,
    SchemaDisplayBody,
    SchemaDisplayExample,
    SchemaDisplayRequest,
    SchemaDisplayResponse,
} from '@/src/components/ai-elements/schema-display'
import {
    Snippet,
    SnippetCopyButton,
    SnippetInput,
    SnippetText,
} from '@/src/components/ai-elements/snippet'
import {
    StackTrace,
    StackTraceContent,
    StackTraceError,
    StackTraceErrorMessage,
    StackTraceErrorType,
    StackTraceHeader,
} from '@/src/components/ai-elements/stack-trace'
import {
    Terminal,
    TerminalActions,
    TerminalClearButton,
    TerminalContent,
    TerminalCopyButton,
    TerminalHeader,
    TerminalStatus,
    TerminalTitle,
} from '@/src/components/ai-elements/terminal'
import {
    TestResults,
    TestResultsContent,
    TestResultsDuration,
    TestResultsHeader,
    TestResultsProgress,
    TestResultsSummary,
} from '@/src/components/ai-elements/test-results'
import {
    WebPreview,
    WebPreviewBody,
    WebPreviewConsole,
    WebPreviewNavigation,
    WebPreviewUrl,
} from '@/src/components/ai-elements/web-preview'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { GlobeIcon, RefreshCcwIcon, SparklesIcon } from 'lucide-react'

interface CodeStudioProps {
    selectedPath: string
    selectedSource: 'workspace' | 'sandbox'
    workspacePath: string
    sandboxPath: string
}

type StudioPlanStep = Pick<QueuedTask, 'description' | 'id' | 'status' | 'title'>

type CodeBlockLanguage = ComponentProps<typeof CodeBlock>['language']

function getFileName(path: string): string {
    const parts = path.split('/').filter(Boolean)
    return parts.at(-1) ?? path
}

function getLanguage(path: string): CodeBlockLanguage {
    if (path.endsWith('.tsx')) return 'tsx'
    if (path.endsWith('.jsx')) return 'jsx'
    if (path.endsWith('.ts')) return 'ts'
    if (path.endsWith('.js')) return 'js'
    if (path.endsWith('.json')) return 'json'
    if (path.endsWith('.md')) return 'md'
    if (path.endsWith('.py')) return 'python'
    if (path.endsWith('.rs')) return 'rust'
    return 'md'
}

function getTraceText(error: string | null | undefined, selectedPath: string): string {
    if (error) {
        return error
    }

    return `Selected path: ${selectedPath}\n    at CodeStudio (app/chat/components/code-studio.tsx:1:1)`
}

function SelectedFilePanels({
    selectedPath,
    selectedSource,
}: {
    selectedPath: string
    selectedSource: 'workspace' | 'sandbox'
}) {
    const {
        resourceId,
        selectedAgent,
        selectedModel,
        webPreview,
        streamingReasoning,
        queuedTasks,
        isLoading,
        lastCompletion,
    } = useChatContext()
    const workspaceInfo = useWorkspaceInfo(resourceId)
    const sandboxInfo = useSandboxInfo(resourceId)
    const workspaceStat = useWorkspaceStat(resourceId, selectedPath)
    const workspaceRead = useWorkspaceReadFile(resourceId, selectedPath)
    const sandboxRead = useSandboxReadFile(resourceId, selectedPath)
    const workspaceSearch = useWorkspaceSearch(resourceId, {
        query: getFileName(selectedPath),
        topK: 5,
        mode: 'hybrid',
    })
    const sandboxSearch = useSandboxSearch(resourceId, {
        query: getFileName(selectedPath),
        topK: 5,
        mode: 'hybrid',
    })

    const selectedContent = workspaceRead.data?.content ?? sandboxRead.data?.content ?? ''
    const selectedLanguage = getLanguage(selectedPath)
    const selectedQueryName = getFileName(selectedPath)
    const workspaceResult = workspaceSearch.data?.results?.[0]
    const sandboxResult = sandboxSearch.data?.results?.[0]
    const isDirectory = workspaceStat.data?.type === 'directory'

    const planSteps =
        queuedTasks.length > 0
            ? queuedTasks.slice(0, 4)
            : [
                  {
                      id: 'inspect-file',
                      title: `Inspect ${selectedQueryName}`,
                      description: `Review the selected ${selectedSource} file in context.`,
                      status: 'pending' as const,
                  },
                  {
                      id: 'check-output',
                      title: 'Check code previews and diagnostics',
                      description:
                          'Use the studio panels to compare code, schema, preview, and trace output.',
                      status: 'pending' as const,
                  },
                  {
                      id: 'send-follow-up',
                      title: 'Send the next follow-up prompt',
                      description:
                          'Use the chat panel to iterate on the selected file.',
                      status: 'pending' as const,
                  },
              ] satisfies StudioPlanStep[]

    const previewJsx = useMemo(
        () =>
            `<div className="rounded-2xl border border-border bg-card p-4 shadow-sm">\n  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preview</p>\n  <h3 className="mt-2 text-lg font-semibold">${selectedQueryName}</h3>\n  <p className="mt-1 text-sm text-muted-foreground">${selectedAgent} · ${selectedModel.provider}/${selectedModel.name}</p>\n</div>`,
        [selectedAgent, selectedModel.name, selectedModel.provider, selectedQueryName]
    )

    const webPreviewUrl = webPreview?.url ?? 'about:blank'
    const openInQuery = useMemo(() => {
        const trimmedContent = selectedContent.slice(0, 5000).trim()

        return [
            `File: ${selectedPath}`,
            `Language: ${selectedLanguage}`,
            `Source: ${selectedSource}`,
            '',
            trimmedContent,
        ].join('\n')
    }, [selectedContent, selectedLanguage, selectedPath, selectedSource])
    const completionStatusLabel = lastCompletion
        ? lastCompletion.isAbort
            ? 'aborted'
            : lastCompletion.isDisconnect
              ? 'disconnected'
              : lastCompletion.isError
                ? 'error'
                : lastCompletion.finishReason ?? 'finished'
        : null
    const previewLogs = [
        {
            level: 'log' as const,
            message: workspaceInfo.data?.name ?? 'workspace',
            timestamp: new Date(0),
        },
        {
            level: 'log' as const,
            message: sandboxInfo.data?.name ?? 'sandbox',
            timestamp: new Date(0),
        },
        {
            level: 'log' as const,
            message: `Selected: ${selectedPath}`,
            timestamp: new Date(0),
        },
    ]

    return (
        <div className="flex h-full min-h-0 flex-col bg-background">
            <div className="border-b border-border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                            Studio
                        </p>
                        <h3 className="text-lg font-semibold">{selectedQueryName}</h3>
                        <p className="text-muted-foreground text-sm">{selectedPath}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-normal">
                            {selectedLanguage}
                        </Badge>
                                <OpenIn query={openInQuery}>
                                    <OpenInTrigger className="h-8 rounded-full border-border/60 bg-background/80 px-3 text-xs font-medium shadow-none hover:bg-background">
                                        Open in
                                    </OpenInTrigger>
                                    <OpenInContent>
                                        <OpenInLabel>External assistants</OpenInLabel>
                                        <OpenInSeparator />
                                        <OpenInCursor />
                                        <OpenInClaude />
                                        <OpenInChatGPT />
                                    </OpenInContent>
                                </OpenIn>
                        {completionStatusLabel ? (
                            <Badge variant="outline" className="font-normal">
                                {completionStatusLabel}
                            </Badge>
                        ) : null}
                        <Badge variant="outline" className="font-normal">
                            {workspaceInfo.data?.isWorkspaceConfigured
                                ? workspaceInfo.data.status
                                : 'workspace idle'}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                            {sandboxInfo.data?.isWorkspaceConfigured
                                ? sandboxInfo.data.status
                                : 'sandbox idle'}
                        </Badge>
                    </div>
                </div>
            </div>

            {streamingReasoning.trim().length > 0 || queuedTasks.length > 0 ? (
                <div className="border-b border-border/60 bg-card/20 px-4 py-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                        {streamingReasoning.trim().length > 0 ? (
                            <Reasoning
                                defaultOpen={true}
                                isStreaming={isLoading}
                            >
                                <ReasoningTrigger />
                                <ReasoningContent>
                                    {streamingReasoning}
                                </ReasoningContent>
                            </Reasoning>
                        ) : (
                            <div className="rounded-xl border border-dashed border-border/60 px-4 py-4 text-muted-foreground text-sm">
                                No live reasoning stream yet.
                            </div>
                        )}

                        <Plan defaultOpen={true} isStreaming={isLoading}>
                            <PlanHeader>
                                <div className="space-y-1">
                                    <PlanTitle>Studio plan</PlanTitle>
                                    <PlanDescription>
                                        A quick summary of the live agent flow while
                                        you inspect the selected file.
                                    </PlanDescription>
                                </div>
                                <PlanTrigger />
                            </PlanHeader>

                            <PlanContent>
                                <ol className="space-y-2">
                                    {planSteps.map((step, index) => (
                                        <li
                                            key={step.id}
                                            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="font-medium text-sm">
                                                    {index + 1}. {step.title}
                                                </p>
                                                {queuedTasks.length > 0 ? (
                                                    <Badge
                                                        className="font-normal"
                                                        variant="secondary"
                                                    >
                                                        {step.status}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            {'description' in step && step.description ? (
                                                <p className="mt-1 text-muted-foreground text-xs leading-5">
                                                    {step.description}
                                                </p>
                                            ) : null}
                                        </li>
                                    ))}
                                </ol>
                            </PlanContent>
                        </Plan>
                    </div>
                </div>
            ) : null}

            {isDirectory ? (
                <div className="flex flex-1 items-center justify-center px-6">
                    <Artifact className="w-full max-w-2xl">
                        <ArtifactHeader>
                            <ArtifactTitle>Directory selected</ArtifactTitle>
                            <ArtifactActions>
                                <Badge variant="secondary" className="font-normal">
                                    folder
                                </Badge>
                            </ArtifactActions>
                        </ArtifactHeader>
                        <ArtifactDescription>
                            Select a file in the workspace or sandbox browser to inspect the
                            code, preview, schema, and trace panels.
                        </ArtifactDescription>
                        <ArtifactContent>
                            <p className="text-sm text-muted-foreground">
                                The live backend hooks are connected, but the current path is a
                                directory.
                            </p>
                        </ArtifactContent>
                    </Artifact>
                </div>
            ) : (
                <div className="flex-1 overflow-auto p-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                        <section className="rounded-2xl border border-border/60 bg-card/30 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                                        Code
                                    </p>
                                    <h4 className="font-semibold text-base">Workspace file</h4>
                                </div>
                                <Badge variant="secondary" className="font-normal">
                                    {selectedLanguage}
                                </Badge>
                            </div>

                            <CodeBlock code={selectedContent} language={selectedLanguage}>
                                <CodeBlockHeader>
                                    <CodeBlockFilename>{selectedPath}</CodeBlockFilename>
                                    <CodeBlockActions>
                                        <CodeBlockTitle>Live workspace source</CodeBlockTitle>
                                        <CodeBlockCopyButton />
                                    </CodeBlockActions>
                                </CodeBlockHeader>
                                <CodeBlockContent code={selectedContent} language={selectedLanguage} />
                            </CodeBlock>
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card/30 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                                        Preview
                                    </p>
                                    <h4 className="font-semibold text-base">JSX / Web</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline">
                                        <SparklesIcon className="mr-2 size-4" />
                                        JSX
                                    </Button>
                                    <Button size="sm" variant="ghost">
                                        <GlobeIcon className="mr-2 size-4" />
                                        Web
                                    </Button>
                                </div>
                            </div>

                            <JSXPreview jsx={previewJsx} />

                            <div className="mt-4 rounded-2xl border border-border/60 bg-background p-3">
                                <WebPreview defaultUrl={webPreviewUrl}>
                                    <WebPreviewNavigation>
                                        <WebPreviewUrl />
                                    </WebPreviewNavigation>
                                    <WebPreviewBody />
                                    <WebPreviewConsole logs={previewLogs} />
                                </WebPreview>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card/30 p-4">
                            <Artifact>
                                <ArtifactHeader>
                                    <ArtifactTitle>Artifact</ArtifactTitle>
                                    <ArtifactActions>
                                        <Badge variant="secondary" className="font-normal">
                                            {selectedAgent}
                                        </Badge>
                                    </ArtifactActions>
                                </ArtifactHeader>
                                <ArtifactDescription>
                                    Live metadata from chat-context and the selected workspace file.
                                </ArtifactDescription>
                                <ArtifactContent>
                                    <div className="grid gap-2 text-sm">
                                        <p>
                                            <span className="text-muted-foreground">Workspace:</span>{' '}
                                            {workspaceInfo.data?.name ?? resourceId}
                                        </p>
                                        <p>
                                            <span className="text-muted-foreground">Sandbox:</span>{' '}
                                            {sandboxInfo.data?.name ?? resourceId}
                                        </p>
                                        <p>
                                            <span className="text-muted-foreground">Model:</span>{' '}
                                            {selectedModel.provider}/{selectedModel.name}
                                        </p>
                                    </div>
                                </ArtifactContent>
                            </Artifact>
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card/30 p-4">
                            <SchemaDisplay
                                description="Live IDE contract backed by the chat provider and workspace hooks."
                                method="POST"
                                path={`/chat/code/${selectedAgent}`}
                                parameters={[
                                    {
                                        name: 'resourceId',
                                        type: 'string',
                                        location: 'path',
                                        required: true,
                                        description: 'The active workspace/sandbox resource id.',
                                    },
                                    {
                                        name: 'selectedPath',
                                        type: 'string',
                                        location: 'query',
                                        required: true,
                                        description: 'The file currently open in the IDE.',
                                    },
                                ]}
                                requestBody={[
                                    {
                                        name: 'message',
                                        type: 'string',
                                        required: true,
                                        description: 'Prompt sent from chat-input.',
                                    },
                                    {
                                        name: 'modelId',
                                        type: 'string',
                                        required: true,
                                        description: 'The selected model for the agent.',
                                    },
                                ]}
                                responseBody={[
                                    {
                                        name: 'content',
                                        type: 'string',
                                        required: true,
                                        description: 'Generated output for the current file.',
                                    },
                                    {
                                        name: 'webPreview',
                                        type: 'WebPreviewData | null',
                                        required: false,
                                        description: 'Optional rendered preview returned by the backend.',
                                    },
                                ]}
                            >
                                <SchemaDisplayBody>
                                    <SchemaDisplayRequest />
                                    <SchemaDisplayResponse />
                                </SchemaDisplayBody>
                                <SchemaDisplayExample>
{`POST /chat/code/${selectedAgent}
{
  "resourceId": "${resourceId}",
  "selectedPath": "${selectedPath}",
  "modelId": "${selectedModel.id}"
}`}
                                </SchemaDisplayExample>
                            </SchemaDisplay>
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card/30 p-4">
                            <Snippet code={selectedContent}>
                                <SnippetText>
                                    {workspaceResult?.content?.slice(0, 220) ?? selectedContent.slice(0, 220)}
                                </SnippetText>
                                <SnippetInput />
                                <SnippetCopyButton />
                            </Snippet>
                            <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                                <p>
                                    Workspace search:{' '}
                                    {workspaceResult?.id ?? 'no match yet'}
                                </p>
                                <p>
                                    Sandbox search:{' '}
                                    {sandboxResult?.id ?? 'no match yet'}
                                </p>
                            </div>
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card/30 p-4">
                            <StackTrace trace={getTraceText(null, selectedPath)}>
                                <StackTraceHeader>
                                    <StackTraceError>
                                        <StackTraceErrorType>No active error</StackTraceErrorType>
                                        <StackTraceErrorMessage>
                                            {selectedPath}
                                        </StackTraceErrorMessage>
                                    </StackTraceError>
                                </StackTraceHeader>
                                <StackTraceContent />
                            </StackTrace>
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card/30 p-4">
                            <TestResults
                                summary={{
                                    passed: Math.max(0, workspaceSearch.data?.results?.length ?? 0),
                                    failed: 0,
                                    skipped: 0,
                                    total: Math.max(1, workspaceSearch.data?.results?.length ?? 1),
                                    duration: 420,
                                }}
                            >
                                <TestResultsHeader>
                                    <TestResultsSummary />
                                    <TestResultsDuration />
                                </TestResultsHeader>
                                <TestResultsContent>
                                    <TestResultsProgress />
                                </TestResultsContent>
                            </TestResults>
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card/30 p-4">
                            <Terminal
                                autoScroll
                                isStreaming={false}
                                output={[
                                    `workspace: ${workspaceInfo.data?.name ?? resourceId}`,
                                    `sandbox: ${sandboxInfo.data?.name ?? resourceId}`,
                                    `file: ${selectedPath}`,
                                    `model: ${selectedModel.provider}/${selectedModel.name}`,
                                ].join('\n')}
                            >
                                <TerminalHeader>
                                    <TerminalTitle>Terminal</TerminalTitle>
                                    <TerminalStatus>ready</TerminalStatus>
                                    <TerminalActions>
                                        <TerminalCopyButton />
                                        <TerminalClearButton />
                                    </TerminalActions>
                                </TerminalHeader>
                                <TerminalContent />
                            </Terminal>
                        </section>

                        <section className="rounded-2xl border border-border/60 bg-card/30 p-4">
                            <Commit>
                                <CommitHeader>
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                                                Commit
                                            </p>
                                            <h4 className="font-semibold text-base">
                                                Latest checkpoint
                                            </h4>
                                        </div>
                                        <Badge variant="secondary" className="font-normal">
                                            {selectedAgent}
                                        </Badge>
                                    </div>
                                </CommitHeader>
                                <CommitContent>
                                    <div className="grid gap-2 text-sm">
                                        <p>
                                            Saved file: {selectedPath}
                                        </p>
                                        <p>
                                            Workspace search hits: {workspaceSearch.data?.results?.length ?? 0}
                                        </p>
                                        <p>
                                            Sandbox search hits: {sandboxSearch.data?.results?.length ?? 0}
                                        </p>
                                    </div>
                                </CommitContent>
                            </Commit>
                        </section>
                    </div>
                </div>
            )}
        </div>
    )
}

export function CodeStudio({
    selectedPath,
    selectedSource,
    workspacePath,
    sandboxPath,
}: CodeStudioProps) {
    const [showHelp, setShowHelp] = useState(true)
    const selectedName = getFileName(selectedPath)
    const isFile = selectedPath !== '/'

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                        Code Studio
                    </p>
                    <h2 className="font-semibold text-lg">
                        {selectedName}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {selectedSource} · Workspace: {workspacePath} · Sandbox: {sandboxPath}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowHelp((value) => !value)}>
                        <RefreshCcwIcon className="mr-2 size-4" />
                        {showHelp ? 'Hide' : 'Show'} panels
                    </Button>
                </div>
            </div>

            {showHelp && isFile ? (
                <div className="min-h-0 flex-1 overflow-auto">
                    <SelectedFilePanels
                        selectedPath={selectedPath}
                        selectedSource={selectedSource}
                    />
                </div>
            ) : showHelp ? (
                <div className="flex flex-1 items-center justify-center px-6">
                    <Artifact className="w-full max-w-2xl">
                        <ArtifactHeader>
                            <ArtifactTitle>Pick a file</ArtifactTitle>
                            <ArtifactActions>
                                <Badge variant="secondary" className="font-normal">
                                    workspace/sandbox
                                </Badge>
                            </ArtifactActions>
                        </ArtifactHeader>
                        <ArtifactDescription>
                            Select a file from the workspace or sandbox browser to open the live
                            code, preview, search, trace, terminal, test, and commit panels.
                        </ArtifactDescription>
                        <ArtifactContent>
                            <p className="text-sm text-muted-foreground">
                                The IDE is connected to the backend hooks; it just needs an actual
                                file selection.
                            </p>
                        </ArtifactContent>
                    </Artifact>
                </div>
            ) : null}
        </div>
    )
}
