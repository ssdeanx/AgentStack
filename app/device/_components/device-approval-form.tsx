'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'

import {
    approveDeviceAuthorization,
    denyDeviceAuthorization,
    normalizeDeviceUserCode,
} from '@/lib/auth-client'
import { useAuthQuery } from '@/lib/hooks/use-auth-query'
import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'

/**
 * Interactive Better Auth device approval screen.
 */
export function DeviceApprovalForm({
    initialUserCode,
}: {
    initialUserCode: string | null
}) {
    const router = useRouter()
    const authQuery = useAuthQuery()
    const [isProcessing, setIsProcessing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const normalizedUserCode = useMemo(() => {
        return initialUserCode ? normalizeDeviceUserCode(initialUserCode) : ''
    }, [initialUserCode])

    useEffect(() => {
        if (authQuery.isPending) {
            return
        }

        if (!authQuery.data) {
            router.replace(`/login?next=${encodeURIComponent(`/device/approve?user_code=${normalizedUserCode}`)}`)
        }
    }, [authQuery.data, authQuery.isPending, normalizedUserCode, router])

    const approvalSummary = normalizedUserCode ? normalizedUserCode.match(/.{1,4}/g)?.join(' ') ?? normalizedUserCode : '—'

    const handleApprove = async () => {
        if (!normalizedUserCode) {
            setErrorMessage('Missing device code.')
            return
        }

        setIsProcessing(true)
        setErrorMessage('')

        try {
            const response = await approveDeviceAuthorization({ userCode: normalizedUserCode })

            if (response.error) {
                setErrorMessage(response.error.error_description ?? 'Unable to approve this device request.')
                return
            }

            router.replace('/chat')
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to approve this device request.')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDeny = async () => {
        if (!normalizedUserCode) {
            setErrorMessage('Missing device code.')
            return
        }

        setIsProcessing(true)
        setErrorMessage('')

        try {
            const response = await denyDeviceAuthorization({ userCode: normalizedUserCode })

            if (response.error) {
                setErrorMessage(response.error.error_description ?? 'Unable to deny this device request.')
                return
            }

            router.replace('/chat')
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to deny this device request.')
        } finally {
            setIsProcessing(false)
        }
    }

    if (authQuery.isPending || !authQuery.data) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading approval screen...
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
                        Device approval
                    </div>
                    <CardTitle className="text-3xl tracking-tight">Approve this agent request?</CardTitle>
                    <CardDescription>
                        Confirm that the code below matches the agent you want to authorize.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">User code</div>
                        <div className="mt-1 font-mono text-base font-semibold tracking-[0.28em]">
                            {approvalSummary}
                        </div>
                    </div>

                    {errorMessage ? (
                        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                            <span>You are signed in, so you can approve or reject this request.</span>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                        <Button
                            type="button"
                            onClick={handleApprove}
                            disabled={isProcessing || !normalizedUserCode}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Working
                                </>
                            ) : (
                                'Approve'
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDeny}
                            disabled={isProcessing || !normalizedUserCode}
                        >
                            Deny
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
