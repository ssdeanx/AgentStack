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
    // Backwards-compatible: maxRequests remains for legacy callers
    maxRequests?: number
    // Explicit quotas used throughout services
    maxDocuments: number
    maxApiRequestsPerDay: number
    maxUsersPerTenant: number
    features: string[]
    rlsPolicy: string
    supportLevel?: 'community' | 'email' | 'priority' | 'phone_24x7'
    customIntegrations?: boolean
    advancedAnalytics?: boolean
    whiteLabel?: boolean
    onPremise?: boolean
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
    free: {
        maxRequests: 100,
        maxDocuments: 250,
        maxApiRequestsPerDay: 100,
        maxUsersPerTenant: 1,
        features: ['basic-chat', 'public-docs'],
        rlsPolicy: RLS_POLICIES.publicRead,
        supportLevel: 'community',
        customIntegrations: false,
        advancedAnalytics: false,
        whiteLabel: false,
        onPremise: false,
    },
    pro: {
        maxRequests: 10000,
        maxDocuments: 10000,
        maxApiRequestsPerDay: 10000,
        maxUsersPerTenant: 100,
        features: ['advanced-chat', 'private-docs', 'api-access'],
        rlsPolicy: RLS_POLICIES.proFeatures,
        supportLevel: 'email',
        customIntegrations: true,
        advancedAnalytics: true,
        whiteLabel: false,
        onPremise: false,
    },
    enterprise: {
        maxRequests: -1, // unlimited
        maxDocuments: -1,
        maxApiRequestsPerDay: -1,
        maxUsersPerTenant: -1,
        features: ['unlimited-chat', 'all-docs', 'custom-models', 'admin-panel'],
        rlsPolicy: RLS_POLICIES.enterpriseFeatures,
        supportLevel: 'priority',
        customIntegrations: true,
        advancedAnalytics: true,
        whiteLabel: true,
        onPremise: true,
    },
}

/**
 * Get tier configuration
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
    return TIER_CONFIGS[tier]
}

/**
 * Backwards-compatible tier quota accessor used by services
 */
export function getTierQuota(tier: SubscriptionTier): {
    maxDocuments: number
    maxApiRequestsPerDay: number
    maxUsersPerTenant: number
    features: string[]
    rlsPolicy: string
} {
    const cfg = getTierConfig(tier)
    return {
        maxDocuments: cfg.maxDocuments,
        maxApiRequestsPerDay: cfg.maxApiRequestsPerDay,
        maxUsersPerTenant: cfg.maxUsersPerTenant,
        features: cfg.features,
        rlsPolicy: cfg.rlsPolicy,
    }
}

/**
 * Check if a feature is available in a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: string): boolean {
    return TIER_CONFIGS[tier].features.includes(feature)
}

/**
 * Backwards-compatible feature check
 */
export function isTierFeatureEnabled(tier: SubscriptionTier, feature: string) {
    return hasFeature(tier, feature)
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
 * Minimum tier required for a given classification level
 */
export function getMinimumTierForClassification(
    classification: 'public' | 'internal' | 'confidential'
): SubscriptionTier {
    switch (classification) {
        case 'public':
            return 'free'
        case 'internal':
            return 'pro'
        case 'confidential':
            return 'enterprise'
        default:
            return 'free'
    }
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
