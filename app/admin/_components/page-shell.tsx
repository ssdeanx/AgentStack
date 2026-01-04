import type { ReactNode } from 'react'

export function AdminPageShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b bg-background/60 px-6 py-5">
                <h1 className="text-xl font-semibold">{title}</h1>
                {description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            <div className="flex-1 overflow-auto p-6">{children}</div>
        </div>
    )
}
