'use client'

import { useCallback, useState } from 'react'

// Sandbox components
import {
    Sandbox,
    SandboxContent,
    SandboxHeader,
    SandboxTabContent,
    SandboxTabs,
    SandboxTabsBar,
    SandboxTabsList,
    SandboxTabsTrigger,
} from '@/src/components/ai-elements/sandbox'

// File Tree components
import {
    FileTree,
    FileTreeFolder,
    FileTreeFile,
} from '@/src/components/ai-elements/file-tree'

// Terminal components
import {
    Terminal,
    TerminalActions,
    TerminalClearButton,
    TerminalCopyButton,
    TerminalContent,
    TerminalHeader,
    TerminalTitle,
} from '@/src/components/ai-elements/terminal'

// Test Results components
import {
    TestResults,
    TestResultsContent,
    TestResultsDuration,
    TestResultsHeader,
    TestResultsSummary,
    TestSuite,
    TestSuiteContent,
    TestSuiteName,
    TestSuiteStats,
} from '@/src/components/ai-elements/test-results'

// Schema Display components
import { SchemaDisplay } from '@/src/components/ai-elements/schema-display'

// Stack Trace components
import {
    StackTrace,
    StackTraceActions,
    StackTraceContent,
    StackTraceCopyButton,
    StackTraceErrorMessage,
    StackTraceErrorType,
    StackTraceFrames,
    StackTraceHeader,
} from '@/src/components/ai-elements/stack-trace'

// Code Block
import { CodeBlock } from '@/src/components/ai-elements/code-block'

// Package Info components
import {
    PackageInfo,
    PackageInfoHeader,
    PackageInfoName,
    PackageInfoVersion,
    PackageInfoChangeType,
    PackageInfoDescription,
    PackageInfoContent,
    PackageInfoDependencies,
    PackageInfoDependency,
} from '@/src/components/ai-elements/package-info'

// Environment Variables components
import {
    EnvironmentVariables,
    EnvironmentVariablesHeader,
    EnvironmentVariablesTitle,
    EnvironmentVariablesToggle,
    EnvironmentVariablesContent,
    EnvironmentVariable,
    EnvironmentVariableName,
    EnvironmentVariableValue,
    EnvironmentVariableCopyButton,
    EnvironmentVariableRequired,
} from '@/src/components/ai-elements/environment-variables'

// JSX Preview components
import {
    JSXPreview,
    JSXPreviewContent,
    JSXPreviewError,
} from '@/src/components/ai-elements/jsx-preview'

// UI components
import { Badge } from '@/ui/badge'
import { cn } from '@/lib/utils'

interface SandboxFile {
    path: string
    name: string
    content: string
    language?: string
}

interface SandboxFolder {
    path: string
    name: string
    children: Array<SandboxFile | SandboxFolder>
}

type TestStatus = 'passed' | 'failed' | 'skipped' | 'running'

interface SandboxTestCase {
    id: string
    name: string
    status: TestStatus
    duration?: number
    error?: string
}

interface SandboxTestSuite {
    name: string
    status: TestStatus
    tests: SandboxTestCase[]
}

interface SandboxSchema {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    path: string
    description?: string
    parameters?: Array<{
        name: string
        type: string
        required?: boolean
        description?: string
        location?: 'path' | 'query' | 'header'
    }>
    requestBody?: Array<{
        name: string
        type: string
        required?: boolean
        description?: string
    }>
    responseBody?: Array<{
        name: string
        type: string
        required?: boolean
        description?: string
    }>
}

interface PackageDependency {
    name: string
    version?: string
    currentVersion?: string
    newVersion?: string
    changeType?: 'major' | 'minor' | 'patch' | 'added' | 'removed'
}

interface PackageData {
    name: string
    version?: string
    currentVersion?: string
    newVersion?: string
    changeType?: 'major' | 'minor' | 'patch' | 'added' | 'removed'
    description?: string
    dependencies?: PackageDependency[]
}

interface EnvironmentVar {
    name: string
    value: string
    required?: boolean
    description?: string
}

interface JSXPreviewData {
    jsx: string
    isStreaming?: boolean
    components?: Record<string, React.ComponentType>
    bindings?: Record<string, unknown>
}

interface AgentSandboxData {
    title?: string
    description?: string
    files?: Array<SandboxFile | SandboxFolder>
    activeFile?: string
    terminalOutput?: string
    terminalIsStreaming?: boolean
    testSuites?: SandboxTestSuite[]
    testSummary?: {
        passed: number
        failed: number
        skipped: number
        total: number
        duration?: number
    }
    schema?: SandboxSchema
    stackTrace?: string
    errorType?: string
    errorMessage?: string
    preview?: string
    // New fields
    package?: PackageData
    packages?: PackageData[]
    environmentVariables?: EnvironmentVar[]
    jsxPreview?: JSXPreviewData
}

interface AgentSandboxProps {
    data?: AgentSandboxData | Record<string, unknown>
    className?: string
}

function isFile(item: SandboxFile | SandboxFolder): item is SandboxFile {
    return 'content' in item && !('children' in item)
}

function isFolder(item: SandboxFile | SandboxFolder): item is SandboxFolder {
    return 'children' in item
}

export function AgentSandbox({ data, className }: AgentSandboxProps) {
    const getInitialSelectedFile = (): string | undefined => {
        if (data && typeof data === 'object' && 'activeFile' in data) {
            const { activeFile } = data as Record<string, unknown>
            if (typeof activeFile === 'string') {
                return activeFile
            }
        }
        return undefined
    }

    const [selectedFile, setSelectedFile] = useState<string | undefined>(
        getInitialSelectedFile()
    )
    const [activeTab, setActiveTab] = useState<string>('code')

    const sandboxData: AgentSandboxData | undefined =
        data && typeof data === 'object'
            ? (data as AgentSandboxData)
            : undefined

    // Accept either an event (from the UI) or a plain path string.
    const handleFileSelect = useCallback(
        (eventOrPath: React.SyntheticEvent<HTMLDivElement, Event> | string) => {
            let path: string | undefined
            if (typeof eventOrPath === 'string') {
                path = eventOrPath
            } else {
                // try common attribute used by file items
                path =
                    (eventOrPath.currentTarget &&
                        eventOrPath.currentTarget.getAttribute('data-path')) ??
                    undefined
            }
            if (typeof path === 'string') {
                setSelectedFile(path)
                setActiveTab('code')
            }
        },
        []
    )

    const files = sandboxData?.files

    const getFileContent = useCallback(
        (path: string): SandboxFile | undefined => {
            if (!files?.length) {
                return undefined
            }

            const findFile = (
                items: Array<SandboxFile | SandboxFolder>,
                targetPath: string
            ): SandboxFile | undefined => {
                for (const item of items) {
                    if (isFile(item) && item.path === targetPath) {
                        return item
                    }
                    if (isFolder(item) && item.children) {
                        const found = findFile(item.children, targetPath)
                        if (found) {
                            return found
                        }
                    }
                }
                return undefined
            }

            return findFile(files, path)
        },
        [files]
    )

    const selectedFileData = selectedFile
        ? getFileContent(selectedFile)
        : undefined

    const hasTerminal = sandboxData?.terminalOutput !== undefined
    const hasTests =
        sandboxData?.testSuites !== undefined &&
        sandboxData.testSuites.length > 0
    const hasSchema = sandboxData?.schema !== undefined
    const hasStackTrace = sandboxData?.stackTrace !== undefined
    const hasPreview = sandboxData?.preview !== undefined
    const hasPackage =
        sandboxData?.package !== undefined ||
        (sandboxData?.packages !== undefined && sandboxData.packages.length > 0)
    const hasEnvVars =
        sandboxData?.environmentVariables !== undefined &&
        sandboxData.environmentVariables.length > 0
    const hasJSXPreview = sandboxData?.jsxPreview !== undefined

    const renderFolder = (folder: SandboxFolder) => (
        <FileTreeFolder key={folder.path} path={folder.path} name={folder.name}>
            {folder.children.map((child) =>
                isFolder(child) ? (
                    renderFolder(child)
                ) : (
                    <FileTreeFile
                        key={child.path}
                        path={child.path}
                        name={child.name}
                        data-path={child.path}
                        aria-selected={selectedFile === child.path}
                        onClick={() => handleFileSelect(child.path)}
                    />
                )
            )}
        </FileTreeFolder>
    )

    const renderPackage = (pkg: PackageData, index: number) => (
        <div key={`${pkg.name}-${index}`} className="mb-3">
            <PackageInfo
                name={pkg.name}
                currentVersion={pkg.currentVersion ?? pkg.version}
                newVersion={pkg.newVersion}
                changeType={pkg.changeType}
            >
                <PackageInfoHeader>
                    <PackageInfoName />
                    {pkg.changeType && <PackageInfoChangeType />}
                </PackageInfoHeader>
                <PackageInfoVersion />
                {pkg.description && (
                    <PackageInfoDescription>
                        {pkg.description}
                    </PackageInfoDescription>
                )}
                {pkg.dependencies && pkg.dependencies.length > 0 && (
                    <PackageInfoContent>
                        <PackageInfoDependencies>
                            {pkg.dependencies.map((dep) => (
                                <PackageInfoDependency
                                    key={dep.name}
                                    name={dep.name}
                                    version={dep.version}
                                />
                            ))}
                        </PackageInfoDependencies>
                    </PackageInfoContent>
                )}
            </PackageInfo>
        </div>
    )

    return (
        <div className={cn('w-full', className)}>
            <Sandbox>
                <SandboxHeader
                    title={sandboxData?.title ?? 'Code Sandbox'}
                    state={hasStackTrace ? 'output-error' : 'output-available'}
                />
                <SandboxContent>
                    <div className="grid h-125 grid-cols-[250px_1fr]">
                        {/* File Tree Sidebar */}
                        {sandboxData?.files && sandboxData.files.length > 0 ? (
                            <div className="border-r">
                                <FileTree
                                    selectedPath={selectedFile}
                                    // FileTree may call this with either an event or a path
                                    onSelect={
                                        handleFileSelect as unknown as (
                                            eventOrPath:
                                                | React.SyntheticEvent<
                                                      HTMLDivElement,
                                                      Event
                                                  >
                                                | string
                                        ) => void
                                    }
                                    defaultExpanded={new Set(['/'])}
                                >
                                    {sandboxData.files.map((item) =>
                                        isFolder(item) ? (
                                            renderFolder(item)
                                        ) : (
                                            <FileTreeFile
                                                key={item.path}
                                                path={item.path}
                                                name={item.name}
                                                data-path={item.path}
                                                aria-selected={
                                                    selectedFile === item.path
                                                }
                                                onClick={() =>
                                                    handleFileSelect(item.path)
                                                }
                                            />
                                        )
                                    )}
                                </FileTree>
                            </div>
                        ) : (
                            <div className="border-r px-4 py-6 text-sm text-muted-foreground">
                                No files available
                            </div>
                        )}

                        {/* Main content */}
                        <div className="flex flex-col">
                            <SandboxTabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                            >
                                <div className="flex items-center justify-between px-4">
                                    <SandboxTabsBar>
                                        <SandboxTabsList>
                                            <SandboxTabsTrigger value="code">
                                                Code
                                            </SandboxTabsTrigger>
                                            {hasPreview && (
                                                <SandboxTabsTrigger value="preview">
                                                    Preview
                                                </SandboxTabsTrigger>
                                            )}
                                            {hasJSXPreview && (
                                                <SandboxTabsTrigger value="jsx">
                                                    JSX
                                                </SandboxTabsTrigger>
                                            )}
                                            {hasTests && (
                                                <SandboxTabsTrigger value="tests">
                                                    Tests
                                                </SandboxTabsTrigger>
                                            )}
                                            {hasTerminal && (
                                                <SandboxTabsTrigger value="terminal">
                                                    Terminal
                                                </SandboxTabsTrigger>
                                            )}
                                            {hasSchema && (
                                                <SandboxTabsTrigger value="schema">
                                                    Schema
                                                </SandboxTabsTrigger>
                                            )}
                                            {hasStackTrace && (
                                                <SandboxTabsTrigger value="stacktrace">
                                                    Stack Trace
                                                </SandboxTabsTrigger>
                                            )}
                                            {hasPackage && (
                                                <SandboxTabsTrigger value="packages">
                                                    Packages
                                                </SandboxTabsTrigger>
                                            )}
                                            {hasEnvVars && (
                                                <SandboxTabsTrigger value="env">
                                                    Env Vars
                                                </SandboxTabsTrigger>
                                            )}
                                        </SandboxTabsList>
                                    </SandboxTabsBar>

                                    <div className="flex items-center space-x-2">
                                        {sandboxData?.testSummary && (
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {sandboxData.testSummary.passed}
                                                /{sandboxData.testSummary.total}{' '}
                                                passed
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Code tab */}
                                <SandboxTabContent
                                    value="code"
                                    className="h-full overflow-auto"
                                >
                                    <div className="p-4 h-full">
                                        {selectedFileData ? (
                                            <>
                                                <div className="mb-3 flex items-center justify-between">
                                                    <div className="text-sm font-medium">
                                                        {selectedFileData.name}
                                                    </div>
                                                </div>
                                                <div className="h-[calc(100%-48px)] overflow-auto rounded-md border">
                                                    <CodeBlock
                                                        code={
                                                            selectedFileData.content
                                                        }
                                                        language={(() => {
                                                            const l =
                                                                selectedFileData.language
                                                                    ?.toLowerCase()
                                                                    .trim()
                                                            if (!l!) {
                                                                return 'js'
                                                            }
                                                            if (l === 'tsx') {
                                                                return 'tsx'
                                                            }
                                                            if (
                                                                l === 'ts' ||
                                                                l ===
                                                                    'typescript'
                                                            ) {
                                                                return 'ts'
                                                            }
                                                            if (
                                                                l === 'js' ||
                                                                l ===
                                                                    'javascript'
                                                            ) {
                                                                return 'js'
                                                            }
                                                            if (l === 'jsx') {
                                                                return 'jsx'
                                                            }
                                                            if (l === 'json') {
                                                                return 'json'
                                                            }
                                                            if (
                                                                l === 'bash' ||
                                                                l === 'sh' ||
                                                                l === 'shell'
                                                            ) {
                                                                return 'bash'
                                                            }
                                                            if (l === 'html') {
                                                                return 'html'
                                                            }
                                                            if (l === 'css') {
                                                                return 'css'
                                                            }
                                                            if (
                                                                l ===
                                                                    'python' ||
                                                                l === 'py'
                                                            ) {
                                                                return 'python'
                                                            }
                                                            if (l === 'java') {
                                                                return 'java'
                                                            }
                                                            if (
                                                                l === 'c#' ||
                                                                l === 'csharp'
                                                            ) {
                                                                return 'csharp'
                                                            }
                                                            if (
                                                                l === 'c++' ||
                                                                l === 'cpp'
                                                            ) {
                                                                return 'cpp'
                                                            }
                                                            if (
                                                                l === 'ruby' ||
                                                                l === 'rb'
                                                            ) {
                                                                return 'ruby'
                                                            }
                                                            if (
                                                                l === 'go' ||
                                                                l === 'golang'
                                                            ) {
                                                                return 'go'
                                                            }
                                                            if (l === 'rust') {
                                                                return 'rust'
                                                            }
                                                            return 'js'
                                                        })()}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                                Select a file to view its
                                                contents
                                            </div>
                                        )}
                                    </div>
                                </SandboxTabContent>

                                {/* Preview tab */}
                                {hasPreview && (
                                    <SandboxTabContent
                                        value="preview"
                                        className="h-full"
                                    >
                                        <div className="h-full w-full border-t">
                                            <iframe
                                                title="preview"
                                                srcDoc={
                                                    sandboxData?.preview ?? ''
                                                }
                                                className="h-full w-full"
                                            />
                                        </div>
                                    </SandboxTabContent>
                                )}

                                {/* JSX Preview tab */}
                                {hasJSXPreview && sandboxData.jsxPreview && (
                                    <SandboxTabContent
                                        value="jsx"
                                        className="h-full overflow-auto"
                                    >
                                        <div className="p-4 h-full">
                                            <JSXPreview
                                                jsx={sandboxData.jsxPreview.jsx}
                                                isStreaming={
                                                    sandboxData.jsxPreview
                                                        .isStreaming
                                                }
                                                components={
                                                    sandboxData.jsxPreview
                                                        .components
                                                }
                                                bindings={
                                                    sandboxData.jsxPreview
                                                        .bindings
                                                }
                                            >
                                                <JSXPreviewContent className="rounded-md border p-4" />
                                                <JSXPreviewError className="mt-2" />
                                            </JSXPreview>
                                        </div>
                                    </SandboxTabContent>
                                )}

                                {/* Tests tab */}
                                {hasTests && (
                                    <SandboxTabContent
                                        value="tests"
                                        className="h-full overflow-auto"
                                    >
                                        <div className="h-full p-4">
                                            <TestResults>
                                                <TestResultsHeader>
                                                    <TestResultsSummary>
                                                        {sandboxData?.testSummary
                                                            ? `${sandboxData.testSummary.passed} passed • ${sandboxData.testSummary.failed} failed`
                                                            : 'Test Results'}
                                                    </TestResultsSummary>
                                                    <TestResultsDuration>
                                                        {sandboxData
                                                            ?.testSummary
                                                            ?.duration
                                                            ? `${sandboxData.testSummary.duration}ms`
                                                            : undefined}
                                                    </TestResultsDuration>
                                                </TestResultsHeader>

                                                <TestResultsContent>
                                                    {sandboxData?.testSuites?.map(
                                                        (suite) => (
                                                            <TestSuite
                                                                key={suite.name}
                                                                name={''}
                                                                status={
                                                                    'passed'
                                                                }
                                                            >
                                                                <TestSuiteName>
                                                                    {suite.name}
                                                                </TestSuiteName>
                                                                <TestSuiteStats>
                                                                    {
                                                                        suite
                                                                            .tests
                                                                            .length
                                                                    }{' '}
                                                                    tests
                                                                </TestSuiteStats>
                                                                <TestSuiteContent>
                                                                    {suite.tests.map(
                                                                        (t) => (
                                                                            <div
                                                                                key={
                                                                                    t.id
                                                                                }
                                                                                className="mb-2 rounded border px-3 py-2"
                                                                            >
                                                                                <div className="flex justify-between">
                                                                                    <div className="text-sm font-medium">
                                                                                        {
                                                                                            t.name
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        {
                                                                                            t.status
                                                                                        }
                                                                                    </div>
                                                                                </div>
                                                                                {Boolean(
                                                                                    t.error
                                                                                ) && (
                                                                                    <pre className="mt-2 text-xs text-red-600">
                                                                                        {
                                                                                            t.error
                                                                                        }
                                                                                    </pre>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </TestSuiteContent>
                                                            </TestSuite>
                                                        )
                                                    )}
                                                </TestResultsContent>
                                            </TestResults>
                                        </div>
                                    </SandboxTabContent>
                                )}

                                {/* Terminal tab */}
                                {hasTerminal && (
                                    <SandboxTabContent
                                        value="terminal"
                                        className="h-full"
                                    >
                                        <Terminal
                                            className="h-full flex flex-col"
                                            output={''}
                                        >
                                            <TerminalHeader>
                                                <TerminalTitle>
                                                    Terminal
                                                </TerminalTitle>
                                                <TerminalActions>
                                                    <TerminalCopyButton
                                                        onClick={() => {
                                                            if (
                                                                sandboxData?.terminalOutput
                                                            ) {
                                                                void navigator.clipboard?.writeText(
                                                                    sandboxData.terminalOutput
                                                                )
                                                            }
                                                        }}
                                                    />
                                                    <TerminalClearButton
                                                        onClick={() => {
                                                            /* no-op for now; parent can control */
                                                        }}
                                                    />
                                                </TerminalActions>
                                            </TerminalHeader>
                                            <TerminalContent>
                                                <pre className="whitespace-pre-wrap wrap-break-word text-sm">
                                                    {sandboxData?.terminalOutput ??
                                                        ''}
                                                </pre>
                                            </TerminalContent>
                                        </Terminal>
                                    </SandboxTabContent>
                                )}

                                {/* Schema tab */}
                                {hasSchema && (
                                    <SandboxTabContent
                                        value="schema"
                                        className="h-full overflow-auto"
                                    >
                                        <div className="p-4">
                                            <SchemaDisplay
                                                {...sandboxData.schema!}
                                            />
                                        </div>
                                    </SandboxTabContent>
                                )}

                                {/* Stack trace tab */}
                                {hasStackTrace && (
                                    <SandboxTabContent
                                        value="stacktrace"
                                        className="h-full"
                                    >
                                        <StackTrace trace={''}>
                                            <StackTraceHeader>
                                                <StackTraceErrorType>
                                                    {sandboxData?.errorType ??
                                                        'Error'}
                                                </StackTraceErrorType>
                                                <StackTraceErrorMessage>
                                                    {sandboxData?.errorMessage ??
                                                        ''}
                                                </StackTraceErrorMessage>
                                                <StackTraceActions>
                                                    <StackTraceCopyButton
                                                        onClick={() => {
                                                            void navigator.clipboard?.writeText(
                                                                sandboxData?.stackTrace ??
                                                                    ''
                                                            )
                                                        }}
                                                    />
                                                </StackTraceActions>
                                            </StackTraceHeader>
                                            <StackTraceContent>
                                                <StackTraceFrames>
                                                    <pre className="text-sm">
                                                        {sandboxData?.stackTrace ??
                                                            ''}
                                                    </pre>
                                                </StackTraceFrames>
                                            </StackTraceContent>
                                        </StackTrace>
                                    </SandboxTabContent>
                                )}

                                {/* Packages tab */}
                                {hasPackage && (
                                    <SandboxTabContent
                                        value="packages"
                                        className="h-full overflow-auto"
                                    >
                                        <div className="p-4 space-y-4">
                                            {sandboxData?.packages?.map(
                                                (pkg, index) =>
                                                    renderPackage(pkg, index)
                                            )}
                                            {sandboxData?.package &&
                                                !sandboxData.packages &&
                                                renderPackage(
                                                    sandboxData.package,
                                                    0
                                                )}
                                        </div>
                                    </SandboxTabContent>
                                )}

                                {/* Environment Variables tab */}
                                {hasEnvVars &&
                                    sandboxData.environmentVariables && (
                                        <SandboxTabContent
                                            value="env"
                                            className="h-full overflow-auto"
                                        >
                                            <div className="p-4">
                                                <EnvironmentVariables>
                                                    <EnvironmentVariablesHeader>
                                                        <EnvironmentVariablesTitle>
                                                            Environment
                                                            Variables
                                                        </EnvironmentVariablesTitle>
                                                        <EnvironmentVariablesToggle />
                                                    </EnvironmentVariablesHeader>
                                                    <EnvironmentVariablesContent>
                                                        {sandboxData.environmentVariables.map(
                                                            (envVar) => (
                                                                <EnvironmentVariable
                                                                    key={
                                                                        envVar.name
                                                                    }
                                                                    name={
                                                                        envVar.name
                                                                    }
                                                                    value={
                                                                        envVar.value
                                                                    }
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <EnvironmentVariableName />
                                                                        {envVar.required && (
                                                                            <EnvironmentVariableRequired />
                                                                        )}
                                                                        {envVar.description && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {
                                                                                    envVar.description
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <EnvironmentVariableValue />
                                                                        <EnvironmentVariableCopyButton />
                                                                    </div>
                                                                </EnvironmentVariable>
                                                            )
                                                        )}
                                                    </EnvironmentVariablesContent>
                                                </EnvironmentVariables>
                                            </div>
                                        </SandboxTabContent>
                                    )}
                            </SandboxTabs>
                        </div>
                    </div>
                </SandboxContent>
            </Sandbox>
        </div>
    )
}

export default AgentSandbox
