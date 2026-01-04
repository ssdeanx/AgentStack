import type { ReactNode } from 'react'
import { AdminSidebar } from './_components/admin-sidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-screen bg-background">
            <AdminSidebar />
            <main className="flex min-w-0 flex-1 flex-col">{children}</main>
        </div>
    )
}
