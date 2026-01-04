import { AdminPageShell } from '../_components/page-shell'
import { listWorkflows } from '../config/registry'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'

export default function AdminWorkflowsPage() {
    const workflows = listWorkflows()

    return (
        <AdminPageShell title="Workflows" description="All workflows configured for the Workflow Studio UI.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {workflows.map((w) => (
                    <Card key={w.id}>
                        <CardHeader>
                            <CardTitle className="text-base">{w.name}</CardTitle>
                            <div className="text-xs text-muted-foreground">{w.id}</div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">{w.description}</CardContent>
                    </Card>
                ))}
            </div>
        </AdminPageShell>
    )
}
