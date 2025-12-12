'use client'

import type { Dispatch, SetStateAction } from 'react'
import { clsx } from 'clsx'

export type BottomPanelTabId = 'terminal' | 'problems'

interface MonacoBottomPanelProps {
    activeTab: BottomPanelTabId
    onTabChange: Dispatch<SetStateAction<BottomPanelTabId>>
    terminalLines: string[]
    problems: Array<{ message: string; severity: 'error' | 'warning' | 'info' }>
}

export default function MonacoBottomPanel({
    activeTab,
    onTabChange,
    terminalLines,
    problems,
}: MonacoBottomPanelProps) {
    return (
        <div className="flex h-full w-full flex-col border-t border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-2 py-1 text-xs">
                {(
                    [
                        { id: 'terminal' as const, label: 'Terminal' },
                        { id: 'problems' as const, label: 'Problems' },
                    ]
                ).map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={clsx(
                            'rounded-md px-3 py-1 transition',
                            activeTab === tab.id
                                ? 'bg-muted text-foreground'
                                : 'text-foreground/60 hover:bg-muted/60 hover:text-foreground'
                        )}
                        onClick={() => onTabChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-auto">
                {activeTab === 'terminal' ? (
                    <pre className="whitespace-pre-wrap px-3 py-2 font-mono text-xs text-foreground/80">
                        {terminalLines.length > 0 ? terminalLines.join('\n') : 'No output yet.'}
                    </pre>
                ) : (
                    <div className="flex flex-col gap-2 px-3 py-2 text-xs">
                        {problems.length > 0 ? (
                            problems.map((problem, idx) => (
                                <div
                                    key={`${problem.severity}-${idx}`}
                                    className={clsx(
                                        'rounded-md border px-2 py-1',
                                        problem.severity === 'error'
                                            ? 'border-red-500/40 bg-red-500/10 text-red-100'
                                            : problem.severity === 'warning'
                                                ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100'
                                                : 'border-border bg-muted/40 text-foreground/80'
                                    )}
                                >
                                    <span className="mr-2 font-semibold uppercase">{problem.severity}</span>
                                    <span>{problem.message}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-foreground/60">No problems detected.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
