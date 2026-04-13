"use client"

import { useMemo, useState, type ReactNode } from 'react'
import {
	useHarnessActionMutation,
	useHarnessDashboardQuery,
	type HarnessDashboardResponse,
	type HarnessSerializedMessage,
	type HarnessSerializedMessageContent,
} from '@/lib/hooks/use-harness-query'
import { cn } from '@/lib/utils'
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from '@/src/components/ai-elements/conversation'
import {
	Artifact,
	ArtifactAction,
	ArtifactActions,
	ArtifactClose,
	ArtifactContent,
	ArtifactDescription,
	ArtifactHeader,
	ArtifactTitle,
} from '@/src/components/ai-elements/artifact'
import { CodeBlock } from '@/src/components/ai-elements/code-block'
import {
	Commit,
	CommitActions,
	CommitAuthor,
	CommitAuthorAvatar,
	CommitContent,
	CommitCopyButton,
	CommitFile,
	CommitFileAdditions,
	CommitFileChanges,
	CommitFileDeletions,
	CommitFileIcon,
	CommitFileInfo,
	CommitFilePath,
	CommitFileStatus,
	CommitFiles,
	CommitHeader,
	CommitHash,
	CommitInfo,
	CommitMessage,
	CommitMetadata,
	CommitSeparator,
	CommitTimestamp,
} from '@/src/components/ai-elements/commit'
import {
	EnvironmentVariable,
	EnvironmentVariables,
	EnvironmentVariablesContent,
	EnvironmentVariablesHeader,
	EnvironmentVariablesTitle,
	EnvironmentVariablesToggle,
} from '@/src/components/ai-elements/environment-variables'
import {
	FileTree,
	FileTreeFile,
	FileTreeFolder,
} from '@/src/components/ai-elements/file-tree'
import {
	JSXPreview,
	JSXPreviewContent,
} from '@/src/components/ai-elements/jsx-preview'
import {
	PackageInfo,
	PackageInfoContent,
	PackageInfoDependencies,
	PackageInfoDependency,
	PackageInfoDescription,
} from '@/src/components/ai-elements/package-info'
import {
	Message,
	MessageActions,
	MessageContent,
	MessageResponse,
	MessageToolbar,
} from '@/src/components/ai-elements/message'
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
} from '@/src/components/ai-elements/prompt-input'
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from '@/src/components/ai-elements/tool'
import {
	ToolExecutionList,
} from '@/src/components/ai-elements/custom/tool-execution-card'
import type { ToolExecutionStatus } from '@/src/components/ai-elements/custom/tool-execution-card'
import {
	Sandbox,
	SandboxContent,
	SandboxHeader,
} from '@/src/components/ai-elements/sandbox'
import {
	SchemaDisplay,
	SchemaDisplayExample,
} from '@/src/components/ai-elements/schema-display'
import {
	Snippet,
	SnippetCopyButton,
	SnippetInput,
	SnippetText,
} from '@/src/components/ai-elements/snippet'
import {
	StackTrace,
	StackTraceActions,
	StackTraceContent,
	StackTraceCopyButton,
	StackTraceError,
	StackTraceErrorMessage,
	StackTraceErrorType,
	StackTraceExpandButton,
	StackTraceHeader,
	StackTraceFrames,
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
	TestResultsProgress,
	TestResultsSummary,
} from '@/src/components/ai-elements/test-results'
import {
	WebPreview,
	WebPreviewBody,
	WebPreviewConsole,
	WebPreviewNavigation,
	WebPreviewNavigationButton,
	WebPreviewUrl,
} from '@/src/components/ai-elements/web-preview'
import {
	Agent,
	AgentContent,
	AgentHeader,
	AgentInstructions,
	AgentOutput,
} from '@/src/components/ai-elements/agent'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { Separator } from '@/ui/separator'
import { Skeleton } from '@/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import {
	ActivityIcon,
	BotIcon,
	CheckCircle2Icon,
	GitBranchIcon,
	Loader2Icon,
	MessageSquareIcon,
	PlusIcon,
	RefreshCwIcon,
	SendIcon,
	Settings2Icon,
	ShieldCheckIcon,
	SparklesIcon,
	SquarePenIcon,
	Clock3Icon,
} from 'lucide-react'

const HARNESS_MESSAGE_LIMIT = 50

/**
 * Format a date string for compact UI display.
 */
function formatTimestamp(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return date.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

/**
 * Safely stringify nested state for inspection panels.
 */
function safeJson(value: unknown): string {
	const seen = new WeakSet<object>()
	try {
		return JSON.stringify(
			value,
			(_key, nestedValue) => {
				if (typeof nestedValue === 'bigint') {
					return nestedValue.toString()
				}

				if (typeof nestedValue === 'object' && nestedValue !== null) {
					if (seen.has(nestedValue)) {
						return '[Circular]'
					}
					seen.add(nestedValue)
				}

				return nestedValue
			},
			2
		)
	} catch {
		return String(value)
	}
}

type FileTreeNode = {
	name: string
	path: string
	isFile: boolean
	children: Map<string, FileTreeNode>
}

/**
 * Build a nested file tree from a list of workspace paths.
 */
function buildFileTree(paths: string[]): FileTreeNode {
	const root: FileTreeNode = {
		name: 'root',
		path: '',
		isFile: false,
		children: new Map<string, FileTreeNode>(),
	}

	for (const rawPath of paths) {
		const normalizedPath = rawPath.replaceAll('\\', '/')
		const segments = normalizedPath.split('/').filter(Boolean)
		let current = root
		let currentPath = ''

		for (const [index, segment] of segments.entries()) {
			currentPath = currentPath ? `${currentPath}/${segment}` : segment
			const isFile = index === segments.length - 1
			const existing = current.children.get(segment)
			if (existing) {
				existing.isFile = isFile
				current = existing
				continue
			}

			const node: FileTreeNode = {
				name: segment,
				path: currentPath,
				isFile,
				children: new Map<string, FileTreeNode>(),
			}
			current.children.set(segment, node)
			current = node
		}
	}

	return root
}

/**
 * Render the nested file tree structure using the ai-elements file tree primitives.
 */
function renderFileTreeNode(node: FileTreeNode): ReactNode {
	const children = Array.from(node.children.values()).sort((left, right) =>
		left.name.localeCompare(right.name)
	)

	if (node.isFile) {
		return <FileTreeFile key={node.path} path={node.path} name={node.name} />
	}

	if (!children.length) {
		return null
	}

	return (
		<FileTreeFolder key={node.path || node.name} path={node.path || node.name} name={node.name}>
			{children.map((child) => renderFileTreeNode(child))}
		</FileTreeFolder>
	)
}

/**
 * Read any file-path array stored on the harness state snapshot.
 */
function extractStateFiles(state: Record<string, unknown> | undefined): string[] {
	const files = state?.files
	if (!Array.isArray(files)) {
		return []
	}

	return files.filter((file): file is string => typeof file === 'string')
}

/**
 * Normalize git file statuses into the ai-elements commit widget's supported values.
 */
function normalizeCommitFileStatus(
	status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
): 'modified' | 'added' | 'deleted' | 'renamed' {
	switch (status) {
		case 'added':
		case 'deleted':
		case 'renamed':
		case 'modified':
			return status
		case 'untracked':
		default:
			return 'added'
	}
}

/**
 * Map the harness tool state into the ai-elements execution status.
 */
function mapToolExecutionStatus(status: string): ToolExecutionStatus {
	switch (status) {
		case 'completed':
			return 'success'
		case 'error':
			return 'error'
		case 'streaming_input':
		case 'running':
			return 'running'
		default:
			return 'pending'
	}
}

/**
 * Render a single harness message content entry.
 */
function renderMessageContent(content: HarnessSerializedMessageContent): ReactNode {
	switch (content.type) {
		case 'text':
			return <MessageResponse>{content.text}</MessageResponse>
		case 'thinking':
			return (
				<div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm italic text-muted-foreground">
					{content.thinking}
				</div>
			)
		case 'tool_call':
			return (
				<Tool defaultOpen className="border-white/10 bg-black/20">
					<ToolHeader
						type="dynamic-tool"
						state="input-streaming"
						toolName={content.name}
						title="Tool call"
					/>
					<ToolContent>
						<ToolInput input={content.args} />
					</ToolContent>
				</Tool>
			)
		case 'tool_result':
			return (
				<Tool defaultOpen className="border-white/10 bg-black/20">
					<ToolHeader
						type="dynamic-tool"
						state={content.isError ? 'output-error' : 'output-available'}
						toolName={content.name}
						title="Tool result"
					/>
					<ToolContent>
						<ToolOutput
							output={content.result}
							errorText={content.isError ? 'Tool execution failed' : ''}
						/>
					</ToolContent>
				</Tool>
			)
		case 'image':
			return (
				<div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
					Image attachment: {content.mimeType}
				</div>
			)
		case 'file':
			return (
				<div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
					File attachment: {content.filename ?? content.mediaType}
				</div>
			)
		case 'om_observation_start':
			return (
				<p className="text-xs text-muted-foreground">
					OM observation started for {content.tokensToObserve} tokens.
				</p>
			)
		case 'om_observation_end':
			return (
				<p className="text-xs text-muted-foreground">
					OM observation completed with {content.tokensObserved} tokens observed.
				</p>
			)
		case 'om_observation_failed':
			return (
				<p className="text-xs text-red-400">
					OM observation failed: {content.error}
				</p>
			)
		case 'om_thread_title_updated':
			return (
				<p className="text-xs text-muted-foreground">
					Thread title updated to {content.newTitle}
				</p>
			)
		default:
			return null
	}
}

/**
 * Render a full harness message using the ai-elements conversation primitives.
 */
function HarnessMessageView({
	message,
	isStreaming = false,
}: {
	message: HarnessSerializedMessage
	isStreaming?: boolean
}) {
	return (
		<Message from={message.role} className="max-w-full">
			<MessageContent className="w-full gap-0">
				<div className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-sm">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Badge
								variant="outline"
								className={cn(
									'text-[10px] uppercase tracking-widest',
									message.role === 'assistant'
										? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
										: message.role === 'user'
											? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
											: ''
								)}
							>
								{message.role}
							</Badge>
							{isStreaming ? (
								<Badge className="border-primary/20 bg-primary/10 text-primary">
									Live
								</Badge>
							) : null}
						</div>
						<span className="text-[11px] text-muted-foreground">
							{formatTimestamp(message.createdAt)}
						</span>
					</div>

					<div className="mt-4 space-y-3">
						{message.content.map((content, index) => (
							<div key={`${message.id}-${index}`}>{renderMessageContent(content)}</div>
						))}
					</div>

					<MessageToolbar>
						<MessageActions>
							{message.stopReason ? (
								<Badge variant="outline" className="text-[10px] uppercase tracking-widest">
									{message.stopReason}
								</Badge>
							) : null}
						</MessageActions>
						<span className="text-[11px] text-muted-foreground">{message.id}</span>
					</MessageToolbar>
				</div>
			</MessageContent>
		</Message>
	)
}

interface ThreadRenameCardProps {
	threadId: string | null
	threadTitle: string
	disabled: boolean
	onRename: (title: string) => Promise<void>
}

function ThreadRenameCard({
	threadId,
	threadTitle,
	disabled,
	onRename,
}: ThreadRenameCardProps) {
	const [draft, setDraft] = useState(threadTitle)

	return (
		<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
			<div className="space-y-2">
				<div className="flex items-center justify-between gap-3">
					<span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
						Rename current thread
					</span>
					{threadId ? (
						<Badge variant="outline" className="text-[10px] uppercase tracking-widest">
							{threadId}
						</Badge>
					) : null}
				</div>
				<Input
					value={draft}
					onChange={(event) => {
						setDraft(event.target.value)
					}}
					placeholder="Thread title"
					className="bg-zinc-900/50 border-white/10"
				/>
			</div>
			<div className="flex items-end">
				<Button
					variant="outline"
					onClick={() => {
						void onRename(draft)
					}}
					disabled={
						disabled || !draft.trim() || draft.trim() === threadTitle
					}
					className="gap-1.5"
				>
					<SquarePenIcon className="size-3.5" />
					Rename
				</Button>
			</div>
		</div>
	)
}

interface QuestionResponseCardProps {
	questionId: string
	question: string
	options?: Array<{ label: string; description?: string }>
	disabled: boolean
	onSubmit: (answer: string) => Promise<void>
}

function QuestionResponseCard({
	questionId,
	question,
	options,
	disabled,
	onSubmit,
}: QuestionResponseCardProps) {
	const [answer, setAnswer] = useState('')

	return (
		<div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
			<div className="flex items-center justify-between gap-3">
				<Badge className="border-blue-500/20 bg-blue-500/10 text-blue-400">Question</Badge>
				<span className="text-[11px] text-muted-foreground">{questionId}</span>
			</div>
			<p className="text-sm leading-6">{question}</p>
			{options?.length ? (
				<div className="space-y-2">
					{options.map((option) => (
						<div key={option.label} className="rounded-xl border border-white/10 bg-black/10 p-3">
							<p className="text-sm font-medium">{option.label}</p>
							{option.description ? (
								<p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
							) : null}
						</div>
					))}
				</div>
			) : null}
			<div className="space-y-2">
				<Input
					value={answer}
					onChange={(event) => {
						setAnswer(event.target.value)
					}}
					placeholder="Type a response"
					className="bg-zinc-900/50 border-white/10"
				/>
				<Button
					onClick={() => {
						void onSubmit(answer)
					}}
					disabled={disabled || !answer.trim()}
					className="w-full gap-1.5"
				>
					<SendIcon className="size-3.5" />
					Respond
				</Button>
			</div>
		</div>
	)
}

interface PlanApprovalCardProps {
	planId: string
	title?: string
	plan: string
	disabled: boolean
	onApprove: (feedback: string) => Promise<void>
	onReject: (feedback: string) => Promise<void>
}

function PlanApprovalCard({
	planId,
	title,
	plan,
	disabled,
	onApprove,
	onReject,
}: PlanApprovalCardProps) {
	const [feedback, setFeedback] = useState('')

	return (
		<div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
			<div className="flex items-center justify-between gap-3">
				<Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
					Plan approval
				</Badge>
				<span className="text-[11px] text-muted-foreground">{planId}</span>
			</div>
			<p className="text-sm font-semibold">{title ?? 'Untitled plan'}</p>
			<pre className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-muted-foreground">
				{plan}
			</pre>
			<Input
				value={feedback}
				onChange={(event) => {
					setFeedback(event.target.value)
				}}
				placeholder="Optional feedback"
				className="bg-zinc-900/50 border-white/10"
			/>
			<div className="grid grid-cols-2 gap-2">
				<Button
					variant="outline"
					onClick={() => {
						void onReject(feedback)
					}}
					disabled={disabled}
				>
					Reject
				</Button>
				<Button
					onClick={() => {
						void onApprove(feedback)
					}}
					disabled={disabled}
				>
					Approve
				</Button>
			</div>
		</div>
	)
}

/**
 * Render a live workspace panel that is driven by the current harness snapshot.
 */
function WorkspacePanels({
	dashboard,
}: {
	dashboard: HarnessDashboardResponse | undefined
}) {
	const [terminalOutputOverride, setTerminalOutputOverride] = useState<string | null>(null)
	const [selectedPath, setSelectedPath] = useState('')
	const workspaceFiles = dashboard?.workspace.files ?? []
	const currentMode =
		dashboard?.modes.find((mode) => mode.id === dashboard?.session.currentModeId) ?? null
	const stateFiles = extractStateFiles(dashboard?.state)
	const fallbackPath =
		workspaceFiles[0]?.path ?? stateFiles[0] ?? 'app/chat/harness/page.tsx'
	const activePath = selectedPath || fallbackPath
	const terminalOutput = terminalOutputOverride ?? dashboard?.workspace.terminalOutput ?? ''
	const allWorkspacePaths = Array.from(
		new Set([
			...stateFiles,
			...workspaceFiles.map((file) => file.path),
			...(dashboard?.displayState.modifiedFiles.map((file) => file.path) ?? []),
		])
	).filter((filePath) => filePath.length > 0)
	const fileTreeRoot = buildFileTree(allWorkspacePaths)
	const selectedFile = workspaceFiles.find((file) => file.path === activePath) ?? null
	const packageInfo = dashboard?.workspace.packageInfo ?? null
	const gitInfo = dashboard?.workspace.git ?? null
	const safeEnvVars = dashboard?.workspace.env ?? []
	const stackTraceText =
		dashboard?.displayState.activeTools.find(
			(tool) => tool.isError && typeof tool.shellOutput === 'string'
		)?.shellOutput ?? null
	const taskTotal = (dashboard?.displayState.tasks.length ?? 0) + (dashboard?.displayState.previousTasks.length ?? 0)
	const taskCompleted = dashboard?.displayState.tasks.filter((task) => task.status === 'completed').length ?? 0
	const taskInProgress = dashboard?.displayState.tasks.filter((task) => task.status === 'in_progress').length ?? 0
	const taskPending = dashboard?.displayState.tasks.filter((task) => task.status === 'pending').length ?? 0
 	const previewJsx = `<div className="rounded-2xl border border-white/10 bg-black/20 p-4">
  <p className="text-sm font-semibold">${dashboard?.activeThread?.title ?? 'Harness preview'}</p>
  <p className="text-sm text-muted-foreground">${dashboard?.currentModel.name ?? 'No model selected'}</p>
  <p className="text-xs text-muted-foreground">${activePath}</p>
</div>`

	return (
		<Card className="border-white/5 bg-card/50 backdrop-blur-xl">
			<CardHeader className="pb-4">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<SparklesIcon className="size-4" />
					</div>
					<div>
						<CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
							Mock Examples
						</CardTitle>
						<CardDescription className="text-xs">
							IDE-style examples using the ai-elements widgets from the docs.
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="code" className="gap-4">
					<TabsList className="grid grid-cols-4 bg-zinc-950/40">
						<TabsTrigger value="code">Code</TabsTrigger>
						<TabsTrigger value="ops">Ops</TabsTrigger>
						<TabsTrigger value="preview">Preview</TabsTrigger>
						<TabsTrigger value="config">Config</TabsTrigger>
					</TabsList>

					<TabsContent value="code" className="mt-4">
						<div className="space-y-4">
							<FileTree
								defaultExpanded={new Set(['app', 'src', 'docs'])}
								selectedPath={activePath}
								onSelect={(path) => {
									setSelectedPath(path)
								}}
							>
								{Array.from(fileTreeRoot.children.values())
									.sort((left, right) => left.name.localeCompare(right.name))
									.map((node) => renderFileTreeNode(node))}
							</FileTree>

							<PackageInfo
								name={packageInfo?.name ?? 'workspace'}
								currentVersion={packageInfo?.version ?? '0.0.0'}
								changeType="patch"
							>
								<PackageInfoDescription>
									{packageInfo?.description ?? 'Live workspace package metadata.'}
								</PackageInfoDescription>
								<PackageInfoContent>
									<PackageInfoDependencies>
										{packageInfo?.dependencies.map((dependency) => (
											<PackageInfoDependency
												key={dependency.name}
												name={dependency.name}
												version={dependency.version}
											/>
										))}
									</PackageInfoDependencies>
								</PackageInfoContent>
							</PackageInfo>

							<Snippet code="npx eslint app/chat/harness/page.tsx app/api/chat/harness/route.ts lib/hooks/use-harness-query.ts">
								<SnippetText>Validate</SnippetText>
								<SnippetInput />
								<SnippetCopyButton />
							</Snippet>

							<CodeBlock
								code={selectedFile?.content ?? safeJson({ path: activePath, files: allWorkspacePaths })}
								language={selectedFile?.name.endsWith('.tsx') ? 'tsx' : selectedFile?.name.endsWith('.ts') ? 'ts' : 'json'}
							/>

							<Agent>
								<AgentHeader
									name={currentMode?.name ?? 'Harness Coordinator'}
									model={dashboard?.currentModel.id ?? 'gpt-4.1'}
								/>
								<AgentContent>
									<AgentInstructions>
										Inspect the harness state, keep diagnostics strict, and present live workspace widgets clearly.
									</AgentInstructions>
									<AgentOutput schema={safeJson(dashboard?.state ?? {})} />
								</AgentContent>
							</Agent>
						</div>
					</TabsContent>

					<TabsContent value="ops" className="mt-4 space-y-4">
						<Terminal
							output={terminalOutput}
							isStreaming={Boolean(dashboard?.displayState.isRunning)}
							autoScroll
							onClear={() => {
								setTerminalOutputOverride('')
							}}
						>
							<TerminalHeader>
								<TerminalTitle>Harness terminal</TerminalTitle>
								<TerminalActions>
									<TerminalStatus>
										{dashboard?.displayState.isRunning ? 'Running' : 'Idle'}
									</TerminalStatus>
									<TerminalCopyButton />
									<TerminalClearButton />
								</TerminalActions>
							</TerminalHeader>
							<TerminalContent />
						</Terminal>

						{stackTraceText ? (
							<StackTrace trace={stackTraceText} defaultOpen>
								<StackTraceHeader>
									<StackTraceError>
										<StackTraceErrorType />
										<StackTraceErrorMessage />
										<StackTraceActions>
											<StackTraceCopyButton />
											<StackTraceExpandButton />
										</StackTraceActions>
									</StackTraceError>
								</StackTraceHeader>
								<StackTraceContent maxHeight={220}>
									<StackTraceFrames showInternalFrames={false} />
								</StackTraceContent>
							</StackTrace>
						) : (
							<Card className="border-white/5 bg-card/50 backdrop-blur-xl">
								<CardContent className="p-4 text-sm text-muted-foreground">
									No runtime stack trace is currently available.
								</CardContent>
							</Card>
						)}

						<TestResults
							summary={{
								failed: 0,
								passed: taskCompleted,
								skipped: taskPending + taskInProgress,
								total: taskTotal,
								duration: Math.max(taskTotal * 120, 120),
							}}
						>
							<TestResultsContent>
								<TestResultsSummary />
								<TestResultsProgress />
								<p className="text-sm text-muted-foreground">
									Live harness task progress is derived from the current dashboard snapshot.
								</p>
							</TestResultsContent>
						</TestResults>

						<Commit defaultOpen>
							<CommitHeader>
								<CommitInfo>
									<CommitMessage>
										{gitInfo ? gitInfo.message : 'Live harness workspace snapshot'}
									</CommitMessage>
									<CommitMetadata>
										<CommitHash>{gitInfo?.hash.slice(0, 7) ?? 'local'}</CommitHash>
										<CommitSeparator />
										<CommitAuthor>
											<CommitAuthorAvatar initials={(gitInfo?.author ?? 'AS').slice(0, 2).toUpperCase()} />
											<span className="ml-2">{gitInfo?.author ?? 'AgentStack'}</span>
										</CommitAuthor>
										<CommitSeparator />
										<CommitTimestamp date={gitInfo?.timestamp ? new Date(gitInfo.timestamp) : new Date()} />
									</CommitMetadata>
								</CommitInfo>
								<CommitActions>
									<CommitCopyButton hash={gitInfo?.hash ?? 'local'} />
								</CommitActions>
							</CommitHeader>
							<CommitContent>
								<CommitFiles>
									{gitInfo?.files.map((file) => (
										<CommitFile key={file.path}>
											<CommitFileInfo>
												<CommitFileStatus status={normalizeCommitFileStatus(file.status)} />
												<CommitFileIcon />
												<CommitFilePath>{file.path}</CommitFilePath>
											</CommitFileInfo>
											<CommitFileChanges>
												<CommitFileAdditions count={file.status === 'added' ? 1 : 0} />
												<CommitFileDeletions count={file.status === 'deleted' ? 1 : 0} />
											</CommitFileChanges>
										</CommitFile>
									))}
								</CommitFiles>
							</CommitContent>
						</Commit>
					</TabsContent>

					<TabsContent value="preview" className="mt-4 space-y-4">
						<WebPreview defaultUrl={dashboard?.workspace.previewUrl ?? '/chat/harness'} className="min-h-80 overflow-hidden">
							<WebPreviewNavigation>
								<WebPreviewNavigationButton tooltip="Reload">↻</WebPreviewNavigationButton>
								<WebPreviewNavigationButton tooltip="Open preview">↗</WebPreviewNavigationButton>
								<WebPreviewUrl />
							</WebPreviewNavigation>
							<WebPreviewBody className="min-h-52 bg-background" />
							<WebPreviewConsole
								logs={[
									{
										level: 'log',
										message: `Previewing ${dashboard?.workspace.previewUrl ?? '/chat/harness'}`,
										timestamp: new Date(),
									},
									{
										level: dashboard?.displayState.isRunning ? 'warn' : 'log',
										message: dashboard?.displayState.isRunning
											? 'Harness is streaming live output.'
											: 'Harness preview is connected to live workspace data.',
										timestamp: new Date(),
									},
								]}
							/>
						</WebPreview>

						<JSXPreview jsx={previewJsx}>
							<JSXPreviewContent className="rounded-lg border bg-background p-4" />
						</JSXPreview>

						<Sandbox>
							<SandboxHeader state={dashboard?.displayState.isRunning ? 'input-streaming' : 'output-available'} title="Harness sandbox" />
							<SandboxContent>
								<div className="p-4">
									<CodeBlock
										code={selectedFile?.content ?? `export default function SandboxPreview() {
  return <div className="rounded-lg border p-4">${dashboard?.activeThread?.title ?? 'Live harness sandbox'}</div>
}`}
										language={selectedFile?.name.endsWith('.tsx') ? 'tsx' : 'tsx'}
									/>
								</div>
							</SandboxContent>
						</Sandbox>

						<Artifact>
							<ArtifactHeader>
								<ArtifactTitle>Live harness artifact</ArtifactTitle>
								<ArtifactActions>
									<ArtifactAction icon={RefreshCwIcon} tooltip="Refresh artifact" />
									<ArtifactClose />
								</ArtifactActions>
							</ArtifactHeader>
							<ArtifactDescription>
								Current workspace snapshot for {activePath}.
							</ArtifactDescription>
							<ArtifactContent>
								<CodeBlock
									code={safeJson({
										activeThread: dashboard?.activeThreadId,
										selectedPath: activePath,
										packageInfo,
										gitInfo,
									})}
									language="json"
								/>
							</ArtifactContent>
						</Artifact>
					</TabsContent>

					<TabsContent value="config" className="mt-4 space-y-4">
						<EnvironmentVariables defaultShowValues>
							<EnvironmentVariablesHeader>
								<EnvironmentVariablesTitle>Live env vars</EnvironmentVariablesTitle>
								<EnvironmentVariablesToggle />
							</EnvironmentVariablesHeader>
							<EnvironmentVariablesContent>
								{safeEnvVars.length ? (
									safeEnvVars.map((envVariable) => (
										<EnvironmentVariable
											key={envVariable.name}
											name={envVariable.name}
											value={envVariable.value}
										/>
									))
								) : (
									<EnvironmentVariable name="No safe env vars" value="available in this workspace snapshot" />
								)}
							</EnvironmentVariablesContent>
						</EnvironmentVariables>

						<SchemaDisplay
							method="GET"
							path="/api/chat/harness"
							description="Returns a live harness snapshot with messages, modes, threads, tool state, and workspace metadata."
							parameters={[
								{
									name: 'limit',
									type: 'number',
									location: 'query',
									description: 'Message limit to return.',
								},
							]}
							requestBody={[]}
							responseBody={[
								{
									name: 'resourceId',
									type: 'string',
									required: true,
									description: 'Current harness resource id',
								},
								{
									name: 'workspace',
									type: 'object',
									required: true,
									description: 'Live workspace snapshot',
								},
								{
									name: 'messages',
									type: 'HarnessSerializedMessage[]',
									required: true,
									description: 'Thread message history',
								},
							]}
						>
							<SchemaDisplayExample>
								<CodeBlock
									code={safeJson({
										resourceId: dashboard?.resourceId,
										workspace: dashboard?.workspace,
										messageCount: dashboard?.messages.length ?? 0,
									})}
									language="json"
								/>
							</SchemaDisplayExample>
						</SchemaDisplay>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	)
}

export default function HarnessPage() {
	const dashboardQuery = useHarnessDashboardQuery({ limit: HARNESS_MESSAGE_LIMIT })
	const harnessAction = useHarnessActionMutation({ limit: HARNESS_MESSAGE_LIMIT })

	const dashboard = dashboardQuery.data
	const currentThread = dashboard?.activeThread ?? null
	const currentModeId = dashboard?.session.currentModeId
	const currentMode = dashboard?.modes.find((mode) => mode.id === currentModeId)
	const pendingQuestion = dashboard?.displayState.pendingQuestion ?? null
	const pendingPlanApproval = dashboard?.displayState.pendingPlanApproval ?? null
	const [newThreadTitle, setNewThreadTitle] = useState('')

	const stats = useMemo(() => {
		const threadCount = dashboard?.session.threads.length ?? 0
		const messageCount = dashboard?.messages.length ?? 0
		const isRunning = dashboard?.displayState.isRunning ?? false
		const activeTools = dashboard?.displayState.activeTools.length ?? 0

		return { threadCount, messageCount, isRunning, activeTools }
	}, [dashboard])

	const activeToolExecutions = useMemo(() => {
		return (dashboard?.displayState.activeTools ?? []).map((tool) => ({
			id: tool.id,
			name: tool.name,
			status: mapToolExecutionStatus(tool.status),
			input: typeof tool.args === 'object' && tool.args !== null ? (tool.args as Record<string, unknown>) : undefined,
			output: tool.result,
			error: tool.isError
				? typeof tool.shellOutput === 'string' && tool.shellOutput.trim().length > 0
					? tool.shellOutput
					: 'Tool execution failed'
				: undefined,
		}))
	}, [dashboard])

	const handleCreateThread = async () => {
		const title = newThreadTitle.trim()
		await harnessAction.mutateAsync({
			action: 'createThread',
			...(title ? { title } : {}),
		})
		setNewThreadTitle('')
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-6 p-6">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<SparklesIcon className="size-5" />
					</div>
					<div>
						<h1 className="text-xl font-bold tracking-tight">Harness</h1>
						<p className="text-xs text-muted-foreground">
							Inspect modes, threads, messages, and live harness state.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							void dashboardQuery.refetch()
						}}
						disabled={dashboardQuery.isFetching}
						className="gap-1.5"
					>
						{dashboardQuery.isFetching ? (
							<Loader2Icon className="size-3.5 animate-spin" />
						) : (
							<RefreshCwIcon className="size-3.5" />
						)}
						Refresh
					</Button>
					{dashboard?.displayState.isRunning ? (
						<Badge className="gap-1.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
							<ActivityIcon className="size-3" />
							Running
						</Badge>
					) : (
						<Badge variant="outline" className="gap-1.5">
							<CheckCircle2Icon className="size-3" />
							Idle
						</Badge>
					)}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
				<Card className="border-white/5 bg-card/50 backdrop-blur-xl">
					<CardContent className="p-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<GitBranchIcon className="size-4" />
							<span className="text-[10px] font-bold uppercase tracking-widest">
								Threads
							</span>
						</div>
						<div className="mt-2 text-2xl font-bold tabular-nums">
							{dashboardQuery.isLoading ? (
								<Skeleton className="h-8 w-12" />
							) : (
								stats.threadCount
							)}
						</div>
					</CardContent>
				</Card>
				<Card className="border-white/5 bg-card/50 backdrop-blur-xl">
					<CardContent className="p-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<MessageSquareIcon className="size-4" />
							<span className="text-[10px] font-bold uppercase tracking-widest">
								Messages
							</span>
						</div>
						<div className="mt-2 text-2xl font-bold tabular-nums">
							{dashboardQuery.isLoading ? (
								<Skeleton className="h-8 w-12" />
							) : (
								stats.messageCount
							)}
						</div>
					</CardContent>
				</Card>
				<Card className="border-white/5 bg-card/50 backdrop-blur-xl">
					<CardContent className="p-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Clock3Icon className="size-4" />
							<span className="text-[10px] font-bold uppercase tracking-widest">
								Active Tools
							</span>
						</div>
						<div className="mt-2 text-2xl font-bold tabular-nums">
							{dashboardQuery.isLoading ? (
								<Skeleton className="h-8 w-12" />
							) : (
								stats.activeTools
							)}
						</div>
					</CardContent>
				</Card>
				<Card className="border-white/5 bg-card/50 backdrop-blur-xl">
					<CardContent className="p-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<BotIcon className="size-4" />
							<span className="text-[10px] font-bold uppercase tracking-widest">
								Model
							</span>
						</div>
						<div className="mt-2 text-sm font-semibold">
							{dashboardQuery.isLoading ? (
								<Skeleton className="h-5 w-28" />
							) : (
								dashboard?.currentModel.name ?? '—'
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid min-h-0 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
				<div className="flex min-h-0 flex-col gap-6">
					<Card className="border-white/5 bg-card/50 backdrop-blur-xl">
						<CardHeader className="pb-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Settings2Icon className="size-4" />
								</div>
								<div>
									<CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
										Current Mode
									</CardTitle>
									<CardDescription className="text-xs">
										Switch the active harness mode.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{dashboardQuery.isLoading ? (
								<Skeleton className="h-10 w-full rounded-xl" />
							) : (
								<Select
									value={dashboard?.session.currentModeId ?? ''}
									onValueChange={(modeId) => {
										void harnessAction.mutateAsync({
											action: 'switchMode',
											modeId,
										})
									}}
								>
									<SelectTrigger className="bg-zinc-900/50 border-white/10">
										<SelectValue placeholder="Choose a mode" />
									</SelectTrigger>
									<SelectContent className="bg-zinc-900 text-white">
										{dashboard?.modes.map((mode) => (
											<SelectItem key={mode.id} value={mode.id}>
												{mode.name ?? mode.id}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							{currentMode ? (
								<div className="flex flex-wrap gap-2">
									<Badge variant="outline">{currentMode.id}</Badge>
									{currentMode.default ? (
										<Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
											Default
										</Badge>
									) : null}
								</div>
							) : null}
						</CardContent>
					</Card>

					<Card className="border-white/5 bg-card/50 backdrop-blur-xl flex min-h-0 flex-1 flex-col">
						<CardHeader className="pb-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<GitBranchIcon className="size-4" />
								</div>
								<div>
									<CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
										Threads
									</CardTitle>
									<CardDescription className="text-xs">
										Browse and switch between harness threads.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="flex min-h-0 flex-1 flex-col gap-3">
							<div className="flex items-center gap-2">
								<Input
									value={newThreadTitle}
									onChange={(event) => {
										setNewThreadTitle(event.target.value)
									}}
									placeholder="New thread title"
									className="bg-zinc-900/50 border-white/10"
								/>
								<Button
									onClick={() => {
										void handleCreateThread()
									}}
									disabled={harnessAction.isPending}
									size="icon"
									variant="outline"
									className="shrink-0"
								>
									<PlusIcon className="size-4" />
								</Button>
							</div>

							<ScrollArea className="min-h-0 flex-1 pr-2">
								<div className="space-y-2">
									{dashboardQuery.isLoading ? (
										Array.from({ length: 5 }).map((_, index) => (
											<Skeleton
												key={index}
												className="h-18 w-full rounded-xl"
											/>
										))
									) : dashboard?.session.threads.length ? (
										dashboard.session.threads.map((thread) => {
											const isActive = thread.id === dashboard.activeThreadId
											return (
												<button
													key={thread.id}
													type="button"
													onClick={() => {
														void harnessAction.mutateAsync({
															action: 'switchThread',
															threadId: thread.id,
														})
													}}
													className={cn(
														'w-full rounded-xl border p-3 text-left transition hover:border-primary/30 hover:bg-primary/5',
														isActive
															? 'border-primary/30 bg-primary/10'
															: 'border-white/10 bg-black/20'
													)}
												>
													<div className="flex items-start justify-between gap-3">
														<div>
															<p className="text-sm font-semibold">
																{thread.title ?? 'Untitled thread'}
															</p>
															<p className="mt-1 text-[11px] text-muted-foreground">
																{thread.id}
															</p>
														</div>
														{isActive ? (
															<Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
																Active
															</Badge>
														) : null}
													</div>
													<div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
														<span>{thread.resourceId}</span>
														<span>{formatTimestamp(thread.updatedAt)}</span>
													</div>
												</button>
											)
										})
									) : (
										<div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-sm text-muted-foreground">
											No threads yet. Create one to start.
										</div>
									)}
								</div>
							</ScrollArea>
						</CardContent>
					</Card>
				</div>

				<Card className="border-white/5 bg-card/50 backdrop-blur-xl flex min-h-0 flex-col">
					<CardHeader className="pb-4">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<MessageSquareIcon className="size-4" />
							</div>
							<div>
								<CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
									Messages
								</CardTitle>
								<CardDescription className="text-xs">
									{dashboard?.activeThread?.title ?? 'Current thread'}
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="flex min-h-0 flex-1 flex-col gap-4">
						<ThreadRenameCard
							key={`${dashboard?.activeThreadId ?? 'none'}:${currentThread?.title ?? ''}`}
							threadId={dashboard?.activeThreadId ?? null}
							threadTitle={currentThread?.title ?? ''}
							disabled={harnessAction.isPending}
							onRename={async (title) => {
								if (!dashboard?.activeThreadId) {
									return
								}

								await harnessAction.mutateAsync({ action: 'renameThread', title })
							}}
						/>

						<Separator className="bg-white/5" />

					<Conversation className="min-h-0 flex-1 rounded-2xl border border-white/5 bg-black/10">
						<ConversationContent className="gap-4 p-4">
							{dashboardQuery.isLoading ? (
								Array.from({ length: 4 }).map((_, index) => (
									<Skeleton key={index} className="h-28 w-full rounded-xl" />
								))
							) : dashboard?.messages.length ? (
								dashboard.messages.map((message) => (
									<HarnessMessageView key={message.id} message={message} />
								))
							) : (
								<ConversationEmptyState>
									<div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
										<MessageSquareIcon className="size-8" />
										<p className="text-sm font-medium text-foreground">
											No messages yet
										</p>
										<p className="max-w-md text-sm">
											Send a message to start the harness conversation.
										</p>
									</div>
								</ConversationEmptyState>
							)}

							{dashboard?.displayState.currentMessage ? (
								<HarnessMessageView
									message={dashboard.displayState.currentMessage}
									isStreaming
								/>
							) : null}
						</ConversationContent>
						<ConversationScrollButton />
					</Conversation>

					<Separator className="bg-white/5" />

					<PromptInput
						onSubmit={async (message) => {
							const content = message.text.trim()
							if (!content) {
								return
							}

							if (dashboard?.displayState.isRunning) {
								await harnessAction.mutateAsync({ action: 'followUp', content })
							} else {
								await harnessAction.mutateAsync({ action: 'sendMessage', content })
							}
						}}
						className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-sm"
					>
						<PromptInputBody>
							<PromptInputTextarea
								placeholder={
									dashboard?.displayState.isRunning
										? 'Queue a follow-up while the harness is running...'
										: 'Write a message to the current harness thread...'
								}
								className="min-h-24 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
							/>
						</PromptInputBody>
						<PromptInputFooter>
							<div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/60">
								{dashboard?.displayState.isRunning ? (
									<Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
										Streaming
									</Badge>
								) : (
									<Badge variant="outline">Ready</Badge>
								)}
								<span>
									{dashboard?.displayState.isRunning
										? 'Enter queues a follow-up.'
										: 'Enter sends a new message.'}
								</span>
							</div>
							<PromptInputSubmit
								status={dashboard?.displayState.isRunning ? 'streaming' : undefined}
								onStop={() => {
									void harnessAction.mutateAsync({ action: 'abort' })
								}}
								disabled={harnessAction.isPending && !dashboard?.displayState.isRunning}
							/>
						</PromptInputFooter>
					</PromptInput>
					</CardContent>
				</Card>

				<div className="flex min-h-0 flex-col gap-6">
					<Card className="border-white/5 bg-card/50 backdrop-blur-xl">
						<CardHeader className="pb-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<ShieldCheckIcon className="size-4" />
								</div>
								<div>
									<CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
										Pending Interactions
									</CardTitle>
									<CardDescription className="text-xs">
										Questions and approvals waiting for a response.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{pendingQuestion ? (
								<QuestionResponseCard
									key={pendingQuestion.questionId}
									questionId={pendingQuestion.questionId}
									question={pendingQuestion.question}
									options={pendingQuestion.options}
									disabled={harnessAction.isPending}
									onSubmit={async (answer) => {
										await harnessAction.mutateAsync({
											action: 'respondToQuestion',
											questionId: pendingQuestion.questionId,
											answer,
										})
									}}
								/>
							) : null}

							{pendingPlanApproval ? (
								<PlanApprovalCard
									key={pendingPlanApproval.planId}
									planId={pendingPlanApproval.planId}
									title={pendingPlanApproval.title}
									plan={pendingPlanApproval.plan}
									disabled={harnessAction.isPending}
									onReject={async (feedback) => {
										await harnessAction.mutateAsync({
											action: 'respondToPlanApproval',
											planId: pendingPlanApproval.planId,
											response: {
												action: 'rejected',
												...(feedback.trim() ? { feedback: feedback.trim() } : {}),
											},
										})
									}}
									onApprove={async (feedback) => {
										await harnessAction.mutateAsync({
											action: 'respondToPlanApproval',
											planId: pendingPlanApproval.planId,
											response: {
												action: 'approved',
												...(feedback.trim() ? { feedback: feedback.trim() } : {}),
											},
										})
									}}
								/>
							) : null}

							{dashboard?.displayState.pendingApproval ? (
								<div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
									<div className="flex items-center justify-between gap-3">
										<Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">
											Tool approval
										</Badge>
										<span className="text-[11px] text-muted-foreground">
											{dashboard.displayState.pendingApproval.toolName}
										</span>
									</div>
									<pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-5 text-muted-foreground">
										{safeJson(dashboard.displayState.pendingApproval.args)}
									</pre>
									<div className="grid grid-cols-3 gap-2">
										<Button
											variant="outline"
											onClick={() => {
												void harnessAction.mutateAsync({
													action: 'respondToToolApproval',
													decision: 'decline',
												})
											}}
											disabled={harnessAction.isPending}
										>
											Decline
										</Button>
										<Button
											variant="outline"
											onClick={() => {
												void harnessAction.mutateAsync({
													action: 'respondToToolApproval',
													decision: 'always_allow_category',
												})
											}}
											disabled={harnessAction.isPending}
										>
											Always allow
										</Button>
										<Button
											onClick={() => {
												void harnessAction.mutateAsync({
													action: 'respondToToolApproval',
													decision: 'approve',
												})
											}}
											disabled={harnessAction.isPending}
										>
											Approve
										</Button>
									</div>
								</div>
							) : null}

							{!dashboard?.displayState.pendingQuestion &&
							!dashboard?.displayState.pendingPlanApproval &&
							!dashboard?.displayState.pendingApproval ? (
								<div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-sm text-muted-foreground">
									No pending approvals or questions.
								</div>
							) : null}
						</CardContent>
					</Card>

					<Card className="border-white/5 bg-card/50 backdrop-blur-xl">
						<CardHeader className="pb-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<ActivityIcon className="size-4" />
								</div>
								<div>
									<CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
										Active Tools
									</CardTitle>
									<CardDescription className="text-xs">
										Live tool executions from the running harness.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{activeToolExecutions.length ? (
								<ToolExecutionList tools={activeToolExecutions} />
							) : (
								<div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-sm text-muted-foreground">
									No active tools right now.
								</div>
							)}
						</CardContent>
					</Card>

					<WorkspacePanels dashboard={dashboard} />

					<Card className="border-white/5 bg-card/50 backdrop-blur-xl flex min-h-0 flex-1 flex-col">
						<CardHeader className="pb-4">
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<BotIcon className="size-4" />
								</div>
								<div>
									<CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
										State Snapshot
									</CardTitle>
									<CardDescription className="text-xs">
										Harness state, permissions, and workspace status.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="flex min-h-0 flex-1 flex-col gap-4">
							<div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
								<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
									<span>Resource</span>
									<span>{dashboard?.resourceId ?? '—'}</span>
								</div>
								<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
									<span>Workspace</span>
									<span>
										{dashboard?.workspace.hasWorkspace
											? dashboard.workspace.ready
												? 'ready'
												: 'loading'
											: 'disabled'}
									</span>
								</div>
								<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
									<span>Current thread</span>
									<span>{dashboard?.activeThread?.title ?? '—'}</span>
								</div>
							</div>

							<ScrollArea className="min-h-0 flex-1 pr-2">
								<div className="space-y-4">
									<div className="space-y-2">
										<div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
											<Settings2Icon className="size-3.5" />
											Current State
										</div>
										<pre className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-5 text-muted-foreground">
											{safeJson(dashboard?.state ?? {})}
										</pre>
									</div>

									<div className="space-y-2">
										<div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
											<ShieldCheckIcon className="size-3.5" />
											Grants
										</div>
										<div className="flex flex-wrap gap-2">
											{dashboard?.permissions.grants.categories.map((category) => (
												<Badge key={category} variant="outline">
													{category}
												</Badge>
											))}
											{dashboard?.permissions.grants.tools.map((tool) => (
												<Badge key={tool} className="border-white/10 bg-white/5 text-[10px] uppercase tracking-widest">
													{tool}
												</Badge>
											))}
											{!dashboard?.permissions.grants.categories.length &&
											!dashboard?.permissions.grants.tools.length ? (
												<span className="text-sm text-muted-foreground">
													No session grants.
												</span>
											) : null}
										</div>
									</div>
								</div>
							</ScrollArea>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
