import { AdminPageShell } from '../_components/page-shell'
import { listNetworks } from '../config/registry'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'

export default function AdminNetworksPage() {
    const networks = listNetworks()

    return (
        <AdminPageShell title="Networks" description="All agent networks configured for the Networks UI.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {networks.map((n) => (
                    <Card key={n.id}>
                        <CardHeader>
                            <CardTitle className="text-base">{n.name}</CardTitle>
                            <div className="text-xs text-muted-foreground">{n.id}</div>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">{n.description}</CardContent>
                    </Card>
                ))}
            </div>
        </AdminPageShell>
    )
}
