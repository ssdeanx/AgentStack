import Link from 'next/link'
import type { Route } from 'next'
import { AdminPageShell } from './_components/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { listAgents, listNetworks, listWorkflows } from './config/registry'

export default function AdminHomePage() {
    const agents = listAgents()
    const networks = listNetworks()
    const workflows = listWorkflows()

    return (
        <AdminPageShell
            title="Admin Overview"
            description="Quick launch into Chat / Networks / Workflows, plus discovery of everything registered in the UI configs."
        >
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Quick Launch</span>
                            <Badge variant="secondary">UI</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <Link href={'/chat' as Route} className="block underline-offset-4 hover:underline">
                            Open Chat
                        </Link>
                        <Link href={'/networks' as Route} className="block underline-offset-4 hover:underline">
                            Open Networks
                        </Link>
                        <Link href={'/workflows' as Route} className="block underline-offset-4 hover:underline">
                            Open Workflows
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Registry Counts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span>Agents</span>
                            <Badge variant="secondary">{agents.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Workflows</span>
                            <Badge variant="secondary">{workflows.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Networks</span>
                            <Badge variant="secondary">{networks.length}</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Where this data comes from</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This Admin UI reads from local config files:
                        <ul className="mt-2 list-disc pl-5">
                            <li>
                                <code className="rounded bg-muted px-1 py-0.5">app/chat/config/agents.ts</code>
                            </li>
                            <li>
                                <code className="rounded bg-muted px-1 py-0.5">app/networks/config/networks.ts</code>
                            </li>
                            <li>
                                <code className="rounded bg-muted px-1 py-0.5">app/workflows/config/workflows.ts</code>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </AdminPageShell>
    )
}
