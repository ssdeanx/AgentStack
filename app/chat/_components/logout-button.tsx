'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOutIcon, Loader2Icon } from 'lucide-react'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/ui/button'
import { cn } from '@/lib/utils'

interface LogoutButtonProps {
    className?: string
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

/**
 * Logs the current user out and returns them to the login page.
 */
export function LogoutButton({ className, variant = 'outline' }: LogoutButtonProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleLogout = async () => {
        setIsLoading(true)

        await authClient.signOut()
        router.replace('/login')
        router.refresh()
    }

    return (
        <Button
            type="button"
            variant={variant}
            className={cn(className)}
            onClick={handleLogout}
            disabled={isLoading}
        >
            {isLoading ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
                <LogOutIcon className="mr-2 size-4" />
            )}
            Logout
        </Button>
    )
}
