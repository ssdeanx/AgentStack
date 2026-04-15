import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'

/**
 * Admin settings overview for chat operators.
 */
export default function AdminPage() {
    const sections = [
        {
            href: '/chat/admin/runtime',
            title: 'Runtime context',
            description: 'Inspect the live Better Auth session and Mastra provider inventory.',
        },
        {
            href: '/chat/admin/users',
            title: 'Users',
            description: 'Search users, edit records, manage roles, moderate bans, and revoke sessions.',
        },
    ] as const

    return (
        <TooltipProvider delayDuration={150}>
            <div className="grid gap-4 lg:grid-cols-2">
                {sections.map((section) => (
                    <Tooltip key={section.href}>
                        <TooltipTrigger asChild>
                            <Link href={section.href}>
                                <Card className="h-full border-border/60 bg-card/80 transition-colors hover:border-primary/30 hover:bg-primary/5">
                                    <CardHeader className="space-y-2">
                                        <CardTitle>{section.title}</CardTitle>
                                        <CardDescription>{section.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        Open the focused {section.title.toLowerCase()} admin route.
                                    </CardContent>
                                </Card>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            {section.description}
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </TooltipProvider>
    )
}
