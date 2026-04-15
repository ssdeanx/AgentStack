'use client'

import * as React from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
    Check,
    Copy,
    KeyRound,
    Loader2,
    LogOut,
    MoreHorizontal,
    PenLine,
    Plus,
    RotateCw,
    ShieldCheck,
    Trash2,
    UserRound,
} from 'lucide-react'
import Link from 'next/link'

import {
    Badge,
} from '@/ui/badge'
import {
    Button,
} from '@/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip'
import {
    type ApiKeyRecord,
    type CurrentSession,
    useApiKeysQuery,
    useAuthQuery,
    useChangePasswordMutation,
    useCreateApiKeyMutation,
    useCurrentSessionsQuery,
    useDeleteApiKeyMutation,
    useDeleteCurrentUserMutation,
    useRevokeCurrentSessionMutation,
    useRevokeCurrentSessionsMutation,
    useRequestPasswordResetMutation,
    useSignOutMutation,
    useUpdateApiKeyMutation,
    useUpdateCurrentUserMutation,
} from '@/lib/hooks/use-auth-query'

/**
 * One-time API key record returned by Better Auth when creating a key.
 */
type CreatedApiKey = {
    key: string
    name: string | null
    prefix: string | null
    id: string
}

type ApiKeyFormState = {
    name: string
    prefix: string
    expiresIn: string
    remaining: string
    refillAmount: string
    refillInterval: string
    rateLimitEnabled: boolean
    rateLimitMax: string
    rateLimitTimeWindow: string
    metadata: string
    permissions: string
    enabled: boolean
}

type PasswordFormState = {
    currentPassword: string
    newPassword: string
    confirmPassword: string
    revokeOtherSessions: boolean
}

type DeleteAccountFormState = {
    password: string
    confirmText: string
}

type ProfileFormState = {
    name: string
    username: string
    image: string
}

export type UserSettingsPanelSection =
    | 'all'
    | 'profile'
    | 'security'
    | 'sessions'
    | 'api-keys'
    | 'danger-zone'

const emptyApiKeyForm: ApiKeyFormState = {
    name: '',
    prefix: 'ak_',
    expiresIn: '',
    remaining: '',
    refillAmount: '',
    refillInterval: '',
    rateLimitEnabled: false,
    rateLimitMax: '',
    rateLimitTimeWindow: '',
    metadata: '{}',
    permissions: '{}',
    enabled: true,
}

const emptyPasswordForm: PasswordFormState = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    revokeOtherSessions: true,
}

const emptyDeleteForm: DeleteAccountFormState = {
    password: '',
    confirmText: '',
}

function formatDate(value?: string | number | Date | null) {
    if (!value) {
        return '—'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return '—'
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}

function copyText(text: string) {
    if (!text) {
        return Promise.resolve()
    }

    return navigator.clipboard.writeText(text)
}

function badgeVariantFromBoolean(value: boolean): React.ComponentProps<typeof Badge>['variant'] {
    return value ? 'secondary' : 'outline'
}

/**
 * User settings surface for the signed-in account.
 */
export function UserSettingsPanel({
    section = 'all',
}: {
    section?: UserSettingsPanelSection
}) {
    const { data: session } = useAuthQuery()
    const currentSessionsQuery = useCurrentSessionsQuery()
    const apiKeysQuery = useApiKeysQuery()

    const updateCurrentUser = useUpdateCurrentUserMutation()
    const changePassword = useChangePasswordMutation()
    const deleteCurrentUser = useDeleteCurrentUserMutation()
    const requestPasswordReset = useRequestPasswordResetMutation()
    const signOut = useSignOutMutation()
    const revokeCurrentSession = useRevokeCurrentSessionMutation()
    const revokeCurrentSessions = useRevokeCurrentSessionsMutation()
    const createApiKey = useCreateApiKeyMutation()
    const updateApiKey = useUpdateApiKeyMutation()
    const deleteApiKey = useDeleteApiKeyMutation()

    const user = session?.user as
        | {
              name?: string | null
              email?: string | null
              image?: string | null
              username?: string | null
              role?: string | null
          }
        | undefined
    const currentSessionToken = session?.session?.token

    const [profileForm, setProfileForm] = React.useState<ProfileFormState>({
        name: '',
        username: '',
        image: '',
    })
    const [passwordForm, setPasswordForm] = React.useState<PasswordFormState>(emptyPasswordForm)
    const [deleteForm, setDeleteForm] = React.useState<DeleteAccountFormState>(emptyDeleteForm)
    const [apiKeyForm, setApiKeyForm] = React.useState<ApiKeyFormState>(emptyApiKeyForm)
    const [editingKey, setEditingKey] = React.useState<string | null>(null)
    const [createdApiKey, setCreatedApiKey] = React.useState<CreatedApiKey | null>(null)
    const [clipboardValue, setClipboardValue] = React.useState<string | null>(null)

    React.useEffect(() => {
        setProfileForm({
            name: user?.name ?? '',
            username: user?.username ?? '',
            image: user?.image ?? '',
        })
    }, [user?.image, user?.name, user?.username])

    const sessions = React.useMemo(
        () => (currentSessionsQuery.data ?? []) as CurrentSession[],
        [currentSessionsQuery.data],
    )
    const apiKeys = React.useMemo(
        () => (apiKeysQuery.data?.apiKeys ?? []) as ApiKeyRecord[],
        [apiKeysQuery.data],
    )
    const currentSessionCount = sessions.length
    const activeApiKeys = apiKeys.filter((key) => key.enabled).length

    const selectedApiKey = React.useMemo(
        () => apiKeys.find((entry) => entry.id === editingKey) ?? null,
        [apiKeys, editingKey],
    )

    React.useEffect(() => {
        if (!selectedApiKey) {
            return
        }

        setApiKeyForm({
            name: selectedApiKey.name ?? '',
            prefix: selectedApiKey.prefix ?? 'ak_',
            expiresIn: selectedApiKey.expiresAt
                ? String(Math.max(1, Math.round((new Date(selectedApiKey.expiresAt).getTime() - Date.now()) / 1000)))
                : '',
            remaining: selectedApiKey.remaining?.toString() ?? '',
            refillAmount: selectedApiKey.refillAmount?.toString() ?? '',
            refillInterval: selectedApiKey.refillInterval?.toString() ?? '',
            rateLimitEnabled: selectedApiKey.rateLimitEnabled,
            rateLimitMax: selectedApiKey.rateLimitMax?.toString() ?? '',
            rateLimitTimeWindow: selectedApiKey.rateLimitTimeWindow?.toString() ?? '',
            metadata: JSON.stringify(selectedApiKey.metadata ?? {}, null, 2),
            permissions: JSON.stringify(selectedApiKey.permissions ?? {}, null, 2),
            enabled: selectedApiKey.enabled,
        })
    }, [selectedApiKey])

    const isBusy =
        updateCurrentUser.isPending ||
        changePassword.isPending ||
        deleteCurrentUser.isPending ||
        createApiKey.isPending ||
        updateApiKey.isPending ||
        deleteApiKey.isPending ||
        revokeCurrentSession.isPending ||
        revokeCurrentSessions.isPending ||
        signOut.isPending ||
        requestPasswordReset.isPending
    const showProfile = section === 'all' || section === 'profile'
    const showSecurity = section === 'all' || section === 'security'
    const showSessions = section === 'all' || section === 'sessions'
    const showApiKeys = section === 'all' || section === 'api-keys'
    const showDangerZone = section === 'all' || section === 'danger-zone'

    async function handleSaveProfile(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        await updateCurrentUser.mutateAsync({
            name: profileForm.name.trim(),
            username: profileForm.username.trim() || undefined,
            image: profileForm.image.trim() || null,
        })
    }

    async function handleChangePassword(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return
        }

        await changePassword.mutateAsync({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
            revokeOtherSessions: passwordForm.revokeOtherSessions,
        })

        setPasswordForm(emptyPasswordForm)
    }

    async function handleDeleteAccount(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        await deleteCurrentUser.mutateAsync({
            password: deleteForm.password || undefined,
            token: deleteForm.confirmText === 'delete my account' ? 'delete my account' : undefined,
        })
    }

    async function handleCreateApiKey(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        const permissions = safeParseJson<Record<string, string[]>>(apiKeyForm.permissions, {})
        const metadata = safeParseJson<Record<string, unknown>>(apiKeyForm.metadata, {})

        const result = await createApiKey.mutateAsync({
            name: apiKeyForm.name.trim() || undefined,
            prefix: apiKeyForm.prefix.trim() || undefined,
            expiresIn: apiKeyForm.expiresIn ? Number(apiKeyForm.expiresIn) : undefined,
            remaining: apiKeyForm.remaining ? Number(apiKeyForm.remaining) : undefined,
            refillAmount: apiKeyForm.refillAmount ? Number(apiKeyForm.refillAmount) : undefined,
            refillInterval: apiKeyForm.refillInterval ? Number(apiKeyForm.refillInterval) : undefined,
            rateLimitEnabled: apiKeyForm.rateLimitEnabled,
            rateLimitMax: apiKeyForm.rateLimitMax ? Number(apiKeyForm.rateLimitMax) : undefined,
            rateLimitTimeWindow: apiKeyForm.rateLimitTimeWindow
                ? Number(apiKeyForm.rateLimitTimeWindow)
                : undefined,
            metadata,
            permissions,
        })

        if (!result) {
            return
        }

        setCreatedApiKey({
            id: result.id,
            key: result.key,
            name: result.name,
            prefix: result.prefix,
        })
        setApiKeyForm(emptyApiKeyForm)
    }

    async function handleUpdateApiKey(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!selectedApiKey) {
            return
        }

        const permissions = safeParseJson<Record<string, string[]>>(apiKeyForm.permissions, {})
        const metadata = safeParseJson<Record<string, unknown>>(apiKeyForm.metadata, {})

        await updateApiKey.mutateAsync({
            keyId: selectedApiKey.id,
            name: apiKeyForm.name.trim() || undefined,
            enabled: apiKeyForm.enabled,
            remaining: apiKeyForm.remaining ? Number(apiKeyForm.remaining) : undefined,
            refillAmount: apiKeyForm.refillAmount ? Number(apiKeyForm.refillAmount) : undefined,
            refillInterval: apiKeyForm.refillInterval ? Number(apiKeyForm.refillInterval) : undefined,
            metadata,
            expiresIn: apiKeyForm.expiresIn ? Number(apiKeyForm.expiresIn) : null,
            rateLimitEnabled: apiKeyForm.rateLimitEnabled,
            rateLimitMax: apiKeyForm.rateLimitMax ? Number(apiKeyForm.rateLimitMax) : undefined,
            rateLimitTimeWindow: apiKeyForm.rateLimitTimeWindow
                ? Number(apiKeyForm.rateLimitTimeWindow)
                : undefined,
            permissions,
        })
        setEditingKey(null)
    }

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background to-muted/20 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">Account settings</Badge>
                                <Badge variant={badgeVariantFromBoolean(Boolean(user?.role === 'admin'))}>
                                    {user?.role ?? 'user'}
                                </Badge>
                                <Badge variant="outline">
                                    {currentSessionCount} sessions
                                </Badge>
                                <Badge variant="outline">
                                    {activeApiKeys} active API keys
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                                    Personalize your chat account and security posture
                                </h2>
                                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                    Update your profile, rotate passwords, manage live sessions,
                                    and issue API keys from one account-backed place.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="secondary">
                                <Link href="/chat">Open chat</Link>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => signOut.mutate()}
                                disabled={isBusy}
                            >
                                <LogOut className="size-4" />
                                Sign out
                            </Button>
                        </div>
                    </div>
                </section>

                {showProfile || showSecurity ? (
                    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                        {showProfile ? (
                            <Card>
                        <CardHeader>
                            <CardTitle>Profile</CardTitle>
                            <CardDescription>
                                Keep your public identity and avatar in sync with Better Auth.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form id="profile-form" className="grid gap-4" onSubmit={handleSaveProfile}>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="profile-name">Display name</Label>
                                        <Input
                                            id="profile-name"
                                            value={profileForm.name}
                                            onChange={(event) =>
                                                setProfileForm((current) => ({
                                                    ...current,
                                                    name: event.target.value,
                                                }))
                                            }
                                            placeholder="Your display name"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="profile-username">Username</Label>
                                        <Input
                                            id="profile-username"
                                            value={profileForm.username}
                                            onChange={(event) =>
                                                setProfileForm((current) => ({
                                                    ...current,
                                                    username: event.target.value,
                                                }))
                                            }
                                            placeholder="Preferred username"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="profile-image">Avatar URL</Label>
                                    <Input
                                        id="profile-image"
                                        value={profileForm.image}
                                        onChange={(event) =>
                                            setProfileForm((current) => ({
                                                ...current,
                                                image: event.target.value,
                                            }))
                                        }
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 text-foreground">
                                        <UserRound className="size-4" />
                                        <span className="font-medium">Signed in as</span>
                                    </div>
                                    <div className="mt-2 grid gap-1">
                                        <span>{user?.email ?? 'No account loaded'}</span>
                                        <span className="text-xs text-muted-foreground">
                                            Username: {profileForm.username || 'not set'}
                                        </span>
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                        <CardFooter className="justify-between gap-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setProfileForm({
                                        name: user?.name ?? '',
                                        username: user?.username ?? '',
                                        image: user?.image ?? '',
                                    })
                                }}
                            >
                                Reset
                            </Button>
                            <Button type="submit" form="profile-form">
                                Save profile
                            </Button>
                        </CardFooter>
                            </Card>
                        ) : null}

                        {showSecurity ? (
                            <Card>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>
                                Change your password, request recovery, and sign out from all
                                devices.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <form className="grid gap-3" onSubmit={handleChangePassword}>
                                <div className="grid gap-2">
                                    <Label htmlFor="current-password">Current password</Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        value={passwordForm.currentPassword}
                                        onChange={(event) =>
                                            setPasswordForm((current) => ({
                                                ...current,
                                                currentPassword: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="new-password">New password</Label>
                                        <Input
                                            id="new-password"
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={(event) =>
                                                setPasswordForm((current) => ({
                                                    ...current,
                                                    newPassword: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="confirm-password">Confirm password</Label>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(event) =>
                                                setPasswordForm((current) => ({
                                                    ...current,
                                                    confirmPassword: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={passwordForm.revokeOtherSessions}
                                        onChange={(event) =>
                                            setPasswordForm((current) => ({
                                                ...current,
                                                revokeOtherSessions: event.target.checked,
                                            }))
                                        }
                                    />
                                    Revoke every other session after password change
                                </label>
                                <Button
                                    type="submit"
                                    disabled={
                                        changePassword.isPending ||
                                        passwordForm.newPassword.length < 8 ||
                                        passwordForm.newPassword !== passwordForm.confirmPassword
                                    }
                                >
                                    {changePassword.isPending ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="size-4" />
                                    )}
                                    Change password
                                </Button>
                            </form>

                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-medium text-foreground">Password reset</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Send yourself a recovery email if you are locked out.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            requestPasswordReset.mutate({ email: user?.email ?? '' })
                                        }
                                        disabled={!user?.email || requestPasswordReset.isPending}
                                    >
                                        Request reset
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-between gap-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => revokeCurrentSessions.mutate()}
                                disabled={revokeCurrentSessions.isPending}
                            >
                                <RotateCw className="size-4" />
                                Revoke all sessions
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => signOut.mutate()}
                                disabled={signOut.isPending}
                            >
                                <LogOut className="size-4" />
                                Sign out only
                            </Button>
                        </CardFooter>
                            </Card>
                        ) : null}
                    </section>
                ) : null}

                {showSessions ? (
                    <Card>
                    <CardHeader>
                        <CardTitle>Live sessions</CardTitle>
                        <CardDescription>
                            See where your account is signed in and revoke any device instantly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Session</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((entry) => {
                                    const isCurrent = entry.token === currentSessionToken

                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="font-medium text-foreground">
                                                        {entry.userAgent ?? 'Unknown device'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Created {formatDistanceToNow(new Date(entry.createdAt), {
                                                            addSuffix: true,
                                                        })}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-foreground">
                                                    {entry.ipAddress ?? 'Private / unavailable'}
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatDate(entry.expiresAt)}</TableCell>
                                            <TableCell>
                                                <Badge variant={isCurrent ? 'secondary' : 'outline'}>
                                                    {isCurrent ? 'Current' : 'Active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() =>
                                                                revokeCurrentSession.mutate({
                                                                    token: entry.token,
                                                                })
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                            <span className="sr-only">Revoke session</span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Revoke session</TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                    </Card>
                ) : null}

                {showApiKeys ? (
                    <Card>
                    <CardHeader>
                        <CardTitle>API keys</CardTitle>
                        <CardDescription>
                            Issue, rotate, and revoke keys for the current account.
                        </CardDescription>
                        <div className="flex flex-wrap gap-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="size-4" />
                                        New key
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Create API key</DialogTitle>
                                        <DialogDescription>
                                            Create a new key with optional rate limits, expiry, and
                                            metadata.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form className="grid gap-4" onSubmit={handleCreateApiKey}>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-name">Name</Label>
                                                <Input
                                                    id="api-key-name"
                                                    value={apiKeyForm.name}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            name: event.target.value,
                                                        }))
                                                    }
                                                    placeholder="Production chat key"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-prefix">Prefix</Label>
                                                <Input
                                                    id="api-key-prefix"
                                                    value={apiKeyForm.prefix}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            prefix: event.target.value,
                                                        }))
                                                    }
                                                    placeholder="ak_"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-expires">Expires in (seconds)</Label>
                                                <Input
                                                    id="api-key-expires"
                                                    type="number"
                                                    value={apiKeyForm.expiresIn}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            expiresIn: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-remaining">Remaining</Label>
                                                <Input
                                                    id="api-key-remaining"
                                                    type="number"
                                                    value={apiKeyForm.remaining}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            remaining: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-ratelimit-max">Rate limit max</Label>
                                                <Input
                                                    id="api-key-ratelimit-max"
                                                    type="number"
                                                    value={apiKeyForm.rateLimitMax}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            rateLimitMax: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-remaining-rate">
                                                    Rate limit window (seconds)
                                                </Label>
                                                <Input
                                                    id="api-key-remaining-rate"
                                                    type="number"
                                                    value={apiKeyForm.rateLimitTimeWindow}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            rateLimitTimeWindow: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-refill-amount">Refill amount</Label>
                                                <Input
                                                    id="api-key-refill-amount"
                                                    type="number"
                                                    value={apiKeyForm.refillAmount}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            refillAmount: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-refill-interval">
                                                    Refill interval
                                                </Label>
                                                <Input
                                                    id="api-key-refill-interval"
                                                    type="number"
                                                    value={apiKeyForm.refillInterval}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            refillInterval: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 self-end text-sm text-muted-foreground">
                                                <input
                                                    type="checkbox"
                                                    checked={apiKeyForm.rateLimitEnabled}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            rateLimitEnabled: event.target.checked,
                                                        }))
                                                    }
                                                />
                                                Enable rate limiting
                                            </label>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-metadata">Metadata JSON</Label>
                                                <textarea
                                                    id="api-key-metadata"
                                                    title="API key metadata JSON"
                                                    placeholder='{"role":"default"}'
                                                    className="min-h-24 rounded-md border border-input bg-transparent p-3 text-sm outline-none"
                                                    value={apiKeyForm.metadata}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            metadata: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="api-key-permissions">Permissions JSON</Label>
                                                <textarea
                                                    id="api-key-permissions"
                                                    title="API key permissions JSON"
                                                    placeholder='{"chat":["read"]}'
                                                    className="min-h-24 rounded-md border border-input bg-transparent p-3 text-sm outline-none"
                                                    value={apiKeyForm.permissions}
                                                    onChange={(event) =>
                                                        setApiKeyForm((current) => ({
                                                            ...current,
                                                            permissions: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" disabled={createApiKey.isPending}>
                                                {createApiKey.isPending ? (
                                                    <Loader2 className="size-4 animate-spin" />
                                                ) : (
                                                    <KeyRound className="size-4" />
                                                )}
                                                Create key
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {createdApiKey ? (
                            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-medium text-foreground">Copy this key now</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Better Auth only returns the secret once.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={async () => {
                                            await copyText(createdApiKey.key)
                                            setClipboardValue(createdApiKey.key)
                                        }}
                                    >
                                        <Copy className="size-4" />
                                        Copy
                                    </Button>
                                </div>
                                <div className="mt-3 break-all rounded-xl bg-background/80 p-3 font-mono text-xs text-foreground">
                                    {createdApiKey.key}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {clipboardValue ? 'Copied to clipboard.' : 'Store it securely.'}
                                </div>
                            </div>
                        ) : null}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Prefix</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {apiKeys.map((apiKey) => (
                                    <TableRow key={apiKey.id}>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="font-medium text-foreground">
                                                    {apiKey.name ?? 'Unnamed key'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Created {formatDistanceToNow(new Date(apiKey.createdAt), {
                                                        addSuffix: true,
                                                    })}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {apiKey.prefix ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={apiKey.enabled ? 'secondary' : 'outline'}>
                                                {apiKey.enabled ? 'Enabled' : 'Disabled'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(apiKey.expiresAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon-sm">
                                                        <MoreHorizontal className="size-4" />
                                                        <span className="sr-only">Open key actions</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditingKey(apiKey.id)
                                                        }}
                                                    >
                                                        <PenLine className="size-4" />
                                                        Edit key
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={async () => {
                                                            await deleteApiKey.mutateAsync({
                                                                keyId: apiKey.id,
                                                            })
                                                        }}
                                                        variant="destructive"
                                                    >
                                                        <Trash2 className="size-4" />
                                                        Delete key
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                    </Card>
                ) : null}

                {showDangerZone ? (
                    <Card>
                    <CardHeader>
                        <CardTitle>Danger zone</CardTitle>
                        <CardDescription>
                            Remove the account permanently. This action is immediate.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="grid gap-4" onSubmit={handleDeleteAccount}>
                            <div className="grid gap-2">
                                <Label htmlFor="delete-password">Password</Label>
                                <Input
                                    id="delete-password"
                                    type="password"
                                    value={deleteForm.password}
                                    onChange={(event) =>
                                        setDeleteForm((current) => ({
                                            ...current,
                                            password: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="delete-confirm">Type delete my account</Label>
                                <Input
                                    id="delete-confirm"
                                    value={deleteForm.confirmText}
                                    onChange={(event) =>
                                        setDeleteForm((current) => ({
                                            ...current,
                                            confirmText: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={deleteCurrentUser.isPending || deleteForm.confirmText !== 'delete my account'}
                            >
                                <Trash2 className="size-4" />
                                Delete account
                            </Button>
                        </form>
                    </CardContent>
                    </Card>
                ) : null}
            </div>

            {showApiKeys ? (
                <Dialog open={Boolean(editingKey)} onOpenChange={(open) => !open && setEditingKey(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit API key</DialogTitle>
                        <DialogDescription>
                            Update the selected key without recreating it.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedApiKey ? (
                        <form className="grid gap-4" onSubmit={handleUpdateApiKey}>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-api-key-name">Name</Label>
                                    <Input
                                        id="edit-api-key-name"
                                        value={apiKeyForm.name}
                                        onChange={(event) =>
                                            setApiKeyForm((current) => ({
                                                ...current,
                                                name: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-api-key-prefix">Prefix</Label>
                                    <Input id="edit-api-key-prefix" value={apiKeyForm.prefix} disabled />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={apiKeyForm.enabled}
                                        onChange={(event) =>
                                            setApiKeyForm((current) => ({
                                                ...current,
                                                enabled: event.target.checked,
                                            }))
                                        }
                                    />
                                    Enabled
                                </label>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-api-key-remaining">Remaining</Label>
                                    <Input
                                        id="edit-api-key-remaining"
                                        type="number"
                                        value={apiKeyForm.remaining}
                                        onChange={(event) =>
                                            setApiKeyForm((current) => ({
                                                ...current,
                                                remaining: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-api-key-expires">Expires in (seconds)</Label>
                                    <Input
                                        id="edit-api-key-expires"
                                        type="number"
                                        value={apiKeyForm.expiresIn}
                                        onChange={(event) =>
                                            setApiKeyForm((current) => ({
                                                ...current,
                                                expiresIn: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-api-key-metadata">Metadata JSON</Label>
                                    <textarea
                                        id="edit-api-key-metadata"
                                        title="API key metadata JSON"
                                        placeholder='{"role":"default"}'
                                        className="min-h-24 rounded-md border border-input bg-transparent p-3 text-sm outline-none"
                                        value={apiKeyForm.metadata}
                                        onChange={(event) =>
                                            setApiKeyForm((current) => ({
                                                ...current,
                                                metadata: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-api-key-permissions">Permissions JSON</Label>
                                    <textarea
                                        id="edit-api-key-permissions"
                                        title="API key permissions JSON"
                                        placeholder='{"chat":["read"]}'
                                        className="min-h-24 rounded-md border border-input bg-transparent p-3 text-sm outline-none"
                                        value={apiKeyForm.permissions}
                                        onChange={(event) =>
                                            setApiKeyForm((current) => ({
                                                ...current,
                                                permissions: event.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingKey(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateApiKey.isPending}>
                                    {updateApiKey.isPending ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Check className="size-4" />
                                    )}
                                    Save changes
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : null}
                </DialogContent>
                </Dialog>
            ) : null}
        </TooltipProvider>
    )
}

function safeParseJson<T>(value: string, fallback: T): T {
    try {
        return JSON.parse(value) as T
    } catch {
        return fallback
    }
}
