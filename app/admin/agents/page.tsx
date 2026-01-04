import { AdminPageShell } from '../_components/page-shell'
import { listAgents } from '../config/registry'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'

export default function AdminAgentsPage() {
    const agents = listAgents()

    return (
        <AdminPageShell title="Agents" description="All agents configured for Chat + routing/coordination.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {agents.map((a) => (
                    <Card key={a.id}>
                        <CardHeader>
                            <CardTitle className="text-base">{a.name}</CardTitle>
                            <div className="text-xs text-muted-foreground">{a.id}</div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">{a.description}</CardContent>
                    </Card>
                ))}
            </div>
        </AdminPageShell>
    )
}
