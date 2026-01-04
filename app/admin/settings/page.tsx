import { AdminPageShell } from '../_components/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'

export default function AdminSettingsPage() {
    return (
        <AdminPageShell title="Settings" description="Client-side preferences and session controls.">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Session</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This Admin area is protected by a simple dev cookie. When you wire real auth, we’ll replace this
                        with a server-set, httpOnly session.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Identity</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Chat/Network/Workflow UI now uses a generated per-browser `userId` and per-surface IDs (thread/run)
                        instead of hardcoded values.
                    </CardContent>
                </Card>
            </div>
        </AdminPageShell>
    )
}
