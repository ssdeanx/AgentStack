'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { checkDeviceAuthorizationCode, normalizeDeviceUserCode } from '@/lib/auth-client'
import { useAuthQuery } from '@/lib/hooks/use-auth-query'
import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'

/**
 * Interactive Better Auth device verification form.
 */
export function DeviceAuthorizationForm({
    initialUserCode,
}: {
    initialUserCode: string | null
}) {
    const router = useRouter()
    const authQuery = useAuthQuery()
    const [userCode, setUserCode] = useState('')
    const [isChecking, setIsChecking] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const normalizedInitialCode = useMemo(() => {
        return initialUserCode ? normalizeDeviceUserCode(initialUserCode) : ''
    }, [initialUserCode])

    useEffect(() => {
        if (normalizedInitialCode) {
            setUserCode(normalizedInitialCode)
        }
    }, [normalizedInitialCode])

    const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsChecking(true)
        setErrorMessage('')

        try {
            const normalizedCode = normalizeDeviceUserCode(userCode)
            const response = await checkDeviceAuthorizationCode({ userCode: normalizedCode })

            if (response.error) {
                setErrorMessage(response.error.error_description ?? 'That code is not valid or has expired.')
                return
            }

            router.push(`/device/approve?user_code=${encodeURIComponent(normalizedCode)}`)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to verify the device code.')
        } finally {
            setIsChecking(false)
        }
    }

    if (authQuery.isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading device verification...
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-muted/30 px-4 py-10">
            <Card className="w-full max-w-xl shadow-xl shadow-black/5">
                <CardHeader className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ShieldCheck className="size-4" />
                        Device authorization
                    </div>
                    <CardTitle className="text-3xl tracking-tight">Enter the code from your agent</CardTitle>
                    <CardDescription>
                        Paste the one-time code shown by the agent, then continue to approve or deny the request.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <Label htmlFor="userCode">Device code</Label>
                            <Input
                                id="userCode"
                                autoComplete="one-time-code"
                                inputMode="text"
                                maxLength={16}
                                placeholder="ABCD-1234"
                                value={userCode}
                                onChange={(event) => setUserCode(event.target.value)}
                            />
                        </div>

                        {errorMessage ? (
                            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        ) : (
                            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                                <span>
                                    {authQuery.data
                                        ? 'You are signed in and can continue to the approval step.'
                                        : 'If you are not signed in yet, open the approval page after logging in.'}
                                </span>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                            <Button type="submit" disabled={isChecking || userCode.trim().length === 0}>
                                {isChecking ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Verifying
                                    </>
                                ) : (
                                    'Continue'
                                )}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => router.push('/login?next=/device')}>
                                Sign in first
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
