'use client'

import type { ReactNode } from 'react'

import { ChatSettingsShell } from '../components/chat-settings-shell'

const userSettingsSections = [
    {
        href: '/chat/user',
        title: 'Overview',
        description: 'Start from the account summary and jump to the right settings surface.',
    },
    {
        href: '/chat/user/profile',
        title: 'Profile',
        description: 'Edit your name, username, and avatar identity.',
    },
    {
        href: '/chat/user/security',
        title: 'Security',
        description: 'Change your password, send resets, and manage sign-out posture.',
    },
    {
        href: '/chat/user/sessions',
        title: 'Sessions',
        description: 'Inspect active devices and revoke live sessions.',
    },
    {
        href: '/chat/user/api-keys',
        title: 'API keys',
        description: 'Issue, rotate, and revoke account-scoped API keys.',
    },
    {
        href: '/chat/user/danger-zone',
        title: 'Danger zone',
        description: 'Handle irreversible account deletion controls.',
    },
] as const

export default function UserSettingsLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <ChatSettingsShell
            title="User settings"
            description="Manage your account profile, security, sessions, and API keys from focused route-level settings pages."
            sections={[...userSettingsSections]}
        >
            {children}
        </ChatSettingsShell>
    )
}
