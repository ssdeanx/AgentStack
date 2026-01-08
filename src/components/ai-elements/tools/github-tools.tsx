'use client'

import { Badge } from '@/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import {
    GitFork,
    Star,
    Lock,
    Globe,
    ExternalLink,
    GitPullRequest,
    MessageSquare,
    AlertCircle,
    Loader2,
    GitCommit,
} from 'lucide-react'
import { ScrollArea } from '@/ui/scroll-area'
import type {
    ListRepositoriesUITool,
    ListPullRequestsUITool,
    GetIssueUITool,
} from './types'
import type {
    Key,
    ReactElement,
    JSXElementConstructor,
    ReactNode,
    ReactPortal,
} from 'react'

interface Repository {
    url: string
    isPrivate: boolean
    name: string
    stars: number
    forks: number
    description?: string
    defaultBranch: string
    updatedAt: string
}

interface PullRequest {
    number: number
    url: string
    title: string
    state: string
    labels: string[]
    author: string
    createdAt: string
    updatedAt: string
    draft: boolean
}

interface Issue {
    number: number
    url: string
    title: string
    author: string
    createdAt: string
    state: 'open' | 'closed'
    labels: string[]
    body?: string
    comments: number
}

interface Commit {
    sha: string
    html_url: string
    message: string
    author?: {
        name: string
        date: string
    }
    commit?: {
        author?: {
            date: string
        }
    }
}

// ... (Existing components)

export function CommitHistoryList({
    input,
    output,
    errorText,
}: ToolProps<any, any>) {
    if (errorText) {
        return (
            <Card className="border-destructive/50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="size-4" />
                        Commit History Failed
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-destructive">{errorText}</div>
                </CardContent>
            </Card>
        )
    }

    if (!output) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        Fetching commits...
                    </CardTitle>
                </CardHeader>
            </Card>
        )
    }

    const commits = output.commits ?? []

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GitCommit className="size-4" />
                    Recent Commits ({commits.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-75 pr-4">
                    <div className="relative border-l border-muted ml-3 space-y-4 pb-2">
                        {commits.map((commit: any) => (
                            <div key={commit.sha} className="ml-4 relative">
                                <div className="absolute -left-5.25 top-1.5 size-2.5 rounded-full border bg-background" />
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <a
                                            href={commit.html_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium hover:underline leading-tight"
                                        >
                                            {commit.message.split('\n')[0]}
                                        </a>
                                        <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded font-mono shrink-0">
                                            {commit.sha.substring(0, 7)}
                                        </code>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">
                                            {commit.author?.name}
                                        </span>
                                        <span>
                                            committed on{' '}
                                            {new Date(
                                                commit.author?.date ??
                                                    commit.commit?.author?.date
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

interface ToolProps<TInput, TOutput> {
    toolCallId: string
    input: TInput
    output?: TOutput
    errorText?: string
}

export function RepositoryCard({
    input,
    output,
    errorText,
}: ToolProps<
    ListRepositoriesUITool['input'],
    ListRepositoriesUITool['output']
>) {
    if (errorText) {
        return (
            <Card className="border-destructive/50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="size-4" />
                        Repository List Failed
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-destructive">{errorText}</div>
                </CardContent>
            </Card>
        )
    }

    if (!output) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        Fetching repositories...
                    </CardTitle>
                </CardHeader>
            </Card>
        )
    }

    const repos = output.repositories ?? []

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                    Repositories ({repos.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-75 pr-4">
                    <div className="space-y-3">
                        {repos.map(
                            (repo) => (
                                <div
                                    key={repo.url}
                                    className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {repo.isPrivate ? (
                                                <Lock className="size-3 text-muted-foreground" />
                                            ) : (
                                                <Globe className="size-3 text-muted-foreground" />
                                            )}
                                            <a
                                                href={repo.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium hover:underline truncate"
                                            >
                                                {repo.name}
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <div className="flex items-center gap-1 text-xs">
                                                <Star className="size-3" />
                                                {repo.stars}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs">
                                                <GitFork className="size-3" />
                                                {repo.forks}
                                            </div>
                                        </div>
                                    </div>
                                    {repo.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {repo.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] h-5"
                                        >
                                            {repo.defaultBranch}
                                        </Badge>
                                        <span>
                                            Updated{' '}
                                            {new Date(
                                                repo.updatedAt
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

export function PullRequestList({
    input,
    output,
    errorText,
}: ToolProps<
    ListPullRequestsUITool['input'],
    ListPullRequestsUITool['output']
>) {
    if (errorText) {
        return (
            <Card className="border-destructive/50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="size-4" />
                        PR List Failed
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-destructive">{errorText}</div>
                </CardContent>
            </Card>
        )
    }

    if (!output) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        Fetching pull requests...
                    </CardTitle>
                </CardHeader>
            </Card>
        )
    }

    const prs = output.pullRequests || []

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GitPullRequest className="size-4" />
                    Pull Requests ({prs.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-75 pr-4">
                    <div className="space-y-3">
                        {prs.map((pr: PullRequest) => (
                                <div
                                    key={pr.number}
                                    className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-xs text-muted-foreground">
                                                #{pr.number}
                                            </span>
                                            <a
                                                href={pr.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium hover:underline truncate"
                                            >
                                                {pr.title}
                                            </a>
                                        </div>
                                        <Badge
                                            variant={
                                                pr.state === 'open'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                            className="text-[10px] capitalize"
                                        >
                                            {pr.state}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {pr.labels.map((label) => (
                                            <Badge
                                                key={label}
                                                variant="outline"
                                                className="text-[10px] h-5 px-1.5 bg-muted/50"
                                            >
                                                {label}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                        <div className="flex items-center gap-1">
                                            <span>by {pr.author}</span>
                                        </div>
                                        <span>
                                            {new Date(
                                                pr.createdAt
                                            ).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

export function IssueCard({
    input,
    output,
    errorText,
}: ToolProps<GetIssueUITool['input'], GetIssueUITool['output']>) {
    if (errorText) {
        return (
            <Card className="border-destructive/50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="size-4" />
                        Issue Fetch Failed
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-destructive">{errorText}</div>
                </CardContent>
            </Card>
        )
    }

    if (!output) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Loader2 className="size-4 animate-spin" />
                        Fetching issue #{input.issueNumber}...
                    </CardTitle>
                </CardHeader>
            </Card>
        )
    }

    const issue = output.issue

    if (!issue) {
        return null
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <span className="text-muted-foreground">
                                #{issue.number}
                            </span>
                            <a
                                href={issue.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                {issue.title}
                            </a>
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Opened by {issue.author}</span>
                            <span>•</span>
                            <span>
                                {new Date(issue.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <Badge
                        variant={
                            issue.state === 'open' ? 'default' : 'secondary'
                        }
                        className="capitalize shrink-0"
                    >
                        {issue.state}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                    {issue.labels.map((label) => (
                        <Badge
                            key={label}
                            variant="outline"
                            className="text-xs"
                        >
                            {label}
                        </Badge>
                    ))}
                </div>

                {issue.body && (
                    <div className="prose prose-sm max-w-none text-sm text-muted-foreground line-clamp-3 bg-muted/30 p-3 rounded-md mb-3">
                        {issue.body}
                    </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <MessageSquare className="size-3" />
                        {issue.comments} comments
                    </div>
                    <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                    >
                        View on GitHub <ExternalLink className="size-3" />
                    </a>
                </div>
            </CardContent>
        </Card>
    )
}
