'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authClient } from '@/lib/auth-client'

export const authQueryKeys = {
    all: ['auth'] as const,
    session: () => [...authQueryKeys.all, 'session'] as const,
    sessions: () => [...authQueryKeys.all, 'sessions'] as const,
    adminUsers: (params: AdminUsersQueryParams) =>
        [...authQueryKeys.all, 'admin-users', params] as const,
    adminUser: (userId: string) => [...authQueryKeys.all, 'admin-user', userId] as const,
    adminUserSessions: (userId: string) =>
        [...authQueryKeys.all, 'admin-user-sessions', userId] as const,
    apiKeys: (params: ApiKeyListQueryParams) => [...authQueryKeys.all, 'api-keys', params] as const,
}

/**
 * Query parameters accepted by Better Auth's admin user listing endpoint.
 */
export type AdminUsersQueryParams = {
    searchValue?: string
    searchField?: 'name' | 'email'
    searchOperator?: 'contains' | 'starts_with' | 'ends_with'
    limit?: number
    offset?: number
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
    filterField?: string
    filterValue?: string | number | boolean | string[] | number[]
    filterOperator?:
        | 'eq'
        | 'ne'
        | 'gt'
        | 'gte'
        | 'lt'
        | 'lte'
        | 'in'
        | 'not_in'
        | 'contains'
        | 'starts_with'
        | 'ends_with'
}

/**
 * Query parameters accepted by Better Auth's API-key list endpoint.
 */
export type ApiKeyListQueryParams = {
    configId?: string
    organizationId?: string
    limit?: number
    offset?: number
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
}

type SessionResponse = Awaited<ReturnType<typeof authClient.getSession>>
type SessionData = NonNullable<SessionResponse['data']>
type CurrentSessionsResponse = Awaited<ReturnType<typeof authClient.listSessions>>
type CurrentSessionsData = NonNullable<CurrentSessionsResponse['data']>
export type CurrentSession = CurrentSessionsData[number]

type UsernameAvailabilityResponse = Awaited<ReturnType<typeof authClient.isUsernameAvailable>>
type UsernameAvailabilityData = NonNullable<UsernameAvailabilityResponse['data']>
type UsernameAvailabilityInput = Parameters<typeof authClient.isUsernameAvailable>[0]
type UsernameSignInInput = Parameters<(typeof authClient)['signIn']['username']>[0]
type UsernameSignUpInput = Parameters<(typeof authClient)['signUp']['email']>[0]
type UsernameUpdateInput = Parameters<typeof authClient.updateUser>[0]

type AdminUsersResponse = Awaited<ReturnType<typeof authClient.admin.listUsers>>
type AdminUsersData = NonNullable<AdminUsersResponse['data']>
export type AdminUser = AdminUsersData['users'][number]

type AdminUserResponse = Awaited<ReturnType<typeof authClient.admin.getUser>>
type AdminUserData = NonNullable<AdminUserResponse['data']>

type AdminUserSessionsResponse = Awaited<ReturnType<typeof authClient.admin.listUserSessions>>
type AdminUserSessionsData = NonNullable<AdminUserSessionsResponse['data']>
export type AdminUserSession = AdminUserSessionsData['sessions'][number]

type ApiKeyListResponse = Awaited<ReturnType<typeof authClient.apiKey.list>>
type ApiKeyListData = NonNullable<ApiKeyListResponse['data']>
export type ApiKeyRecord = ApiKeyListData['apiKeys'][number]

type UpdateCurrentUserInput = Parameters<typeof authClient.updateUser>[0]
type ChangePasswordInput = Parameters<typeof authClient.changePassword>[0]
type DeleteUserInput = Parameters<typeof authClient.deleteUser>[0]
type RequestPasswordResetInput = Parameters<typeof authClient.requestPasswordReset>[0]
type RevokeCurrentSessionInput = Parameters<typeof authClient.revokeSession>[0]
type CreateAdminUserInput = Parameters<typeof authClient.admin.createUser>[0]
type UpdateAdminUserInput = Parameters<typeof authClient.admin.updateUser>[0]
type SetAdminRoleInput = Parameters<typeof authClient.admin.setRole>[0]
type BanAdminUserInput = Parameters<typeof authClient.admin.banUser>[0]
type UnbanAdminUserInput = Parameters<typeof authClient.admin.unbanUser>[0]
type RemoveAdminUserInput = Parameters<typeof authClient.admin.removeUser>[0]
type ImpersonateAdminUserInput = Parameters<typeof authClient.admin.impersonateUser>[0]
type RevokeAdminUserSessionInput = Parameters<typeof authClient.admin.revokeUserSession>[0]
type RevokeAdminUserSessionsInput = Parameters<typeof authClient.admin.revokeUserSessions>[0]
type SetAdminUserPasswordInput = Parameters<typeof authClient.admin.setUserPassword>[0]
type AdminHasPermissionInput = Parameters<typeof authClient.admin.hasPermission>[0]
type CreateApiKeyInput = Parameters<typeof authClient.apiKey.create>[0]
type UpdateApiKeyInput = Parameters<typeof authClient.apiKey.update>[0]
type DeleteApiKeyInput = Parameters<typeof authClient.apiKey.delete>[0]

function toError(message: string, error: unknown): Error {
    if (error instanceof Error) {
        return error
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
        return new Error(String((error as { message?: unknown }).message ?? message))
    }

    return new Error(message)
}

function ensureNoError<T>(response: { data: T | null | undefined; error: unknown }, message: string) {
    if (response.error) {
        throw toError(message, response.error)
    }

    return response.data ?? null
}

/**
 * Returns the current Better Auth session.
 */
export function useAuthQuery() {
    return useQuery({
        queryKey: authQueryKeys.session(),
        queryFn: async (): Promise<SessionData | null> => {
            const response = await authClient.getSession()
            return ensureNoError(response, 'Unable to load the current session.')
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    })
}

/**
 * Returns the current authenticated user object.
 */
export function useAuthUser() {
    const sessionQuery = useAuthQuery()

    return {
        ...sessionQuery,
        data: sessionQuery.data?.user ?? null,
    }
}

/**
 * Checks whether a username is available.
 */
export function useUsernameAvailabilityQuery(username: string) {
    const normalizedUsername = username.trim()

    return useQuery({
        queryKey: [...authQueryKeys.all, 'username-availability', normalizedUsername] as const,
        enabled: normalizedUsername.length > 0,
        queryFn: async (): Promise<UsernameAvailabilityData | null> => {
            const response = await authClient.isUsernameAvailable({
                username: normalizedUsername,
            } satisfies UsernameAvailabilityInput)

            return ensureNoError(response, 'Unable to check username availability.')
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    })
}

/**
 * Signs in a user with their username and password.
 */
export function useUsernameSignInMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UsernameSignInInput) => {
            const response = await authClient.signIn.username(input)
            return ensureNoError(response, 'Unable to sign in with username.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.session() })
        },
    })
}

/**
 * Signs up a user with email, username, and password.
 */
export function useUsernameSignUpMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UsernameSignUpInput) => {
            const response = await authClient.signUp.email(input)
            return ensureNoError(response, 'Unable to sign up with username.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.session() })
        },
    })
}

/**
 * Updates the current user profile, including username fields.
 */
export function useUpdateUsernameMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UsernameUpdateInput) => {
            const response = await authClient.updateUser(input)
            return ensureNoError(response, 'Unable to update username.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.session() })
        },
    })
}

/**
 * Returns the signed-in user's current active sessions.
 */
export function useCurrentSessionsQuery() {
    return useQuery({
        queryKey: authQueryKeys.sessions(),
        queryFn: async (): Promise<CurrentSessionsData> => {
            const response = await authClient.listSessions()
            return ensureNoError(response, 'Unable to load the current sessions.') ?? []
        },
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    })
}

/**
 * Updates the current authenticated user.
 */
export function useUpdateCurrentUserMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UpdateCurrentUserInput) => {
            const response = await authClient.updateUser(input)
            return ensureNoError(response, 'Unable to update the current user.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.session() })
        },
    })
}

/**
 * Changes the signed-in user's password.
 */
export function useChangePasswordMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: ChangePasswordInput) => {
            const response = await authClient.changePassword(input)
            return ensureNoError(response, 'Unable to change the password.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Deletes the signed-in user account.
 */
export function useDeleteCurrentUserMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: DeleteUserInput) => {
            const response = await authClient.deleteUser(input)
            return ensureNoError(response, 'Unable to delete the account.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Requests a password reset email.
 */
export function useRequestPasswordResetMutation() {
    return useMutation({
        mutationFn: async (input: RequestPasswordResetInput) => {
            const response = await authClient.requestPasswordReset(input)
            return ensureNoError(response, 'Unable to request the password reset.')
        },
    })
}

/**
 * Signs the current user out.
 */
export function useSignOutMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const response = await authClient.signOut()
            return ensureNoError(response, 'Unable to sign out.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Revokes the active session for the signed-in user.
 */
export function useRevokeCurrentSessionMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: RevokeCurrentSessionInput) => {
            const response = await authClient.revokeSession(input)
            return ensureNoError(response, 'Unable to revoke the session.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.sessions() })
        },
    })
}

/**
 * Revokes all active sessions for the signed-in user.
 */
export function useRevokeCurrentSessionsMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const response = await authClient.revokeSessions()
            return ensureNoError(response, 'Unable to revoke the sessions.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.sessions() })
        },
    })
}

/**
 * Loads the Better Auth admin user list.
 */
export function useAdminUsersQuery(params: AdminUsersQueryParams) {
    return useQuery({
        queryKey: authQueryKeys.adminUsers(params),
        queryFn: async (): Promise<AdminUsersData> => {
            const response = await authClient.admin.listUsers({ query: params })
            return ensureNoError(response, 'Unable to load admin users.') ?? {
                users: [],
                total: 0,
            }
        },
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    })
}

/**
 * Loads a single user record for admin review.
 */
export function useAdminUserQuery(userId?: string) {
    return useQuery({
        queryKey: authQueryKeys.adminUser(userId ?? 'none'),
        enabled: Boolean(userId),
        queryFn: async (): Promise<AdminUserData> => {
            const response = await authClient.admin.getUser({ query: { id: userId ?? '' } })
            return ensureNoError(response, 'Unable to load the user.') as AdminUserData
        },
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    })
}

/**
 * Creates a user with the Better Auth admin plugin.
 */
export function useCreateAdminUserMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateAdminUserInput) => {
            const response = await authClient.admin.createUser(input)
            return ensureNoError(response, 'Unable to create the user.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Updates a user with the Better Auth admin plugin.
 */
export function useUpdateAdminUserMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UpdateAdminUserInput) => {
            const response = await authClient.admin.updateUser(input)
            return ensureNoError(response, 'Unable to update the user.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Removes a user with the Better Auth admin plugin.
 */
export function useRemoveAdminUserMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: RemoveAdminUserInput) => {
            const response = await authClient.admin.removeUser(input)
            return ensureNoError(response, 'Unable to remove the user.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Compatibility alias for admin delete-user actions.
 */
export function useDeleteAdminUserMutation() {
    return useRemoveAdminUserMutation()
}

/**
 * Impersonates a user from the admin console.
 */
export function useImpersonateAdminUserMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: ImpersonateAdminUserInput) => {
            const response = await authClient.admin.impersonateUser(input)
            return ensureNoError(response, 'Unable to impersonate the user.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Updates a user's role.
 */
export function useSetAdminUserRoleMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: SetAdminRoleInput) => {
            const response = await authClient.admin.setRole(input)
            return ensureNoError(response, 'Unable to update the user role.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Bans a user.
 */
export function useBanAdminUserMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: BanAdminUserInput) => {
            const response = await authClient.admin.banUser(input)
            return ensureNoError(response, 'Unable to ban the user.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Removes a user ban.
 */
export function useUnbanAdminUserMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UnbanAdminUserInput) => {
            const response = await authClient.admin.unbanUser(input)
            return ensureNoError(response, 'Unable to unban the user.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Returns sessions for a user when a user id is provided.
 */
export function useAdminUserSessionsQuery(userId?: string) {
    return useQuery({
        queryKey: authQueryKeys.adminUserSessions(userId ?? 'none'),
        enabled: Boolean(userId),
        queryFn: async () => {
            const response = await authClient.admin.listUserSessions({ userId: userId ?? '' })
            return ensureNoError(response, 'Unable to load user sessions.')
        },
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    })
}

/**
 * Revokes a single user session.
 */
export function useRevokeAdminUserSessionMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: RevokeAdminUserSessionInput) => {
            const response = await authClient.admin.revokeUserSession(input)
            return ensureNoError(response, 'Unable to revoke the session.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Revokes all sessions for a user.
 */
export function useRevokeAdminUserSessionsMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: RevokeAdminUserSessionsInput) => {
            const response = await authClient.admin.revokeUserSessions(input)
            return ensureNoError(response, 'Unable to revoke the user sessions.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Sets a password for a user from the admin console.
 */
export function useSetAdminUserPasswordMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: SetAdminUserPasswordInput) => {
            const response = await authClient.admin.setUserPassword(input)
            return ensureNoError(response, 'Unable to set the user password.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Checks whether a user has the supplied permission map.
 */
export function useAdminUserHasPermissionMutation() {
    return useMutation({
        mutationFn: async (input: AdminHasPermissionInput) => {
            const response = await authClient.admin.hasPermission(input)
            return ensureNoError(response, 'Unable to evaluate permissions.')
        },
    })
}

/**
 * Loads the current user's API keys.
 */
export function useApiKeysQuery(params: ApiKeyListQueryParams = {}) {
    return useQuery({
        queryKey: authQueryKeys.apiKeys(params),
        queryFn: async (): Promise<ApiKeyListData> => {
            const response = await authClient.apiKey.list({ query: params })
            return ensureNoError(response, 'Unable to load API keys.') ?? {
                apiKeys: [],
                total: 0,
                limit: params.limit ?? 0,
                offset: params.offset ?? 0,
            }
        },
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    })
}

/**
 * Creates a new API key.
 */
export function useCreateApiKeyMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateApiKeyInput) => {
            const response = await authClient.apiKey.create(input)
            return ensureNoError(response, 'Unable to create the API key.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Updates an API key.
 */
export function useUpdateApiKeyMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: UpdateApiKeyInput) => {
            const response = await authClient.apiKey.update(input)
            return ensureNoError(response, 'Unable to update the API key.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}

/**
 * Deletes an API key.
 */
export function useDeleteApiKeyMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: DeleteApiKeyInput) => {
            const response = await authClient.apiKey.delete(input)
            return ensureNoError(response, 'Unable to delete the API key.')
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
        },
    })
}
