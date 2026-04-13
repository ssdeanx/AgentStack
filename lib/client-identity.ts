export interface ClientIdentity {
    userId: string
    resourceId: string
}

const LOCAL_STORAGE_USER_ID_KEY = 'agentstack.client.userId'
const LOCAL_STORAGE_RESOURCE_ID_KEY = 'agentstack.client.resourceId'

function getBrowserWindow() {
    if (typeof window === 'undefined') {
        return null
    }

    return window
}

function getOrCreateStoredValue(key: string, fallback: string) {
    const browserWindow = getBrowserWindow()

    if (browserWindow === null) {
        return fallback
    }

    const existingValue = browserWindow.localStorage.getItem(key)

    if (existingValue !== null && existingValue.trim().length > 0) {
        return existingValue
    }

    browserWindow.localStorage.setItem(key, fallback)
    return fallback
}

/**
 * Returns the current browser-scoped identity values used by legacy chat and workflow contexts.
 */
export function getClientIdentity(): ClientIdentity {
    const userId = getOrCreateStoredValue(LOCAL_STORAGE_USER_ID_KEY, crypto.randomUUID())
    const resourceId = getOrCreateStoredValue(
        LOCAL_STORAGE_RESOURCE_ID_KEY,
        crypto.randomUUID(),
    )

    return {
        userId,
        resourceId,
    }
}

/**
 * Returns a persisted browser storage value for the provided key.
 */
export function getOrCreateLocalStorageId(key: string, fallbackValue: string) {
    return getOrCreateStoredValue(key, fallbackValue)
}
