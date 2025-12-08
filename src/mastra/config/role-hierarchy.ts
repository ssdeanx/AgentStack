/**
 * Supabase-Compatible Role Hierarchy Configuration
 *
 * Designed to work with Supabase Auth and Row Level Security (RLS)
 * Roles are typically stored in user metadata or a profiles table
 */

export type SubscriptionTier = 'free' | 'pro' | 'enterprise'

export type SupabaseRole = 'anon' | 'authenticated' | 'admin' | 'moderator' | 'user'

export interface RoleHierarchy {
    [role: string]: string[]
}

export const ROLE_HIERARCHY: RoleHierarchy = {
    // Supabase service role - highest access
    'service_role': ['admin', 'authenticated', 'anon'],

    // Application admin - full access
    admin: ['moderator', 'authenticated', 'anon'],

    // Content moderator
    moderator: ['authenticated', 'anon'],

    // Authenticated users
    authenticated: ['anon'],

    // Anonymous/public access
    anon: [],

    // Subscription-based roles (can be stored in user metadata)
    enterprise: ['pro', 'free', 'authenticated'],
    pro: ['free', 'authenticated'],
    free: ['authenticated'],
}

/**
 * Role privilege levels (higher = more access)
 */
export const ROLE_LEVELS: Record<string, number> = {
    'service_role': 1000,
    admin: 800,
    enterprise: 600,
    moderator: 400,
    pro: 300,
    authenticated: 200,
    free: 100,
    anon: 0,
}

/**
 * Supabase RLS Policy Helpers
 */
export const RLS_POLICIES = {
    // Public read access
    publicRead: 'anon',
    // Authenticated user access
    userAccess: 'authenticated',
    // Pro subscriber features
    proFeatures: 'pro',
    // Enterprise features
    enterpriseFeatures: 'enterprise',
    // Admin only
    adminOnly: 'admin',
    // Service role (migrations, etc.)
    serviceOnly: 'service_role',
}

/**
 * Get the privilege level of a role
 */
export function getRoleLevel(role: string): number {
    return ROLE_LEVELS[role] || 0
}

/**
 * Check if a role exists in the hierarchy
 */
export function isValidRole(role: string): boolean {
    return role in ROLE_HIERARCHY
}

/**
 * Check if a user role has access to a required role
 */
export function hasRoleAccess(userRole: string, requiredRole: string): boolean {
    if (userRole === requiredRole) {
        return true
    }

    if (!(userRole in ROLE_HIERARCHY)) {
        return false
    }

    const inheritedRoles = ROLE_HIERARCHY[userRole]
    return inheritedRoles.includes(requiredRole)
}

/**
 * Get all roles that can access a specific role
 */
export function getInheritorRoles(targetRole: string): string[] {
    const inheritors: string[] = []

    for (const [role, inheritedRoles] of Object.entries(ROLE_HIERARCHY)) {
        if (inheritedRoles.includes(targetRole) || role === targetRole) {
            inheritors.push(role)
        }
    }

    return inheritors.sort((a, b) => getRoleLevel(b) - getRoleLevel(a))
}

/**
 * Supabase-compatible tier configuration
 */
export interface TierConfig {
    maxRequests: number
    features: string[]
    rlsPolicy: string
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
    free: {
        maxRequests: 100,
        features: ['basic-chat', 'public-docs'],
        rlsPolicy: RLS_POLICIES.publicRead,
    },
    pro: {
        maxRequests: 10000,
        features: ['advanced-chat', 'private-docs', 'api-access'],
        rlsPolicy: RLS_POLICIES.proFeatures,
    },
    enterprise: {
        maxRequests: -1, // unlimited
        features: ['unlimited-chat', 'all-docs', 'custom-models', 'admin-panel'],
        rlsPolicy: RLS_POLICIES.enterpriseFeatures,
    },
}

/**
 * Get tier configuration
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
    return TIER_CONFIGS[tier]
}

/**
 * Check if a feature is available in a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: string): boolean {
    return TIER_CONFIGS[tier].features.includes(feature)
}

/**
 * Get the minimum tier required for a role
 */
export function getTierForRole(role: string): SubscriptionTier {
    if (role === 'enterprise') {
        return 'enterprise'
    }
    if (role === 'pro') {
        return 'pro'
    }
    if (role === 'free') {
        return 'free'
    }
    return 'free'
}

/**
 * Supabase RLS Policy Generator
 * Returns the appropriate policy for a given role
 */
export function getRLSPolicyForRole(role: string): string {
    const tier = getTierForRole(role)
    return TIER_CONFIGS[tier].rlsPolicy
}

/**
 * Check if a user can access a resource based on their role
 */
export function canAccessResource(userRole: string, resourcePolicy: string): boolean {
    const userLevel = getRoleLevel(userRole)
    const requiredLevel = getRoleLevel(resourcePolicy)

    return userLevel >= requiredLevel
}
