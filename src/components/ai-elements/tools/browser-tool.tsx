'use client'

import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { ScrollArea } from '@/ui/scroll-area'
import {
    WebPreview,
    WebPreviewBody,
    WebPreviewNavigation,
    WebPreviewUrl,
} from '../web-preview'
import { Image as AIImage } from '../image'
import {
    AlertCircle,
    CheckCircle,
    Clipboard,
    Download,
    ExternalLink,
    FileText,
    Globe,
    Image as ImageIcon,
    Loader2,
    Search,
} from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { CodeBlock, CodeBlockCopyButton } from '../code-block'

interface SearchResult {
    title: string
    url: string
    snippet?: string
}

interface UrlInput {
    url: string
}

interface ClickAndExtractInput extends UrlInput {
    clickSelector?: string
}

interface GoogleSearchInput {
    query: string
}

interface CardProps<TInput> {
    toolCallId: string
    input: TInput
    output?: unknown
    errorText?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasText(value: string | undefined | null): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function readString(
    record: Record<string, unknown>,
    key: string
): string | undefined {
    const value = record[key]
    return typeof value === 'string' ? value : undefined
}

function readBoolean(
    record: Record<string, unknown>,
    key: string
): boolean | undefined {
    const value = record[key]
    return typeof value === 'boolean' ? value : undefined
}

function readNumber(
    record: Record<string, unknown>,
    key: string
): number | undefined {
    const value = record[key]
    return typeof value === 'number' ? value : undefined
}

function readSearchResults(record: Record<string, unknown>): SearchResult[] {
    const rawResults = record.results
    if (!Array.isArray(rawResults)) {
        return []
    }

    return rawResults
        .filter(isRecord)
        .map((result) => {
            const title = readString(result, 'title') ?? 'Untitled result'
            const url = readString(result, 'url') ?? ''
            const snippet = readString(result, 'snippet')
            return { title, url, snippet }
        })
        .filter((result) => hasText(result.url))
}

function readSections(
    record: Record<string, unknown>
): Array<{ title: string; summary: string }> {
    const rawSections = record.sections
    if (!Array.isArray(rawSections)) {
        return []
    }

    return rawSections
        .filter(isRecord)
        .map((section, index) => ({
            title: readString(section, 'title') ?? `Section ${index + 1}`,
            summary: readString(section, 'summary') ?? '',
        }))
        .filter((section) => hasText(section.summary))
}

function formatBytes(bytes?: number) {
    if (bytes === undefined) {
        return 'N/A'
    }
    if (bytes === 0) {
        return '0 B'
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let num = bytes
    while (num >= 1024 && i < units.length - 1) {
        num /= 1024
        i++
    }
    return `${num >= 10 ? Math.round(num) : num.toFixed(2)} ${units[i]}`
}

function downloadFileFromBase64(
    filename: string,
    base64: string,
    mime = 'application/octet-stream'
) {
    try {
        const byteCharacters = atob(base64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: mime })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)
    } catch {
        // ignore
    }
}

function createHtmlPreviewUrl(html?: string) {
    if (!hasText(html)) {
        return undefined
    }

    return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

function openInNewTab(url?: string) {
    if (!hasText(url)) {
        return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
}

function ErrorCard({ title, message }: { title: string; message: string }) {
    return (
        <Card className="border-destructive/50">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertCircle className="size-4 text-destructive" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-destructive">{message}</div>
            </CardContent>
        </Card>
    )
}

function LoadingCard({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    {title}
                </CardTitle>
            </CardHeader>
            {hasText(subtitle) ? (
                <CardContent>
                    <div className="text-sm text-muted-foreground">
                        {subtitle}
                    </div>
                </CardContent>
            ) : null}
        </Card>
    )
}

function UrlMeta({
    sourceUrl,
    finalUrl,
}: {
    sourceUrl?: string
    finalUrl?: string
}) {
    const showSourceUrl = hasText(sourceUrl)
    const showFinalUrl = hasText(finalUrl) && finalUrl !== sourceUrl

    if (!showSourceUrl && !showFinalUrl) {
        return null
    }

    return (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {showSourceUrl ? (
                <span className="rounded bg-muted px-2 py-1">
                    Source: {sourceUrl}
                </span>
            ) : null}
            {showFinalUrl ? (
                <span className="rounded bg-muted px-2 py-1">
                    Final: {finalUrl}
                </span>
            ) : null}
        </div>
    )
}

function InlinePreview({ src }: { src?: string }) {
    if (!hasText(src)) {
        return null
    }

    return (
        <div className="overflow-hidden rounded-md border">
            <WebPreview defaultUrl={src} className="h-80 rounded-none border-0">
                <WebPreviewNavigation className="gap-2 px-2 py-2">
                    <Globe className="size-4 text-muted-foreground" />
                    <WebPreviewUrl readOnly />
                </WebPreviewNavigation>
                <div className="min-h-0 flex-1">
                    <WebPreviewBody className="h-full w-full" />
                </div>
            </WebPreview>
        </div>
    )
}

export function ScreenshotCard({
    input,
    output,
    errorText,
}: CardProps<UrlInput>) {
    const [copied, setCopied] = useState(false)

    if (hasText(errorText)) {
        return <ErrorCard title="Screenshot Failed" message={errorText} />
    }

    if (!isRecord(output)) {
        return <LoadingCard title={`Taking screenshot of ${input.url}...`} />
    }

    const base64 = readString(output, 'screenshot') ?? ''
    const mediaType = readString(output, 'mediaType') ?? 'image/png'
    const finalUrl = readString(output, 'finalUrl')
    const outputUrl = readString(output, 'url') ?? input.url
    const width = readNumber(output, 'width')
    const height = readNumber(output, 'height')
    const success = readBoolean(output, 'success') === true
    const hasScreenshot = base64.length > 0
    const dataUrl = hasScreenshot
        ? `data:${mediaType};base64,${base64}`
        : undefined

    const copyUrl = () => {
        if (!hasText(dataUrl)) {
            return
        }

        void navigator.clipboard.writeText(dataUrl).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        })
    }

    return (
        <Card>
            <CardHeader className="flex items-center justify-between gap-3 pb-3 sm:flex-row">
                <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <ImageIcon className="size-4 text-primary" />
                        Screenshot
                    </CardTitle>
                    <UrlMeta sourceUrl={outputUrl} finalUrl={finalUrl} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={success ? 'secondary' : 'destructive'}>
                        {success ? 'Success' : 'Error'}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={copyUrl}>
                        <Clipboard className="mr-2 size-4" />
                        {copied ? 'Copied' : 'Copy Data URL'}
                    </Button>
                    {hasScreenshot ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                downloadFileFromBase64(
                                    'screenshot.png',
                                    base64,
                                    mediaType
                                )
                            }
                        >
                            <Download className="size-4" />
                        </Button>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {hasScreenshot ? (
                    <>
                        <AIImage
                            alt={`screenshot-${input.url}`}
                            base64={base64}
                            mediaType={mediaType}
                            uint8Array={new Uint8Array()}
                            className="max-h-100 w-full border object-contain"
                        />
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>Content length: {base64.length} chars</span>
                            {width !== undefined && height !== undefined ? (
                                <span>
                                    Viewport: {width}×{height}
                                </span>
                            ) : null}
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-muted-foreground">
                        No screenshot data
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function PdfGeneratorCard({ output, errorText }: CardProps<UrlInput>) {
    if (hasText(errorText)) {
        return <ErrorCard title="PDF Generation Failed" message={errorText} />
    }

    if (!isRecord(output)) {
        return <LoadingCard title="Generating PDF..." />
    }

    const base64 = readString(output, 'pdf') ?? ''
    const mediaType = readString(output, 'mediaType') ?? 'application/pdf'
    const pdfUrl =
        base64.length > 0 ? `data:${mediaType};base64,${base64}` : undefined
    const finalUrl = readString(output, 'finalUrl')
    const outputUrl = readString(output, 'url')
    const byteLength = readNumber(output, 'byteLength')
    const success = readBoolean(output, 'success') === true

    return (
        <Card>
            <CardHeader className="flex items-center justify-between gap-3 pb-3 sm:flex-row">
                <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <FileText className="size-4 text-primary" />
                        PDF Generated
                    </CardTitle>
                    <UrlMeta sourceUrl={outputUrl} finalUrl={finalUrl} />
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={success ? 'secondary' : 'destructive'}>
                        {success ? 'Success' : 'Error'}
                    </Badge>
                    {base64.length > 0 ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                downloadFileFromBase64('page.pdf', base64, mediaType)
                            }
                        >
                            <Download className="size-4" />
                        </Button>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {hasText(pdfUrl) ? (
                    <>
                        <Button
                            variant="outline"
                            className="inline-flex"
                            onClick={() => openInNewTab(pdfUrl)}
                        >
                            <ExternalLink className="mr-2 size-4" />
                            View PDF
                        </Button>
                        <div className="text-xs text-muted-foreground">
                            Size: {formatBytes(byteLength)}
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-muted-foreground">
                        No PDF content
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function BrowserToolCard({
    input,
    output,
    errorText,
}: CardProps<UrlInput>) {
    if (hasText(errorText)) {
        return <ErrorCard title="Browser Tool Failed" message={errorText} />
    }

    if (!isRecord(output)) {
        return <LoadingCard title={`Browsing ${input.url}...`} />
    }

    const previewUrl =
        readString(output, 'previewUrl') ??
        createHtmlPreviewUrl(readString(output, 'html'))
    const outputUrl = readString(output, 'url') ?? input.url
    const finalUrl = readString(output, 'finalUrl')
    const title = readString(output, 'title')
    const contentLength = readNumber(output, 'contentLength')
    const success = readBoolean(output, 'success') === true
    const sections = readSections(output)
    const message = readString(output, 'message') ?? 'No readable content'
    const displayTitle = hasText(title) ? title : 'Browser Result'

    return (
        <Card>
            <CardHeader className="flex items-center justify-between gap-3 pb-3 sm:flex-row">
                <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Globe className="size-4 text-primary" />
                        {displayTitle}
                    </CardTitle>
                    <UrlMeta sourceUrl={outputUrl} finalUrl={finalUrl} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={success ? 'secondary' : 'destructive'}>
                        {success ? 'Loaded' : 'Error'}
                    </Badge>
                    {contentLength !== undefined ? (
                        <Badge variant="outline">{formatBytes(contentLength)}</Badge>
                    ) : null}
                    {hasText(previewUrl) ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openInNewTab(previewUrl)}
                        >
                            <ExternalLink className="size-4" />
                        </Button>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <InlinePreview src={previewUrl} />
                {sections.length > 0 ? (
                    <div className="space-y-2">
                        <div className="text-xs font-medium uppercase text-muted-foreground">
                            Extracted sections
                        </div>
                        <div className="grid gap-2">
                            {sections.map((section, index) => (
                                <div
                                    key={`${section.title}-${index}`}
                                    className="rounded-md border p-3 text-sm"
                                >
                                    <div className="font-medium">{section.title}</div>
                                    <div className="mt-1 text-muted-foreground">
                                        {section.summary}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground">{message}</div>
                )}
            </CardContent>
        </Card>
    )
}

export function ClickAndExtractCard({
    input,
    output,
    errorText,
}: CardProps<ClickAndExtractInput>) {
    if (hasText(errorText)) {
        return <ErrorCard title="Click & Extract Failed" message={errorText} />
    }

    if (!isRecord(output)) {
        return (
            <LoadingCard
                title={`Clicking ${input.clickSelector ?? 'target'} on ${input.url}...`}
            />
        )
    }

    const previewUrl =
        readString(output, 'previewUrl') ??
        createHtmlPreviewUrl(readString(output, 'html'))
    const sourceUrl = readString(output, 'sourceUrl') ?? input.url
    const finalUrl = readString(output, 'finalUrl')
    const success = readBoolean(output, 'success') === true
    const content =
        readString(output, 'content') ?? readString(output, 'message') ?? ''

    return (
        <Card>
            <CardHeader className="flex items-center justify-between gap-3 pb-3 sm:flex-row">
                <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <FileText className="size-4 text-primary" />
                        Extracted Content
                    </CardTitle>
                    <UrlMeta sourceUrl={sourceUrl} finalUrl={finalUrl} />
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={success ? 'secondary' : 'destructive'}>
                        {success ? 'Success' : 'Error'}
                    </Badge>
                    {hasText(previewUrl) ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openInNewTab(previewUrl)}
                        >
                            <ExternalLink className="size-4" />
                        </Button>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <InlinePreview src={previewUrl} />
                {content.length > 0 ? (
                    <CodeBlock code={content} language="html">
                        <CodeBlockCopyButton />
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                                const bytes = new TextEncoder().encode(content)
                                const binaryString = Array.from(bytes, (byte) =>
                                    String.fromCharCode(byte)
                                ).join('')
                                const base64 = btoa(binaryString)
                                downloadFileFromBase64(
                                    'extracted.html',
                                    base64,
                                    'text/html'
                                )
                            }}
                        >
                            <Download className="size-4" />
                        </Button>
                    </CodeBlock>
                ) : (
                    <div className="text-sm text-muted-foreground">No content</div>
                )}
            </CardContent>
        </Card>
    )
}

export function FillFormCard({
    input,
    output,
    errorText,
}: CardProps<UrlInput>) {
    if (hasText(errorText)) {
        return <ErrorCard title="Fill Form Failed" message={errorText} />
    }

    if (!isRecord(output)) {
        return <LoadingCard title={`Filling form on ${input.url}...`} />
    }

    const sourceUrl = readString(output, 'sourceUrl') ?? input.url
    const finalUrl = readString(output, 'finalUrl')
    const previewUrl = readString(output, 'previewUrl') ?? finalUrl
    const message = readString(output, 'message') ?? 'No result available'
    const success = readBoolean(output, 'success') === true

    return (
        <Card>
            <CardHeader className="flex items-center justify-between gap-3 pb-3 sm:flex-row">
                <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <CheckCircle className="size-4 text-primary" />
                        Fill Form
                    </CardTitle>
                    <UrlMeta sourceUrl={sourceUrl} finalUrl={finalUrl} />
                </div>
                <Badge variant={success ? 'secondary' : 'destructive'}>
                    {success ? 'Submitted' : 'Error'}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
                {hasText(previewUrl) ? (
                    <Button
                        variant="outline"
                        className="inline-flex"
                        onClick={() => openInNewTab(previewUrl)}
                    >
                        <ExternalLink className="mr-2 size-4" />
                        Open result page
                    </Button>
                ) : (
                    <div className="text-sm text-muted-foreground">{message}</div>
                )}
            </CardContent>
        </Card>
    )
}

export function GoogleSearchCard({
    input,
    output,
    errorText,
}: CardProps<GoogleSearchInput>) {
    const [query, setQuery] = useState('')

    if (hasText(errorText)) {
        return <ErrorCard title="Search Failed" message={errorText} />
    }

    if (!isRecord(output)) {
        return <LoadingCard title={`Searching for ${input.query}...`} />
    }

    const outputQuery = readString(output, 'query') ?? input.query
    const success = readBoolean(output, 'success') === true
    const results = readSearchResults(output)
    const filtered = hasText(query)
        ? results.filter((result) =>
              `${result.title} ${result.url} ${result.snippet ?? ''}`
                  .toLowerCase()
                  .includes(query.toLowerCase())
          )
        : results

    return (
        <Card>
            <CardHeader className="flex items-center justify-between gap-3 pb-3 sm:flex-row">
                <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Search className="size-4 text-primary" />
                        Search Results
                    </CardTitle>
                    <div className="text-xs text-muted-foreground">
                        Query: {outputQuery}
                    </div>
                </div>
                <Badge variant={success ? 'secondary' : 'destructive'}>
                    {filtered.length} results
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="mb-3 flex items-center gap-2">
                    <Input
                        value={query}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setQuery(e.target.value)
                        }
                        placeholder="Filter results..."
                        className="w-56 text-sm"
                    />
                    <Button size="sm" variant="ghost" onClick={() => setQuery('')}>
                        Clear
                    </Button>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No results</div>
                ) : (
                    <ScrollArea className="h-75 pr-4">
                        <div className="space-y-3">
                            {filtered.map((result, idx) => (
                                <button
                                    type="button"
                                    key={`${result.url}-${idx}`}
                                    className="w-full rounded border p-3 text-left transition-colors hover:bg-muted/30"
                                    onClick={() => openInNewTab(result.url)}
                                >
                                    <div className="text-sm font-medium text-blue-600">
                                        {result.title}
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {result.url}
                                    </div>
                                    {hasText(result.snippet) ? (
                                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                            {result.snippet}
                                        </div>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}

export function MonitorPageCard({
    input,
    output,
    errorText,
}: CardProps<UrlInput>) {
    if (hasText(errorText)) {
        return <ErrorCard title="Monitor Page Failed" message={errorText} />
    }

    if (!isRecord(output)) {
        return <LoadingCard title={`Monitoring ${input.url}...`} />
    }

    const outputUrl = readString(output, 'url') ?? input.url
    const finalUrl = readString(output, 'finalUrl')
    const success = readBoolean(output, 'success') === true
    const changed = readBoolean(output, 'changed') === true
    const checkCount = readNumber(output, 'checkCount') ?? 0

    return (
        <Card>
            <CardHeader className="flex items-center justify-between gap-3 pb-3 sm:flex-row">
                <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Globe className="size-4 text-primary" />
                        Monitor Page
                    </CardTitle>
                    <UrlMeta sourceUrl={outputUrl} finalUrl={finalUrl} />
                </div>
                <Badge
                    variant={changed || !success ? 'destructive' : 'secondary'}
                    className="text-xs"
                >
                    {changed ? 'Changed' : success ? 'No Change' : 'Error'}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                    {changed
                        ? `Page changed after ${checkCount} checks.`
                        : `Page remained stable for ${checkCount} checks.`}
                </div>
                {hasText(finalUrl) ? (
                    <Button
                        variant="outline"
                        className="inline-flex"
                        onClick={() => openInNewTab(finalUrl)}
                    >
                        <ExternalLink className="mr-2 size-4" />
                        Open monitored page
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    )
}
