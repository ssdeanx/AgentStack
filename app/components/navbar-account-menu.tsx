'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, LayoutDashboard, Settings, ShieldUser, UserCircle2 } from 'lucide-react'

import { authClient } from '@/lib/auth-client'
import { useAuthQuery } from '@/lib/hooks/use-auth-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar'
import { Button } from '@/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface NavbarAccountMenuProps {
    className?: string
    triggerClassName?: string
    fullWidth?: boolean
}

function getInitials(name?: string | null, email?: string | null) {
    const source = name?.trim() || email?.trim() || 'A'
    return source
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
        .slice(0, 2)
}

/**
 * Auth-aware navigation menu for the top bar and mobile header.
 */
export function NavbarAccountMenu({ className, triggerClassName, fullWidth }: NavbarAccountMenuProps) {
    const router = useRouter()
    const { data: session, isPending } = useAuthQuery()
    const user = session?.user

    const handleSignOut = async () => {
        await authClient.signOut()
        router.replace('/login')
        router.refresh()
    }

    if (isPending) {
        return (
            <Button variant="ghost" className={cn(fullWidth && 'w-full justify-start', className)} disabled>
                <UserCircle2 className="mr-2 size-4" />
                Account
            </Button>
        )
    }

    if (!user) {
        return (
            <Button asChild variant="outline" className={cn(fullWidth && 'w-full justify-start', className)}>
                <Link href="/login">
                    <UserCircle2 className="mr-2 size-4" />
                    Sign in
                </Link>
            </Button>
        )
    }

    const isAdmin = user.role === 'admin'
    const initials = getInitials(user.name, user.email)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        'gap-2 rounded-full px-3',
                        fullWidth && 'w-full justify-start',
                        triggerClassName,
                    )}
                >
                    <Avatar className="size-7 border border-border/70">
                        <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.email ?? 'Account'} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-32 truncate text-sm font-medium sm:inline-flex">
                        {user.name ?? user.email ?? 'Account'}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="space-y-1">
                    <div className="truncate text-sm font-medium">{user.name ?? 'Account'}</div>
                    <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/chat">
                            <LayoutDashboard className="mr-2 size-4" />
                            Chat dashboard
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/chat/user">
                            <Settings className="mr-2 size-4" />
                            User settings
                        </Link>
                    </DropdownMenuItem>
                    {isAdmin ? (
                        <DropdownMenuItem asChild>
                            <Link href="/chat/admin">
                                <ShieldUser className="mr-2 size-4" />
                                Admin settings
                            </Link>
                        </DropdownMenuItem>
                    ) : null}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 size-4" />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
