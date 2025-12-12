'use client'

import { clsx } from 'clsx'

export interface ExplorerFile {
    id: string
    label: string
    language: string
}

interface MonacoExplorerProps {
    files: ExplorerFile[]
    activeId: string
    onSelect: (_id: string) => void
    onNewFile?: () => void
}

export default function MonacoExplorer({ files, activeId, onSelect, onNewFile }: MonacoExplorerProps) {
    return (
        <div className="flex h-full w-full flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                <span>Explorer</span>
                {onNewFile ? (
                    <button
                        type="button"
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground/80 shadow-sm hover:bg-muted"
                        onClick={onNewFile}
                    >
                        New
                    </button>
                ) : null}
            </div>

            <div className="flex-1 overflow-auto p-2">
                {files.map((file) => (
                    <button
                        key={file.id}
                        type="button"
                        onClick={() => onSelect(file.id)}
                        className={clsx(
                            'flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition',
                            activeId === file.id
                                ? 'bg-muted text-foreground'
                                : 'text-foreground/70 hover:bg-muted/60 hover:text-foreground'
                        )}
                        aria-label={`Open ${file.label}`}
                    >
                        <span className="truncate">{file.label}</span>
                        <span className="ml-3 shrink-0 text-[10px] uppercase tracking-wide text-foreground/50">
                            {file.language}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}
