'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, Sparkles } from 'lucide-react'

import { authClient } from '@/lib/auth-client'
import { useAuthQuery } from '@/lib/hooks/use-auth-query'
import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'

function getSafeNextPath(next: string | null): Route {
    if (next?.startsWith('/') === true) {
        return next as Route
    }

    return '/chat'
}

const REMEMBERED_IDENTIFIER_KEY = 'agentstack.auth.remembered-identifier'
type LoginSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const authQuery = useAuthQuery()
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberIdentifier, setRememberIdentifier] = useState(false)

    const nextPath = useMemo(() => {
        return getSafeNextPath(searchParams.get('next'))
    }, [searchParams])

    const normalizedIdentifier = identifier.trim()
    const isEmailLogin = normalizedIdentifier.includes('@')
    const canSubmit = normalizedIdentifier.length > 0 && password.length > 0 && !isLoading

    useEffect(() => {
        if (authQuery.isPending) {
            return
        }

        if (authQuery.data) {
            router.replace(nextPath)
        }
    }, [authQuery.data, authQuery.isPending, nextPath, router])

    useEffect(() => {
        const savedIdentifier = window.localStorage.getItem(REMEMBERED_IDENTIFIER_KEY)

        if (savedIdentifier) {
            queueMicrotask(() => {
                setIdentifier(savedIdentifier)
                setRememberIdentifier(true)
            })
        }
    }, [])

    const handleLogin = async (e: LoginSubmitEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setErrorMessage('')

        if (rememberIdentifier) {
            window.localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, normalizedIdentifier)
        } else {
            window.localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY)
        }

        const response = normalizedIdentifier.includes('@')
            ? await authClient.signIn.email({
                  email: normalizedIdentifier.toLowerCase(),
                  password,
                  callbackURL: nextPath,
              })
            : await authClient.signIn.username({
                  username: normalizedIdentifier,
                  password,
                  callbackURL: nextPath,
              })

        setIsLoading(false)

        if (response.error) {
            setErrorMessage(response.error.message ?? 'Unable to sign in.')
            return
        }

        router.replace(nextPath)
    }

    if (authQuery.isPending || authQuery.data) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Redirecting to chat...
                </div>
            </div>
        )
    }

    return (
        <div className="relative isolate min-h-screen overflow-hidden bg-linear-to-br from-background via-background to-slate-950/5 p-4 lg:p-6">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute left-0 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
            </div>

            <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <section className="hidden h-full flex-col justify-between rounded-[2rem] border border-border/40 bg-card/70 p-8 shadow-2xl shadow-black/5 backdrop-blur-xl lg:flex">
                    <div className="space-y-8">
                        <Link href="/" className="group inline-flex items-center gap-3">
                            <div className="flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-200 group-hover:scale-105">
                                <LogIn className="size-7" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">AgentStack</div>
                                <div className="text-2xl font-semibold tracking-tight text-foreground">
                                    Command center sign-in
                                </div>
                            </div>
                        </Link>

                        <div className="space-y-4">
                            <Badge variant="secondary" className="w-fit gap-1 rounded-full px-3 py-1">
                                <ShieldCheck className="size-3.5" />
                                Secure session flow
                            </Badge>
                            <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-foreground">
                                Return to the workspace in one clean step.
                            </h1>
                            <p className="max-w-lg text-base leading-7 text-muted-foreground">
                                Fast access, modern UI, and a session flow that keeps the sign-in experience
                                focused on getting you back into chat, tools, and workflows.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                ['One account', 'Use email or username with automatic detection.'],
                                ['Browser memory', 'Remember your identifier on this device only.'],
                                ['Clean redirect', 'Land back on your requested destination immediately.'],
                            ].map(([title, text]) => (
                                <div key={title} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                                    <div className="text-sm font-medium text-foreground">{title}</div>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-linear-to-br from-primary/10 to-transparent p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Better UX</div>
                            <p className="mt-2 text-sm text-foreground">
                                Large touch targets, sharper spacing, and clearer feedback loops.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-linear-to-br from-cyan-500/10 to-transparent p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Better memory</div>
                            <p className="mt-2 text-sm text-foreground">
                                Your browser can remember the identifier; the app never stores passwords.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="flex justify-center">
                    <Card className="w-full max-w-md border-border/50 bg-card/90 shadow-2xl shadow-black/10 backdrop-blur-xl">
                        <CardHeader className="space-y-3 pb-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="gap-1">
                                    <ShieldCheck className="size-3.5" />
                                    Secure access
                                </Badge>
                                <Badge variant="outline" className="gap-1">
                                    <Sparkles className="size-3.5" />
                                    Fast re-entry
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-xl">Sign in</CardTitle>
                                <CardDescription>
                                    Use your email or username to jump back into your workspace.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-5">
                            <div className="rounded-2xl border border-border/60 bg-muted/25 p-4 text-sm text-muted-foreground">
                                <div className="font-medium text-foreground">Designed for speed</div>
                                <p className="mt-1 leading-6">
                                    Clean spacing, strong contrast, and explicit feedback keep the login step
                                    quick and calm.
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="identifier">Email or username</Label>
                                    <Input
                                        id="identifier"
                                        type="text"
                                        placeholder="name@example.com or your-username"
                                        value={identifier}
                                        onChange={(event) => setIdentifier(event.target.value)}
                                        disabled={isLoading}
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        required
                                        className="h-11 rounded-xl"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        We detect whether you entered an email or username automatically.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <Label htmlFor="password">Password</Label>
                                        <span className="text-xs text-muted-foreground">
                                            Your browser or password manager can still remember it.
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            disabled={isLoading}
                                            autoComplete="current-password"
                                            required
                                            className="h-11 rounded-xl pr-12"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-lg text-muted-foreground"
                                            onClick={() => setShowPassword((current) => !current)}
                                            disabled={isLoading}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </Button>
                                    </div>
                                    <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                                        <input
                                            type="checkbox"
                                            checked={rememberIdentifier}
                                            onChange={(event) => setRememberIdentifier(event.target.checked)}
                                            className="size-3.5 rounded border-border"
                                        />
                                        Remember my email or username on this device
                                    </label>
                                </div>

                                {errorMessage ? (
                                    <p className="text-sm text-destructive" role="alert">
                                        {errorMessage}
                                    </p>
                                ) : null}

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl text-sm font-medium"
                                    disabled={!canSubmit}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        <>Sign in with {isEmailLogin ? 'email' : 'username'}</>
                                    )}
                                </Button>
                            </form>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4 pt-0">
                            <div className="text-center text-sm text-muted-foreground">
                                Don&apos;t have an account?{' '}
                                <Link
                                    href={`/login/signup?next=${encodeURIComponent(nextPath)}`}
                                    className="font-medium text-primary hover:underline"
                                >
                                    Sign up
                                </Link>
                            </div>
                        </CardFooter>
                    </Card>
                </section>
            </div>
        </div>
    )
}
