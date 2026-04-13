'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import {
	useWorkflow,
	useWorkflowRuns,
	useWorkflowSchema,
} from '@/lib/hooks/use-mastra-query'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { ScrollArea } from '@/ui/scroll-area'
import { Skeleton } from '@/ui/skeleton'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/ui/tooltip'
import { Panel } from '@/src/components/ai-elements/panel'
import {
	CodeBlock,
	CodeBlockActions,
	CodeBlockCopyButton,
	CodeBlockHeader,
	CodeBlockTitle,
} from '@/src/components/ai-elements/code-block'
import {
	ArrowLeftIcon,
	CircleHelpIcon,
	Clock3Icon,
	DatabaseIcon,
	PanelRightCloseIcon,
	RefreshCwIcon,
	WorkflowIcon,
} from 'lucide-react'

type WorkflowRunRecord = Record<string, unknown>

function safeString(value: unknown, fallback = '—'): string {
	if (typeof value === 'string' && value.trim().length > 0) {
		return value
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value)
	}

	return fallback
}

function safeJson(value: unknown): string {
	if (value === null || value === undefined) {
		return 'null'
	}

	if (typeof value === 'string') {
		return value
	}

	try {
		return JSON.stringify(value, null, 2)
	} catch {
		return String(value)
	}
}

function extractWorkflowRuns(value: unknown): WorkflowRunRecord[] {
	if (Array.isArray(value)) {
		return value.filter(
			(run): run is WorkflowRunRecord =>
				typeof run === 'object' && run !== null
		)
	}

	if (value && typeof value === 'object') {
		const runs = (value as { runs?: unknown }).runs
		if (Array.isArray(runs)) {
			return runs.filter(
				(run): run is WorkflowRunRecord =>
					typeof run === 'object' && run !== null
			)
		}
	}

	return []
}

function formatDate(value: unknown): string {
	if (typeof value === 'string' || typeof value === 'number') {
		const date = new Date(value)
		if (!Number.isNaN(date.getTime())) {
			return date.toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			})
		}
	}

	return '—'
}

/**
 * Live workflow detail page for a single workflow route.
 */
export default function WorkflowDetailPage() {
	const router = useRouter()
	const params = useParams<{ workflowId?: string | string[] }>()
	const [showHelpPanel, setShowHelpPanel] = useState(true)

	const workflowIdParam = params.workflowId
	const workflowId = Array.isArray(workflowIdParam)
		? workflowIdParam[0] ?? ''
		: workflowIdParam ?? ''

	const workflowQuery = useWorkflow(workflowId)
	const workflowSchemaQuery = useWorkflowSchema(workflowId)
	const workflowRunsQuery = useWorkflowRuns(workflowId, { page: 1, perPage: 8 })

	const workflow = workflowQuery.data
	const workflowRuns = useMemo(
		() => extractWorkflowRuns(workflowRunsQuery.data),
		[workflowRunsQuery.data]
	)

	return (
		<TooltipProvider delayDuration={150}>
			<div className="flex min-h-screen flex-col bg-background">
				<header className="border-b bg-card/60 backdrop-blur">
					<div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => router.push('/chat/workflows')}
							aria-label="Back to workflows"
						>
							<ArrowLeftIcon className="size-4" />
						</Button>

						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2 text-primary">
								<WorkflowIcon className="size-5" />
							</div>
							<div>
								<h1 className="text-lg font-semibold">
									{safeString(
										workflow?.name,
										workflowId || 'Workflow detail'
									)}
								</h1>
								<p className="text-sm text-muted-foreground">
									Drill into the workflow schema, runtime runs, and live metadata.
								</p>
							</div>
						</div>

						<div className="ml-auto flex items-center gap-2">
							<Tooltip>
								<TooltipTrigger asChild>
									<Badge variant="secondary" className="cursor-help">
										{workflowId || 'unresolved'}
									</Badge>
								</TooltipTrigger>
								<TooltipContent>Workflow route identifier.</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => setShowHelpPanel((current) => !current)}
										aria-label={showHelpPanel ? 'Hide workflow help panel' : 'Show workflow help panel'}
									>
										{showHelpPanel ? (
											<PanelRightCloseIcon className="size-4" />
										) : (
											<CircleHelpIcon className="size-4" />
										)}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{showHelpPanel ? 'Hide the workflow help panel.' : 'Show the workflow help panel.'}
								</TooltipContent>
							</Tooltip>
						</div>
					</div>
				</header>

				<main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
					{showHelpPanel ? (
						<Panel position="top-right" className="pointer-events-auto z-20 w-88">
							<div className="rounded-3xl border border-border/60 bg-card/95 p-4 shadow-xl backdrop-blur">
								<div className="flex items-center justify-between gap-3">
									<div>
										<div className="text-sm font-semibold text-foreground">Workflow help</div>
										<div className="text-xs text-muted-foreground">
											Inspect the workflow definition, schema, and latest runs from one page.
										</div>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => setShowHelpPanel(false)}
										aria-label="Close workflow help panel"
									>
										<PanelRightCloseIcon className="size-4" />
									</Button>
								</div>

								<div className="mt-4 space-y-3 text-sm text-muted-foreground">
									<p>Use the route identifier to confirm you are inspecting the correct workflow.</p>
									<p>The schema card shows the live workflow shape, and the runs card highlights the most recent executions.</p>
								</div>
							</div>
						</Panel>
					) : null}

					<div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
						<Card className="border-border/60 bg-card/80 shadow-sm">
							<CardHeader className="space-y-2 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
								<div className="flex items-center justify-between gap-3">
									<CardTitle className="text-base">Overview</CardTitle>
									<Badge variant="secondary">{workflowId || 'unknown'}</Badge>
								</div>
							</CardHeader>
							<CardContent className="space-y-4 p-5 text-sm text-muted-foreground">
								{workflowQuery.isLoading ? (
									<div className="space-y-2">
										<Skeleton className="h-6 w-48" />
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-5/6" />
									</div>
								) : workflowQuery.error ? (
									<div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-destructive">
										{workflowQuery.error instanceof Error
											? workflowQuery.error.message
											: 'Failed to load workflow.'}
									</div>
								) : workflow ? (
									<div className="space-y-4">
										<div>
											<div className="text-base font-medium text-foreground">
												{safeString(
													workflow.name,
													workflowId || 'Workflow'
												)}
											</div>
											<p className="mt-1 text-sm text-muted-foreground">
												{safeString(
													workflow.description,
													'No workflow description available.'
												)}
											</p>
										</div>

										<div className="grid gap-3 md:grid-cols-3">
											<div className="rounded-2xl border border-border/60 bg-background/80 p-3">
												<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
													<DatabaseIcon className="size-3.5" />
													Runs
												</div>
												<div className="mt-2 text-xl font-semibold text-foreground">
													{workflowRuns.length}
												</div>
											</div>
											<div className="rounded-2xl border border-border/60 bg-background/80 p-3">
												<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
													<Clock3Icon className="size-3.5" />
													Updated
												</div>
												<div className="mt-2 text-sm font-medium text-foreground">
													{formatDate((workflow as { updatedAt?: unknown }).updatedAt)}
												</div>
											</div>
											<div className="rounded-2xl border border-border/60 bg-background/80 p-3">
												<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
													<RefreshCwIcon className="size-3.5" />
													Status
												</div>
												<div className="mt-2 text-sm font-medium text-foreground">
													{safeString(
														(workflow as { status?: unknown }).status,
														'Live'
													)}
												</div>
											</div>
										</div>

										<div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-xs whitespace-pre-wrap text-muted-foreground">
											{safeString(
												workflow.description,
												'No additional overview data returned.'
											)}
										</div>
									</div>
								) : (
									<div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
										Workflow details are unavailable for this route.
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="border-border/60 bg-card/80 shadow-sm">
							<CardHeader className="space-y-2 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
								<div className="flex items-center justify-between gap-3">
									<CardTitle className="text-base">Workflow schema</CardTitle>
									<Badge variant="secondary">Live</Badge>
								</div>
							</CardHeader>
							<CardContent className="p-5">
								{workflowSchemaQuery.isLoading ? (
									<Skeleton className="h-72 w-full rounded-2xl" />
								) : workflowSchemaQuery.data ? (
									<CodeBlock
										code={safeJson(workflowSchemaQuery.data)}
										language="json"
										showLineNumbers
									>
										<CodeBlockHeader>
											<CodeBlockTitle>workflow-schema.json</CodeBlockTitle>
											<CodeBlockActions>
												<CodeBlockCopyButton />
											</CodeBlockActions>
										</CodeBlockHeader>
									</CodeBlock>
								) : (
									<div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
										No workflow schema returned.
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					<Card className="border-border/60 bg-card/80 shadow-sm">
						<CardHeader className="space-y-2 border-b border-border/40 bg-linear-to-b from-background to-muted/10">
							<div className="flex items-center justify-between gap-3">
								<CardTitle className="text-base">Recent runs</CardTitle>
								<Badge variant="secondary">{workflowRuns.length}</Badge>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							<ScrollArea className="h-80">
								<div className="space-y-2 p-4">
									{workflowRunsQuery.isLoading ? (
										<div className="space-y-2">
											{Array.from({ length: 4 }).map((_, index) => (
												<Skeleton key={index} className="h-20 w-full rounded-2xl" />
											))}
										</div>
									) : workflowRuns.length === 0 ? (
										<div className="rounded-2xl border border-dashed border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
											No workflow runs were returned for this workflow yet.
										</div>
									) : (
										workflowRuns.map((run, index) => {
											const runId = safeString(
												run.id ?? run.runId,
												`run-${index + 1}`
											)
											const status = safeString(run.status, 'unknown')

											return (
												<div
													key={runId}
													className="rounded-2xl border border-border/60 bg-background/80 p-4"
												>
													<div className="flex items-start justify-between gap-3">
														<div className="space-y-1">
															<div className="text-sm font-medium text-foreground">
																{runId}
															</div>
															<div className="text-xs text-muted-foreground">
																Started {formatDate(run.startedAt ?? run.createdAt)}
															</div>
														</div>
														<Badge variant="secondary">{status}</Badge>
													</div>

													<div className="mt-3 rounded-xl border border-border/50 bg-card/60 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
														{safeJson(run)}
													</div>
												</div>
											)
										})
									)}
								</div>
							</ScrollArea>
						</CardContent>
					</Card>
				</main>
			</div>
		</TooltipProvider>
	)
}