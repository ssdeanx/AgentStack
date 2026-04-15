'use client'

import type { ReactNode } from 'react'

import { ChatSettingsShell } from '../components/chat-settings-shell'

const adminSettingsSections = [
    {
        href: '/chat/admin',
        title: 'Overview',
        description: 'Start from the admin summary and branch into runtime or user operations.',
    },
    {
        href: '/chat/admin/runtime',
        title: 'Runtime',
        description: 'Inspect active auth/runtime context and connected model providers.',
    },
    {
        href: '/chat/admin/users',
        title: 'Users',
        description: 'Search users, change roles, moderate access, impersonate, and revoke sessions.',
    },
] as const

export default function AdminSettingsLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <ChatSettingsShell
            title="Admin settings"
            description="Operate Better Auth administration and live Mastra runtime context from focused admin routes."
            sections={[...adminSettingsSections]}
        >
            {children}
        </ChatSettingsShell>
    )
}
