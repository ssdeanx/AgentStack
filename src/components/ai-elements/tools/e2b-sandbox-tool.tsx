'use client'

import { Badge } from '@/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Textarea } from '@/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select'
import {
    FileText,
    Folder,
    Terminal,
    Code,
    Play,
    Upload,
    Download,
    Trash2,
    Eye,
    HardDrive,
} from 'lucide-react'
import type { E2bSandboxTool } from './types'
import { CodeBlock } from '../code-block'

interface E2bSandboxToolProps {
    toolCallId: string
    input: E2bSandboxTool['input']
    output?: E2bSandboxTool['output']
    errorText?: string
}

export function E2bSandboxTool({
    input,
    output,
    errorText,
}: E2bSandboxToolProps) {
    if (errorText) {
        return (
            <div className="space-y-4">
                <Card className="border-destructive/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Terminal className="size-4 text-destructive" />
                            Sandbox Operation Failed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-destructive">
                            {errorText}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!output) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Terminal className="size-4 animate-pulse" />
                        Executing Sandbox Operation...
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">
                        Running {input.action} operation in E2B sandbox
                    </div>
                </CardContent>
            </Card>
        )
    }

    const { action, sandboxId } = input
    const { result } = output

    return (
        <div className="space-y-4">
            {/* Success Header */}
            <Card className="border-green-500/20 bg-green-500/5">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Terminal className="size-4 text-green-600" />
                        Sandbox Operation Completed
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                        <Badge variant="secondary" className="text-green-700">
                            {action}
                        </Badge>
                        <Badge variant="secondary" className="text-blue-700">
                            Sandbox: {sandboxId?.slice(0, 8)}...
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Result Display */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Operation Result</CardTitle>
                </CardHeader>
                <CardContent>
                    {action === 'createSandbox' && result?.sandboxId && (
                        <div className="space-y-2">
                            <div className="text-sm">
                                <span className="font-medium">Sandbox ID:</span>{' '}
                                {result.sandboxId}
                            </div>
                            <div className="text-sm">
                                <span className="font-medium">Status:</span>{' '}
                                Ready for operations
                            </div>
                        </div>
                    )}

                    {action === 'runCode' && result?.execution && (
                        <div className="space-y-4">
                            <div className="text-sm">
                                <span className="font-medium">Language:</span>{' '}
                                {result.execution.language || 'python'}
                            </div>
                            <div className="text-sm">
                                <span className="font-medium">Exit Code:</span>{' '}
                                {result.execution.exitCode}
                            </div>
                            {result.execution.stdout && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">
                                        Output:
                                    </div>
                                    <CodeBlock
                                        code={result.execution.stdout}
                                        language="text"
                                    />
                                </div>
                            )}
                            {result.execution.stderr && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-destructive">
                                        Errors:
                                    </div>
                                    <CodeBlock
                                        code={result.execution.stderr}
                                        language="text"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {(action === 'readFile' || action === 'writeFile') &&
                        result?.content && (
                            <div className="space-y-2">
                                <div className="text-sm">
                                    <span className="font-medium">File:</span>{' '}
                                    {result.path}
                                </div>
                                <div className="text-sm font-medium">
                                    Content:
                                </div>
                                <CodeBlock
                                    code={result.content}
                                    language="text"
                                />
                            </div>
                        )}

                    {action === 'listFiles' && result?.files && (
                        <div className="space-y-2">
                            <div className="text-sm">
                                <span className="font-medium">Directory:</span>{' '}
                                {result.path}
                            </div>
                            <div className="text-sm">
                                <span className="font-medium">
                                    Files ({result.files.length}):
                                </span>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {result.files.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        {file.isDirectory ? (
                                            <Folder className="size-3 text-blue-600" />
                                        ) : (
                                            <FileText className="size-3 text-gray-600" />
                                        )}
                                        <span>{file.name}</span>
                                        <span className="text-muted-foreground">
                                            ({file.path})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {action === 'runCommand' && result && (
                        <div className="space-y-4">
                            <div className="text-sm">
                                <span className="font-medium">Command:</span>{' '}
                                {result.command}
                            </div>
                            <div className="text-sm">
                                <span className="font-medium">Exit Code:</span>{' '}
                                {result.exitCode}
                            </div>
                            <div className="text-sm">
                                <span className="font-medium">
                                    Execution Time:
                                </span>{' '}
                                {result.executionTime}ms
                            </div>
                            {result.stdout && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">
                                        Output:
                                    </div>
                                    <CodeBlock
                                        code={result.stdout}
                                        language="bash"
                                    />
                                </div>
                            )}
                            {result.stderr && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-destructive">
                                        Errors:
                                    </div>
                                    <CodeBlock
                                        code={result.stderr}
                                        language="bash"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Default result display */}
                    {result &&
                        typeof result === 'object' &&
                        !result.hasOwnProperty('execution') &&
                        !result.hasOwnProperty('content') &&
                        !result.hasOwnProperty('files') &&
                        !result.hasOwnProperty('command') && (
                            <CodeBlock
                                code={JSON.stringify(result, null, 2)}
                                language="json"
                            />
                        )}
                </CardContent>
            </Card>
        </div>
    )
}
