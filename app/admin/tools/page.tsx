import { AdminPageShell } from '../_components/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'

export default function AdminToolsPage() {
    return (
        <AdminPageShell
            title="Tools"
            description="Tools run inside Mastra agents. This section is a starting point for tool discovery and settings."
        >
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Tool discovery</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        For now, tools are documented and used via agents. Next steps here are to add a local tool registry
                        (or read descriptions directly from the tool definitions) without relying on the HTTP API.
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Observability</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Tool calls already emit `tool-*` and `data-tool-*` parts (per Mastra AI SDK UI docs). We can surface
                        progress events and recent tool runs here next.
                    </CardContent>
                </Card>
            </div>
        </AdminPageShell>
    )
}
