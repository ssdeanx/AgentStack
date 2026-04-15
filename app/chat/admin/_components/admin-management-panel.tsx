'use client'

import * as React from 'react'
import {
    Ban,
    Check,
    Crown,
    KeyRound,
    Loader2,
    RefreshCw,
    Search,
    Shield,
    ShieldOff,
    Sparkles,
    Trash2,
    UserPlus,
} from 'lucide-react'

import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/ui/dialog'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip'
import { useDebounce } from '@/hooks/use-debounce'
import type { AdminUser } from '@/lib/hooks/use-auth-query'
import {
    useAdminUserQuery,
    useAdminUserSessionsQuery,
    useAdminUsersQuery,
    useAuthQuery,
    useBanAdminUserMutation,
    useCreateAdminUserMutation,
    useDeleteAdminUserMutation,
    useImpersonateAdminUserMutation,
    useRevokeAdminUserSessionMutation,
    useRevokeAdminUserSessionsMutation,
    useSetAdminUserPasswordMutation,
    useSetAdminUserRoleMutation,
    useUnbanAdminUserMutation,
    useUpdateAdminUserMutation,
} from '@/lib/hooks/use-auth-query'
import { useAgentModelProviders } from '@/lib/hooks/use-mastra-query'

type CreateUserFormState = {
    name: string
    email: string
    password: string
    role: AdminRole
    username: string
    data: string
}

type EditUserFormState = {
    name: string
    email: string
    image: string
    username: string
    data: string
}

type BanFormState = {
    reason: string
    expiresIn: string
}

type PasswordFormState = {
    newPassword: string
    confirmPassword: string
}

type AdminRole = 'user' | 'admin'
export type AdminSettingsPanelSection = 'all' | 'runtime' | 'users'

const pageSize = 20

const emptyCreateForm: CreateUserFormState = {
    name: '',
    email: '',
    password: '',
    role: 'user',
    username: '',
    data: '{}',
}

const emptyEditForm: EditUserFormState = {
    name: '',
    email: '',
    image: '',
    username: '',
    data: '{}',
}

const emptyBanForm: BanFormState = {
    reason: '',
    expiresIn: '',
}

const emptyPasswordForm: PasswordFormState = {
    newPassword: '',
    confirmPassword: '',
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

function safeJsonParse<T>(value: string, fallback: T): T {
    try {
        return JSON.parse(value) as T
    } catch {
        return fallback
    }
}

function stripKnownUserFields(user: AdminUser | null | undefined) {
    if (!user) {
        return {}
    }

    const record = user as AdminUser & Record<string, unknown>
    const clone = { ...record }
    delete clone.id
    delete clone.name
    delete clone.email
    delete clone.emailVerified
    delete clone.image
    delete clone.createdAt
    delete clone.updatedAt
    delete clone.role
    delete clone.banned
    delete clone.banReason
    delete clone.banExpires
    delete clone.username

    return clone
}

function formatRoleLabel(role: AdminUser['role']) {
    if (Array.isArray(role)) {
        return role.join(', ')
    }

    return role ?? 'user'
}

function mapUserToEditForm(user: AdminUser | null | undefined): EditUserFormState {
    if (!user) {
        return emptyEditForm
    }

    return {
        name: user.name ?? '',
        email: user.email ?? '',
        image: (user as { image?: string | null }).image ?? '',
        username: (user as { username?: string | null }).username ?? '',
        data: JSON.stringify(stripKnownUserFields(user), null, 2),
    }
}

/**
 * Admin user-management panel powered entirely by Better Auth hooks.
 */
export function AdminSettingsPanel({
    section = 'all',
}: {
    section?: AdminSettingsPanelSection
}) {
    const { data: authSession } = useAuthQuery()
    const { data: modelProvidersData } = useAgentModelProviders()
    const [search, setSearch] = React.useState('')
    const [searchField, setSearchField] = React.useState<'name' | 'email'>('email')
    const [offset, setOffset] = React.useState(0)
    const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
    const [createOpen, setCreateOpen] = React.useState(false)
    const [createForm, setCreateForm] = React.useState<CreateUserFormState>(emptyCreateForm)
    const [editForm, setEditForm] = React.useState<EditUserFormState>(emptyEditForm)
    const [banForm, setBanForm] = React.useState<BanFormState>(emptyBanForm)
    const [passwordForm, setPasswordForm] = React.useState<PasswordFormState>(emptyPasswordForm)
    const [deleteConfirm, setDeleteConfirm] = React.useState('')

    const debouncedSearch = useDebounce(search, 300)

    const usersQuery = useAdminUsersQuery({
        searchValue: debouncedSearch || undefined,
        searchField,
        limit: pageSize,
        offset,
        sortBy: 'createdAt',
        sortDirection: 'desc',
    })
    const createUser = useCreateAdminUserMutation()
    const updateUser = useUpdateAdminUserMutation()
    const deleteUser = useDeleteAdminUserMutation()
    const setRole = useSetAdminUserRoleMutation()
    const banUser = useBanAdminUserMutation()
    const unbanUser = useUnbanAdminUserMutation()
    const impersonateUser = useImpersonateAdminUserMutation()
    const setUserPassword = useSetAdminUserPasswordMutation()
    const revokeSession = useRevokeAdminUserSessionMutation()
    const revokeSessions = useRevokeAdminUserSessionsMutation()

    const users = React.useMemo(
        () => (usersQuery.data?.users ?? []) as AdminUser[],
        [usersQuery.data],
    )
    const total = usersQuery.data?.total ?? 0
    const currentUser = authSession?.user
    const modelProviders = React.useMemo(
        () => modelProvidersData?.providers ?? [],
        [modelProvidersData],
    )
    const connectedProviders = modelProviders.filter((provider) => provider.connected)
    const connectedModelCount = connectedProviders.reduce(
        (count, provider) => count + provider.models.length,
        0,
    )

    React.useEffect(() => {
        if (!selectedUserId && users.length > 0) {
            setSelectedUserId(users[0].id)
        }
    }, [selectedUserId, users])

    const selectedUserQuery = useAdminUserQuery(selectedUserId ?? undefined)
    const selectedUser = selectedUserQuery.data ?? users.find((user) => user.id === selectedUserId) ?? null
    const selectedSessionsQuery = useAdminUserSessionsQuery(selectedUserId ?? undefined)
    const selectedSessions = selectedSessionsQuery.data?.sessions ?? []

    React.useEffect(() => {
        setEditForm(mapUserToEditForm(selectedUser))
        setBanForm({
            reason: selectedUser?.banReason ?? '',
            expiresIn: selectedUser?.banExpires
                ? String(Math.max(1, Math.round((new Date(selectedUser.banExpires).getTime() - Date.now()) / 1000)))
                : '',
        })
    }, [selectedUser])

    const stats = React.useMemo(
        () => ({
            admins: users.filter((user) => formatRoleLabel(user.role) === 'admin').length,
            banned: users.filter((user) => Boolean(user.banned)).length,
        }),
        [users],
    )

    async function handleCreateUser(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()
        const data = safeJsonParse<Record<string, unknown>>(createForm.data, {})

        await createUser.mutateAsync({
            name: createForm.name.trim(),
            email: createForm.email.trim(),
            password: createForm.password.trim() || undefined,
            role: createForm.role,
            data: {
                username: createForm.username.trim() || undefined,
                ...data,
            },
        })

        setCreateForm(emptyCreateForm)
        setCreateOpen(false)
    }

    async function handleSaveUser(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selectedUser) {
            return
        }

        const data = safeJsonParse<Record<string, unknown>>(editForm.data, {})
        await updateUser.mutateAsync({
            userId: selectedUser.id,
            data: {
                name: editForm.name.trim(),
                email: editForm.email.trim(),
                image: editForm.image.trim() || null,
                username: editForm.username.trim() || undefined,
                ...data,
            },
        })
    }

    async function handleRoleChange(role: AdminRole) {
        if (!selectedUser) {
            return
        }

        await setRole.mutateAsync({
            userId: selectedUser.id,
            role,
        })
    }

    async function handleBan() {
        if (!selectedUser) {
            return
        }

        await banUser.mutateAsync({
            userId: selectedUser.id,
            banReason: banForm.reason.trim() || undefined,
            banExpiresIn: banForm.expiresIn ? Number(banForm.expiresIn) : undefined,
        })
    }

    async function handleUnban() {
        if (!selectedUser) {
            return
        }

        await unbanUser.mutateAsync({ userId: selectedUser.id })
    }

    async function handleSetPassword(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selectedUser || passwordForm.newPassword.length < 8 || passwordForm.newPassword !== passwordForm.confirmPassword) {
            return
        }

        await setUserPassword.mutateAsync({
            userId: selectedUser.id,
            newPassword: passwordForm.newPassword,
        })
        setPasswordForm(emptyPasswordForm)
    }

    async function handleDeleteUser() {
        if (!selectedUser || deleteConfirm !== 'delete') {
            return
        }

        await deleteUser.mutateAsync({ userId: selectedUser.id })
        setDeleteConfirm('')
        setSelectedUserId(null)
    }

    async function handleImpersonate() {
        if (!selectedUser) {
            return
        }

        await impersonateUser.mutateAsync({ userId: selectedUser.id })
        window.location.assign('/chat')
    }

    const refreshDisabled = usersQuery.isFetching
    const detailBusy = selectedUserQuery.isLoading || selectedSessionsQuery.isLoading
    const showRuntime = section === 'all' || section === 'runtime'
    const showUsers = section === 'all' || section === 'users'

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background to-muted/20 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="secondary">Admin console</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Better Auth admin hooks plus live Mastra provider context.
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline">{formatRoleLabel(currentUser?.role)}</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Current signed-in role from your Better Auth session.
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline">{total} users</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Total Better Auth users loaded in the current page of results.
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline">{stats.admins} admins</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Users with the admin role that can access moderation actions.
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline">{stats.banned} banned</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Users currently blocked by Better Auth moderation state.
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline">
                                            {connectedProviders.length} providers / {connectedModelCount} models
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Live provider inventory from Mastra&apos;s model registry.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                                    Manage users, roles, bans, sessions, and impersonation from one place
                                </h2>
                                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                    This admin console now reads the signed-in user from Better Auth and
                                    overlays live Mastra provider context so the page explains both the
                                    account and runtime state.
                                </p>
                            </div>
                        </div>
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <UserPlus className="size-4" />
                                    Create user
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Create user</DialogTitle>
                                    <DialogDescription>
                                        Create a Better Auth user with an optional password, role, and custom data.
                                    </DialogDescription>
                                </DialogHeader>
                                <form className="grid gap-4" onSubmit={handleCreateUser}>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="create-name">Name</Label>
                                            <Input
                                                id="create-name"
                                                value={createForm.name}
                                                onChange={(event) =>
                                                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                                                }
                                                placeholder="Full name"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="create-email">Email</Label>
                                            <Input
                                                id="create-email"
                                                type="email"
                                                value={createForm.email}
                                                onChange={(event) =>
                                                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                                                }
                                                placeholder="person@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="create-username">Username</Label>
                                            <Input
                                                id="create-username"
                                                value={createForm.username}
                                                onChange={(event) =>
                                                    setCreateForm((current) => ({ ...current, username: event.target.value }))
                                                }
                                                placeholder="preferred handle"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="create-role">Role</Label>
                                            <Select
                                                value={createForm.role}
                                                onValueChange={(value) =>
                                                    setCreateForm((current) => ({
                                                        ...current,
                                                        role: value as AdminRole,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger id="create-role">
                                                    <SelectValue placeholder="Choose role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                Admin gives access to moderation, impersonation, and session tools.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-password">Password</Label>
                                        <Input
                                            id="create-password"
                                            type="password"
                                            value={createForm.password}
                                            onChange={(event) =>
                                                setCreateForm((current) => ({ ...current, password: event.target.value }))
                                            }
                                            placeholder="Optional initial password"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-data">Custom data JSON</Label>
                                        <textarea
                                            id="create-data"
                                            title="Custom user data JSON"
                                            placeholder='{"team":"platform"}'
                                            className="min-h-28 rounded-md border border-input bg-transparent p-3 text-sm outline-none"
                                            value={createForm.data}
                                            onChange={(event) =>
                                                setCreateForm((current) => ({ ...current, data: event.target.value }))
                                            }
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={createUser.isPending}>
                                            {createUser.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                                            Create user
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </section>

                {showUsers ? (
                    <Card>
                    <CardHeader>
                        <CardTitle>Find users</CardTitle>
                        <CardDescription>
                            Search by name or email and move quickly through pages of results.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
                            <div className="grid gap-2">
                                <Label htmlFor="user-search">Search</Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="user-search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Search users"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Search field</Label>
                                <Select value={searchField} onValueChange={(value) => setSearchField(value as 'name' | 'email')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose field" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="name">Name</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => usersQuery.refetch()}
                                            disabled={refreshDisabled}
                                        >
                                            <RefreshCw className={refreshDisabled ? 'size-4 animate-spin' : 'size-4'} />
                                            Refresh
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Refresh users</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                                Showing {total === 0 ? 0 : offset + 1}-{Math.min(offset + pageSize, total)} of {total}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={offset === 0}
                                    onClick={() => setOffset((current) => Math.max(0, current - pageSize))}
                                >
                                    Previous
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={offset + pageSize >= total}
                                    onClick={() => setOffset((current) => current + pageSize)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                    </Card>
                ) : null}

                {showRuntime ? (
                    <Card>
                    <CardHeader>
                        <CardTitle>Runtime context</CardTitle>
                        <CardDescription>
                            See which Better Auth account is active and which Mastra providers are
                            available before you take action.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary">
                                    {currentUser?.email ?? 'No session loaded'}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                Signed-in Better Auth session used for admin operations.
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="outline">
                                    {modelProviders.length} provider{modelProviders.length === 1 ? '' : 's'}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                Provider list returned by Mastra&apos;s live model registry.
                            </TooltipContent>
                        </Tooltip>
                        {modelProviders.slice(0, 6).map((provider) => (
                            <Tooltip key={provider.id}>
                                <TooltipTrigger asChild>
                                    <Badge variant={provider.connected ? 'secondary' : 'outline'}>
                                        {provider.name}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {provider.connected
                                        ? `${provider.models.length} model${provider.models.length === 1 ? '' : 's'} available`
                                        : 'Provider is currently disconnected'}
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </CardContent>
                    </Card>
                ) : null}

                {showUsers ? (
                    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Users</CardTitle>
                            <CardDescription>
                                Select a user to open the management drawer on the right.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Created</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => {
                                        const active = selectedUserId === user.id
                                        const roleLabel = formatRoleLabel(user.role)

                                        return (
                                            <TableRow
                                                key={user.id}
                                                className={active ? 'cursor-pointer bg-muted/40' : 'cursor-pointer hover:bg-muted/30'}
                                                onClick={() => setSelectedUserId(user.id)}
                                            >
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-foreground">{user.name}</div>
                                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {roleLabel}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant={user.banned ? 'destructive' : 'outline'}>
                                                            {user.banned ? 'Banned' : 'Active'}
                                                        </Badge>
                                                        <Badge variant={user.emailVerified ? 'secondary' : 'outline'}>
                                                            {user.emailVerified ? 'Verified' : 'Unverified'}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{formatDate(user.createdAt)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Selected user</CardTitle>
                                <CardDescription>
                                    Edit the record, manage the role, set a password, ban or unban, and inspect sessions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {selectedUser ? (
                                    <>
                                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="text-lg font-semibold text-foreground">
                                                        {selectedUser.name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant={selectedUser.banned ? 'destructive' : 'outline'}>
                                                        {selectedUser.banned ? 'Banned' : 'Active'}
                                                    </Badge>
                                                    <Badge variant="secondary">
                                                        {formatRoleLabel(selectedUser.role)}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                                <span>Created {formatDate(selectedUser.createdAt)}</span>
                                                <span>Updated {formatDate(selectedUser.updatedAt)}</span>
                                                <span>Email status: {selectedUser.emailVerified ? 'verified' : 'not verified'}</span>
                                            </div>
                                        </div>

                                        <form className="grid gap-4" onSubmit={handleSaveUser}>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="edit-name">Name</Label>
                                                    <Input
                                                        id="edit-name"
                                                        value={editForm.name}
                                                        onChange={(event) =>
                                                            setEditForm((current) => ({ ...current, name: event.target.value }))
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="edit-email">Email</Label>
                                                    <Input
                                                        id="edit-email"
                                                        type="email"
                                                        value={editForm.email}
                                                        onChange={(event) =>
                                                            setEditForm((current) => ({ ...current, email: event.target.value }))
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="edit-username">Username</Label>
                                                    <Input
                                                        id="edit-username"
                                                        value={editForm.username}
                                                        onChange={(event) =>
                                                            setEditForm((current) => ({ ...current, username: event.target.value }))
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="edit-image">Avatar URL</Label>
                                                    <Input
                                                        id="edit-image"
                                                        value={editForm.image}
                                                        onChange={(event) =>
                                                            setEditForm((current) => ({ ...current, image: event.target.value }))
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-data">Custom data JSON</Label>
                                                <textarea
                                                    id="edit-data"
                                                    title="User custom data JSON"
                                                    placeholder='{"department":"platform"}'
                                                    className="min-h-28 rounded-md border border-input bg-transparent p-3 text-sm outline-none"
                                                    value={editForm.data}
                                                    onChange={(event) =>
                                                        setEditForm((current) => ({ ...current, data: event.target.value }))
                                                    }
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button type="submit" disabled={updateUser.isPending}>
                                                    {updateUser.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                                                    Save changes
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleRoleChange('admin')}
                                                    disabled={updateUser.isPending || setRole.isPending}
                                                >
                                                    <Crown className="size-4" />
                                                    Set admin
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleRoleChange('user')}
                                                    disabled={updateUser.isPending || setRole.isPending}
                                                >
                                                    <ShieldOff className="size-4" />
                                                    Set user
                                                </Button>
                                            </div>
                                        </form>

                                        <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="ban-reason">Ban reason</Label>
                                                    <Input
                                                        id="ban-reason"
                                                        value={banForm.reason}
                                                        onChange={(event) =>
                                                            setBanForm((current) => ({ ...current, reason: event.target.value }))
                                                        }
                                                        placeholder="Policy violation"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="ban-expires">Ban expires in seconds</Label>
                                                    <Input
                                                        id="ban-expires"
                                                        type="number"
                                                        value={banForm.expiresIn}
                                                        onChange={(event) =>
                                                            setBanForm((current) => ({ ...current, expiresIn: event.target.value }))
                                                        }
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button type="button" variant="outline" onClick={handleBan} disabled={banUser.isPending}>
                                                    <Ban className="size-4" />
                                                    Ban user
                                                </Button>
                                                <Button type="button" variant="outline" onClick={handleUnban} disabled={unbanUser.isPending}>
                                                    <Shield className="size-4" />
                                                    Unban user
                                                </Button>
                                                <Button type="button" variant="outline" onClick={handleImpersonate} disabled={impersonateUser.isPending}>
                                                    <Sparkles className="size-4" />
                                                    Impersonate
                                                </Button>
                                            </div>
                                        </div>

                                        <form className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4" onSubmit={handleSetPassword}>
                                            <div>
                                                <h3 className="font-medium text-foreground">Reset password</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Set a fresh password for this user.
                                                </p>
                                            </div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="new-password">New password</Label>
                                                    <Input
                                                        id="new-password"
                                                        type="password"
                                                        value={passwordForm.newPassword}
                                                        onChange={(event) =>
                                                            setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
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
                                            <Button
                                                type="submit"
                                                disabled={
                                                    setUserPassword.isPending ||
                                                    passwordForm.newPassword.length < 8 ||
                                                    passwordForm.newPassword !== passwordForm.confirmPassword
                                                }
                                            >
                                                {setUserPassword.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                                                Set password
                                            </Button>
                                        </form>

                                        <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="font-medium text-foreground">Sessions</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Revoke one session or all sessions for this user.
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => revokeSessions.mutate({ userId: selectedUser.id })}
                                                    disabled={revokeSessions.isPending}
                                                >
                                                    <RefreshCw className="size-4" />
                                                    Revoke all
                                                </Button>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Device</TableHead>
                                                            <TableHead>Expires</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right">Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {selectedSessions.map((userSession) => (
                                                            <TableRow key={userSession.id}>
                                                                <TableCell>
                                                                    <div className="space-y-1">
                                                                        <div className="font-medium text-foreground">
                                                                            {userSession.userAgent ?? 'Unknown device'}
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {userSession.ipAddress ?? 'IP unavailable'}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>{formatDate(userSession.expiresAt)}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">
                                                                        {userSession.impersonatedBy ? 'Impersonated' : 'Regular'}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon-sm"
                                                                                onClick={() => revokeSession.mutate({ sessionToken: userSession.token })}
                                                                            >
                                                                                <Trash2 className="size-4" />
                                                                                <span className="sr-only">Revoke session</span>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Revoke session</TooltipContent>
                                                                    </Tooltip>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                                            <Label htmlFor="delete-confirm">Type delete to remove user</Label>
                                            <Input
                                                id="delete-confirm"
                                                value={deleteConfirm}
                                                onChange={(event) => setDeleteConfirm(event.target.value)}
                                                placeholder="delete"
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    onClick={handleDeleteUser}
                                                    disabled={deleteUser.isPending || deleteConfirm !== 'delete'}
                                                >
                                                    {deleteUser.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                                    Delete user
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
                                        {detailBusy ? 'Loading user details…' : 'Select a user to inspect their profile and sessions.'}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    </section>
                ) : null}
            </div>
        </TooltipProvider>
    )
}
