'use client'

interface MonacoRightPanelProps {
    title?: string
    children?: React.ReactNode
}

export default function MonacoRightPanel({ title = 'Panel', children }: MonacoRightPanelProps) {
    return (
        <div className="flex h-full w-full flex-col border-l border-border bg-card">
            <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                {title}
            </div>
            <div className="flex-1 overflow-auto p-3 text-sm text-foreground/70">
                {children ?? (
                    <div className="space-y-2">
                        <div className="text-foreground/80">Workspace</div>
                        <div className="text-foreground/60">
                            This area can show outline, search results, or settings.
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
