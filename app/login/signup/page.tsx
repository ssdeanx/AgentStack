'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Suspense,
    useEffect,
    useMemo,
    useState,
    type SyntheticEvent,
} from 'react'
import { Eye, EyeOff, Loader2, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'

import {
    authClient,
    hasGoogleOneTapClient,
    signUpWithUsername,
    startGoogleOneTap,
} from '@/lib/auth-client'
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

function SignupPageFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background via-background to-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading sign-up...
            </div>
        </div>
    )
}

function SignupPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const authQuery = useAuthQuery()
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [name, setName] = useState('')
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const nextPath = useMemo(() => {
        return getSafeNextPath(searchParams.get('next'))
    }, [searchParams])

    const normalizedName = name.trim()
    const normalizedUsername = username.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const isPasswordValid = password.length >= 8
    const passwordsMatch = password === confirmPassword
    const canSubmit =
        normalizedName.length > 0 &&
        normalizedUsername.length > 0 &&
        normalizedEmail.length > 0 &&
        isPasswordValid &&
        passwordsMatch &&
        !isLoading

    useEffect(() => {
        if (authQuery.isPending) {
            return
        }

        if (authQuery.data) {
            router.replace(nextPath)
        }
    }, [authQuery.data, authQuery.isPending, nextPath, router])

    useEffect(() => {
        if (authQuery.isPending || authQuery.data || !hasGoogleOneTapClient) {
            return
        }

        void startGoogleOneTap({
            callbackURL: nextPath,
        })
    }, [authQuery.data, authQuery.isPending, nextPath])

    /** Starts the Google OAuth flow through Better Auth. */
    const handleGoogleSignIn = async () => {
        setIsLoading(true)
        setErrorMessage('')

        try {
            const response = await authClient.signIn.social({
                provider: 'google',
                callbackURL: nextPath,
            })

            if (response.error) {
                setErrorMessage(response.error.message ?? 'Unable to sign in with Google.')
                setIsLoading(false)
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'Unable to sign in with Google.',
            )
            setIsLoading(false)
        }
    }

    type SignupSubmitEvent = SyntheticEvent<HTMLFormElement, SubmitEvent>

    const handleSignup = async (e: SignupSubmitEvent) => {
        e.preventDefault()

        if (!normalizedName || !normalizedUsername || !normalizedEmail) {
            setErrorMessage('Please fill in your name, username, and email.')
            return
        }

        if (!isPasswordValid) {
            setErrorMessage('Use at least 8 characters for your password.')
            return
        }

        if (!passwordsMatch) {
            setErrorMessage('Your passwords do not match.')
            return
        }

        setIsLoading(true)
        setErrorMessage('')

        const response = await signUpWithUsername({
            name: normalizedName,
            username: normalizedUsername,
            email: normalizedEmail,
            password,
            callbackURL: nextPath,
        })

        setIsLoading(false)

        if (response.error) {
            setErrorMessage(response.error.message ?? 'Unable to create account.')
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
                <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="absolute right-0 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
            </div>

            <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <section className="hidden h-full flex-col justify-between rounded-4xl border border-border/40 bg-card/70 p-8 shadow-2xl shadow-black/5 backdrop-blur-xl lg:flex">
                    <div className="space-y-8">
                        <Link href="/login" className="group inline-flex items-center gap-3">
                            <div className="flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-200 group-hover:scale-105">
                                <UserPlus className="size-7" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">AgentStack</div>
                                <div className="text-2xl font-semibold tracking-tight text-foreground">
                                    Create your account
                                </div>
                            </div>
                        </Link>

                        <div className="space-y-4">
                            <Badge variant="secondary" className="w-fit gap-1 rounded-full px-3 py-1">
                                <ShieldCheck className="size-3.5" />
                                Secure onboarding
                            </Badge>
                            <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-foreground">
                                Join the workspace with a polished, guided signup.
                            </h1>
                            <p className="max-w-lg text-base leading-7 text-muted-foreground">
                                A calmer first-run experience with clear steps, strong validation, and a
                                more modern visual hierarchy.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                ['Simple profile', 'Name and username are captured up front.'],
                                ['Safer entry', 'Password confirmation reduces mistakes.'],
                                ['Faster start', 'You land directly in the chat workspace.'],
                            ].map(([title, text]) => (
                                <div key={title} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                                    <div className="text-sm font-medium text-foreground">{title}</div>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-linear-to-br from-emerald-500/10 to-transparent p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Guided flow</div>
                            <p className="mt-2 text-sm text-foreground">
                                Better spacing and clearer validation make first-time signup feel effortless.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-linear-to-br from-primary/10 to-transparent p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Privacy first</div>
                            <p className="mt-2 text-sm text-foreground">
                                Passwords are never stored by this page; browser managers can handle them.
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
                                    Secure onboarding
                                </Badge>
                                <Badge variant="outline" className="gap-1">
                                    <Sparkles className="size-3.5" />
                                    Ready in seconds
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-xl">Sign up</CardTitle>
                                <CardDescription>
                                    Create your account with a username and a strong password.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-5">
                            <div className="rounded-2xl border border-border/60 bg-muted/25 p-4 text-sm text-muted-foreground">
                                <div className="font-medium text-foreground">Designed to feel premium</div>
                                <p className="mt-1 leading-6">
                                    Clear steps, spacious controls, and better feedback make the signup form
                                    easier to trust and faster to complete.
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full rounded-xl text-sm font-medium"
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Signing in with Google...
                                    </>
                                ) : (
                                    'Continue with Google'
                                )}
                            </Button>

                            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                <span className="h-px flex-1 bg-border/70" />
                                <span>Or create an account below</span>
                                <span className="h-px flex-1 bg-border/70" />
                            </div>

                            <form onSubmit={handleSignup} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            type="text"
                                            placeholder="Your name"
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            disabled={isLoading}
                                            autoComplete="name"
                                            autoCapitalize="words"
                                            required
                                            className="h-11 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input
                                            id="username"
                                            type="text"
                                            placeholder="your-username"
                                            value={username}
                                            onChange={(event) => setUsername(event.target.value)}
                                            disabled={isLoading}
                                            autoComplete="username"
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            required
                                            className="h-11 rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        disabled={isLoading}
                                        autoComplete="email"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        required
                                        className="h-11 rounded-xl"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(event) => setPassword(event.target.value)}
                                                disabled={isLoading}
                                                autoComplete="new-password"
                                                required
                                                minLength={8}
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
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password">Confirm password</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirm-password"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                placeholder="Repeat password"
                                                value={confirmPassword}
                                                onChange={(event) => setConfirmPassword(event.target.value)}
                                                disabled={isLoading}
                                                autoComplete="new-password"
                                                required
                                                className="h-11 rounded-xl pr-12"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-lg text-muted-foreground"
                                                onClick={() => setShowConfirmPassword((current) => !current)}
                                                disabled={isLoading}
                                                aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                                            >
                                                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
                                    <div className="font-medium text-foreground">Password guidance</div>
                                    <p className="mt-1 leading-6">
                                        Use at least 8 characters. Password managers will still work here.
                                    </p>
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
                                            Creating account...
                                        </>
                                    ) : (
                                        'Create account and continue'
                                    )}
                                </Button>
                            </form>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4 pt-0">
                            <div className="text-center text-sm text-muted-foreground">
                                Already have an account?{' '}
                                <Link
                                    href={`/login?next=${encodeURIComponent(nextPath)}`}
                                    className="font-medium text-primary hover:underline"
                                >
                                    Sign in
                                </Link>
                            </div>
                        </CardFooter>
                    </Card>
                </section>
            </div>
        </div>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={<SignupPageFallback />}>
            <SignupPageContent />
        </Suspense>
    )
}
