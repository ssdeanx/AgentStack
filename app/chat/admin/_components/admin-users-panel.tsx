'use client'

import * as React from 'react'
import {
    Ban,
    Check,
    Crown,
    Loader2,
    MoreHorizontal,
    PencilLine,
    Plus,
    RotateCw,
    Search,
    Shield,
    ShieldOff,
    Sparkles,
    Trash2,
    UserPlus,
} from 'lucide-react'

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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/tooltip'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'
import type { AdminUser } from '@/lib/hooks/use-auth-query'
import {
    useAdminUserHasPermissionMutation,
    useAdminUserQuery,
    useAdminUserSessionsQuery,
    useAdminUsersQuery,
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
import { Badge } from '@/ui/badge'

type AdminRole = 'user' | 'admin'

type CreateUserFormState = {
    name: string
    email: string
    password: string
    role: AdminRole
    username: string
    data: string
}

type UserEditFormState = {
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

type PermissionFormState = {
    subject: string
    action: string
    scope: string
}

const pageSize = 20

const emptyCreateForm: CreateUserFormState = {
    name: '',
    email: '',
    password: '',
    role: 'user',
    username: '',
    data: '{}',
}

const emptyEditForm: UserEditFormState = {
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

const emptyPermissionForm: PermissionFormState = {
    subject: '',
    action: '',
    scope: '',
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

function extractAdditionalUserData(user: AdminUser | null | undefined) {
    if (!user) {
        return {}
    }

    const {
        id,
        createdAt,
        updatedAt,
        email,
        emailVerified,
        name,
        image,
        role,
        banned,
        banReason,
        banExpires,
        ...rest
    } = user as AdminUser & Record<string, unknown>

    void id
    void createdAt
    void updatedAt
    void email
    void emailVerified
    void name
    void image
    void role
    void banned
    void banReason
    void banExpires

    return rest
}

function mapUserToEditForm(user: AdminUser | null | undefined): UserEditFormState {
    if (!user) {
        return emptyEditForm
    }

    return {
        name: user.name ?? '',
        email: user.email ?? '',
        image: (user as { image?: string | null }).image ?? '',
        username: (user as { username?: string | null }).username ?? '',
        data: JSON.stringify(extractAdditionalUserData(user), null, 2),
    }
}

/**
 * Admin user-management console for Better Auth.
 */
export function AdminSettingsPanel() {
    const [search, setSearch] = React.useState('')
    const [searchField, setSearchField] = React.useState<'name' | 'email'>('email')
    const [offset, setOffset] = React.useState(0)
    const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
    const [createOpen, setCreateOpen] = React.useState(false)
    const [createForm, setCreateForm] = React.useState<CreateUserFormState>(emptyCreateForm)
    const [editForm, setEditForm] = React.useState<UserEditFormState>(emptyEditForm)
    const [banForm, setBanForm] = React.useState<BanFormState>(emptyBanForm)
    const [passwordForm, setPasswordForm] = React.useState<PasswordFormState>(emptyPasswordForm)
    const [permissionForm, setPermissionForm] = React.useState<PermissionFormState>(emptyPermissionForm)
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
    const permissionCheck = useAdminUserHasPermissionMutation()

    const users = React.useMemo(
        () => (usersQuery.data?.users ?? []) as AdminUser[],
        [usersQuery.data],
    )
    const total = usersQuery.data?.total ?? 0

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

    const filteredCount = total
    const pageLabelStart = total === 0 ? 0 : offset + 1
    const pageLabelEnd = Math.min(offset + pageSize, total)
    const adminCount = users.filter((user) => user.role === 'admin').length
    const bannedCount = users.filter((user) => Boolean(user.banned)).length

    const createBusy = createUser.isPending
    const updateBusy = updateUser.isPending || setRole.isPending || banUser.isPending || unbanUser.isPending
    const detailBusy = selectedUserQuery.isLoading || selectedSessionsQuery.isLoading
    const deleteBusy = deleteUser.isPending || impersonateUser.isPending || setUserPassword.isPending

    async function handleCreateUser(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()

        const extraData = safeJsonParse<Record<string, unknown>>(createForm.data, {})
        await createUser.mutateAsync({
            name: createForm.name.trim(),
            email: createForm.email.trim(),
            password: createForm.password.trim() || undefined,
            role: createForm.role,
            data: {
                username: createForm.username.trim() || undefined,
                ...extraData,
            },
        })

        setCreateForm(emptyCreateForm)
        setCreateOpen(false)
    }

    async function handleUpdateUser(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selectedUser) {
            return
        }

        const extraData = safeJsonParse<Record<string, unknown>>(editForm.data, {})
        await updateUser.mutateAsync({
            userId: selectedUser.id,
            data: {
                name: editForm.name.trim(),
                email: editForm.email.trim(),
                image: editForm.image.trim() || null,
                username: editForm.username.trim() || undefined,
                ...extraData,
            },
        })
    }

    async function handleSetRoleForUser(userId: string, role: AdminRole) {
        if (!userId) {
            return
        }

        await setRole.mutateAsync({
            userId,
            role,
        })
    }

    async function handleBanUserForUser(userId: string) {
        if (!userId) {
            return
        }

        await banUser.mutateAsync({
            userId,
            banReason: banForm.reason.trim() || undefined,
            banExpiresIn: banForm.expiresIn ? Number(banForm.expiresIn) : undefined,
        })
    }

    async function handleUnbanUserForUser(userId: string) {
        if (!userId) {
            return
        }

        await unbanUser.mutateAsync({ userId })
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

    async function handleDeleteUser(userId: string) {
        if (!userId || deleteConfirm !== 'delete') {
            return
        }

        await deleteUser.mutateAsync({ userId })
        setDeleteConfirm('')
    }

    async function handleImpersonateUser(userId: string) {
        if (!userId) {
            return
        }

        await impersonateUser.mutateAsync({ userId })
        window.location.assign('/chat')
    }

    async function handleRevokePermissionCheck(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!selectedUser) {
            return
        }

        await permissionCheck.mutateAsync({
            userId: selectedUser.id,
            permission: {
                [permissionForm.subject.trim() || 'chat']: [permissionForm.action.trim() || 'read'],
            },
            scope: permissionForm.scope.trim() ? [permissionForm.scope.trim()] : undefined,
        } as never)
    }

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <section className="rounded-3xl border border-border/60 bg-linear-to-br from-background to-muted/20 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">Admin console</Badge>
                                <Badge variant="outline">{total} users</Badge>
                                <Badge variant="outline">{adminCount} admins</Badge>
                                <Badge variant="outline">{bannedCount} banned</Badge>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                                    Manage users, roles, bans, sessions, and impersonation from one place
                                </h2>
                                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                    This dashboard uses Better Auth admin hooks only. No browser storage,
                                    no fake state, and no backend schema changes.
                                </p>
                            </div>
                        </div>
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="size-4" />
                                    Create user
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Create user</DialogTitle>
                                    <DialogDescription>
                                        Create a new Better Auth user with optional password, role, and
                                        custom data.
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
                                        <Button type="submit" disabled={createBusy}>
                                            {createBusy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                                            Create user
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </section>

                <Card>
                    <CardHeader>
                        <CardTitle>Find users</CardTitle>
                        <CardDescription>
                            Search by email or name, then jump into a detailed user record.
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
                                            disabled={usersQuery.isFetching}
                                        >
                                            <RotateCw className={cn('size-4', usersQuery.isFetching && 'animate-spin')} />
                                            Refresh
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Refresh users</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                                Showing {pageLabelStart}-{pageLabelEnd} of {filteredCount}
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

                <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Users</CardTitle>
                            <CardDescription>
                                Table view with direct admin actions for the selected account.
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
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow
                                            key={user.id}
                                            className={cn(
                                                'cursor-pointer transition-colors hover:bg-muted/40',
                                                selectedUserId === user.id && 'bg-muted/40',
                                            )}
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
                                                    {Array.isArray(user.role) ? user.role.join(', ') : user.role ?? 'user'}
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
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon-sm" onClick={(event) => event.stopPropagation()}>
                                                            <MoreHorizontal className="size-4" />
                                                            <span className="sr-only">Open actions</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => setSelectedUserId(user.id)}
                                                        >
                                                            <PencilLine className="size-4" />
                                                            View details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleSetRoleForUser(user.id, 'admin')}
                                                        >
                                                            <Shield className="size-4" />
                                                            Promote to admin
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleSetRoleForUser(user.id, 'user')}
                                                        >
                                                            <ShieldOff className="size-4" />
                                                            Demote to user
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                await handleImpersonateUser(user.id)
                                                            }}
                                                        >
                                                            <Sparkles className="size-4" />
                                                            Impersonate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onClick={async () => {
                                                                await handleDeleteUser(user.id)
                                                            }}
                                                        >
                                                            <Trash2 className="size-4" />
                                                            Delete user
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

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Selected user</CardTitle>
                                <CardDescription>
                                    Profile, role, bans, password, and custom data for the chosen account.
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
                                                    <div className="text-sm text-muted-foreground">
                                                        {selectedUser.email}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant={selectedUser.banned ? 'destructive' : 'outline'}>
                                                        {selectedUser.banned ? 'Banned' : 'Active'}
                                                    </Badge>
                                                    <Badge variant="secondary">
                                                        {Array.isArray(selectedUser.role)
                                                            ? selectedUser.role.join(', ')
                                                            : selectedUser.role ?? 'user'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                                <span>Created {formatDate(selectedUser.createdAt)}</span>
                                                <span>Updated {formatDate(selectedUser.updatedAt)}</span>
                                                <span>
                                                    Email status:{' '}
                                                    {selectedUser.emailVerified ? 'verified' : 'not verified'}
                                                </span>
                                            </div>
                                        </div>

                                        <form className="grid gap-4" onSubmit={handleUpdateUser}>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="edit-name">Name</Label>
                                                    <Input
                                                        id="edit-name"
                                                        value={editForm.name}
                                                        onChange={(event) =>
                                                            setEditForm((current) => ({
                                                                ...current,
                                                                name: event.target.value,
                                                            }))
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
                                                            setEditForm((current) => ({
                                                                ...current,
                                                                email: event.target.value,
                                                            }))
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
                                                            setEditForm((current) => ({
                                                                ...current,
                                                                username: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="edit-image">Avatar URL</Label>
                                                    <Input
                                                        id="edit-image"
                                                        value={editForm.image}
                                                        onChange={(event) =>
                                                            setEditForm((current) => ({
                                                                ...current,
                                                                image: event.target.value,
                                                            }))
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
                                                        setEditForm((current) => ({
                                                            ...current,
                                                            data: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button type="submit" disabled={updateBusy}>
                                                    {updateBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                                                    Save changes
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleSetRoleForUser(selectedUser.id, 'admin')}
                                                    disabled={updateBusy}
                                                >
                                                    <Crown className="size-4" />
                                                    Set admin
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleSetRoleForUser(selectedUser.id, 'user')}
                                                    disabled={updateBusy}
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
                                                            setBanForm((current) => ({
                                                                ...current,
                                                                reason: event.target.value,
                                                            }))
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
                                                            setBanForm((current) => ({
                                                                ...current,
                                                                expiresIn: event.target.value,
                                                            }))
                                                        }
                                                        placeholder="Optional"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button type="button" variant="outline" onClick={() => handleBanUserForUser(selectedUser.id)} disabled={updateBusy}>
                                                    <Ban className="size-4" />
                                                    Ban user
                                                </Button>
                                                <Button type="button" variant="outline" onClick={() => handleUnbanUserForUser(selectedUser.id)} disabled={updateBusy}>
                                                    <Shield className="size-4" />
                                                    Unban user
                                                </Button>
                                            </div>
                                        </div>

                                        <form className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4" onSubmit={handleSetPassword}>
                                            <div>
                                                <h3 className="font-medium text-foreground">Reset password</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Set a fresh password for the selected user.
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
                                            <Button type="submit" disabled={setUserPassword.isPending || passwordForm.newPassword !== passwordForm.confirmPassword}>
                                                {setUserPassword.isPending ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
                                                Set password
                                            </Button>
                                        </form>

                                        <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="permission-subject">Permission subject</Label>
                                                    <Input
                                                        id="permission-subject"
                                                        value={permissionForm.subject}
                                                        onChange={(event) =>
                                                            setPermissionForm((current) => ({
                                                                ...current,
                                                                subject: event.target.value,
                                                            }))
                                                        }
                                                        placeholder="chat"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="permission-action">Action</Label>
                                                    <Input
                                                        id="permission-action"
                                                        value={permissionForm.action}
                                                        onChange={(event) =>
                                                            setPermissionForm((current) => ({
                                                                ...current,
                                                                action: event.target.value,
                                                            }))
                                                        }
                                                        placeholder="read"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="permission-scope">Scope</Label>
                                                <Input
                                                    id="permission-scope"
                                                    value={permissionForm.scope}
                                                    onChange={(event) =>
                                                        setPermissionForm((current) => ({
                                                            ...current,
                                                            scope: event.target.value,
                                                        }))
                                                    }
                                                    placeholder="Optional scope"
                                                />
                                            </div>
                                            <form onSubmit={handleRevokePermissionCheck} className="flex flex-wrap gap-2">
                                                <Button type="submit" variant="outline" disabled={permissionCheck.isPending}>
                                                    {permissionCheck.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                                    Check permission
                                                </Button>
                                            </form>
                                        </div>

                                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="font-medium text-foreground">Sessions</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Revoke a single session or clear every session for this user.
                                                    </p>
                                                </div>
                                                <Button type="button" variant="outline" onClick={() => revokeSessions.mutate({ userId: selectedUser.id })}>
                                                    <RotateCw className="size-4" />
                                                    Revoke all
                                                </Button>
                                            </div>
                                            <div className="mt-4 overflow-x-auto">
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
                                                                    <Badge variant="outline">{userSession.impersonatedBy ? 'Impersonated' : 'Regular'}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        onClick={() => revokeSession.mutate({ sessionToken: userSession.token })}
                                                                    >
                                                                        <Trash2 className="size-4" />
                                                                        <span className="sr-only">Revoke session</span>
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Button type="button" onClick={() => handleImpersonateUser(selectedUser.id)} disabled={deleteBusy}>
                                                <Sparkles className="size-4" />
                                                Impersonate user
                                            </Button>
                                            <Button type="button" variant="destructive" onClick={() => handleDeleteUser(selectedUser.id)} disabled={deleteBusy || deleteConfirm !== 'delete'}>
                                                <Trash2 className="size-4" />
                                                Delete user
                                            </Button>
                                        </div>
                                        <div className="grid gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                                            <Label htmlFor="delete-confirm">Type delete to confirm removal</Label>
                                            <Input
                                                id="delete-confirm"
                                                value={deleteConfirm}
                                                onChange={(event) => setDeleteConfirm(event.target.value)}
                                                placeholder="delete"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Deletion is permanent and removes the Better Auth user record.
                                            </p>
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
            </div>
        </TooltipProvider>
    )
}
