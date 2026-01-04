/* eslint-disable no-console */

export interface ClientIdentity {
    userId: string
    resourceId: string
}

function randomId(): string {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID()
        }
    } catch (err) {
        console.warn('Failed to generate random UUID:', err)
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getOrCreateLocalStorageId(key: string, prefix: string): string {
    if (typeof window === 'undefined') {
        return `${prefix}-${randomId()}`
    }

    try {
        const existing = window.localStorage.getItem(key)
        if (typeof existing === 'string' && existing.trim().length > 0) {
            return existing
        }

        const created = `${prefix}-${randomId()}`
        window.localStorage.setItem(key, created)
        return created
    } catch (err) {
        console.warn(`Failed to access localStorage for key '${key}':`, err)
        return `${prefix}-${randomId()}`
    }
}

export function getClientIdentity(): ClientIdentity {
    const userId = getOrCreateLocalStorageId('agentstack.userId', 'user')
    return {
        userId,
        resourceId: `user:${userId}`,
    }
}
