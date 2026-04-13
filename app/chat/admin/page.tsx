import { ChatPageShell } from '../components/chat-page-shell'
import { MainSidebar } from '../components/main-sidebar'
import { AdminSettingsPanel } from './_components/admin-management-panel'

/**
 * Admin settings page for chat operators.
 */
export default function AdminPage() {
    return (
        <ChatPageShell
            title="Admin settings"
            description="Manage the chat admin console, future moderation tools, and access policies."
            sidebar={<MainSidebar />}
        >
            <AdminSettingsPanel />
        </ChatPageShell>
    )
}
