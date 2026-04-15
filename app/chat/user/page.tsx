import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/ui/tooltip'

/**
 * User settings overview for the signed-in chat account.
 */
export default function UserPage() {
    const sections = [
        {
            href: '/chat/user/profile',
            title: 'Profile',
            description: 'Update your display name, username, and avatar.',
        },
        {
            href: '/chat/user/security',
            title: 'Security',
            description: 'Rotate your password and control your sign-out posture.',
        },
        {
            href: '/chat/user/sessions',
            title: 'Sessions',
            description: 'Inspect and revoke active devices tied to your account.',
        },
        {
            href: '/chat/user/api-keys',
            title: 'API keys',
            description: 'Create and manage account-scoped API keys.',
        },
        {
            href: '/chat/user/danger-zone',
            title: 'Danger zone',
            description: 'Handle irreversible account deletion actions.',
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
                                        Open the focused {section.title.toLowerCase()} route.
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
