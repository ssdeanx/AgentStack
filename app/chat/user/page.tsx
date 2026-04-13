import { ChatPageShell } from '../components/chat-page-shell'
import { MainSidebar } from '../components/main-sidebar'
import { UserSettingsPanel } from './_components/user-settings-panel'

/**
 * User settings page for the signed-in chat account.
 */
export default function UserPage() {
    return (
        <ChatPageShell
            title="User settings"
            description="Update your chat account, preferences, and future security options."
            sidebar={<MainSidebar />}
        >
            <UserSettingsPanel />
        </ChatPageShell>
    )
}
