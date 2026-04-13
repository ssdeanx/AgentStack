'use client'

import { useCallback, useEffect, useMemo, type SetStateAction } from 'react'

import { useStore } from '@tanstack/react-store'
import { Store } from '@tanstack/store'

/**
 * Options for a localStorage-backed TanStack Store.
 */
export interface PersistentStoreOptions<T> {
    /** Unique key used to persist the store in localStorage. */
    key: string
    /** Fallback value used when no persisted value exists. */
    initialValue: T
    /**
     * Serializes the store value before writing it to storage.
     * Defaults to JSON.stringify.
     */
    serialize?: (value: T) => string
    /**
     * Deserializes the stored string when reading from storage.
     * Defaults to JSON.parse.
     */
    deserialize?: (value: string) => T
}

/**
 * Persistent store result with the live value and update helpers.
 */
export interface PersistentStoreResult<T> {
    store: Store<T>
    value: T
    setValue: (value: SetStateAction<T>) => void
    resetValue: () => void
}

const defaultSerialize = <T,>(value: T) => JSON.stringify(value)
const defaultDeserialize = <T,>(value: string) => JSON.parse(value) as T

function readStoredValue<T>({
    key,
    initialValue,
    deserialize,
}: Pick<PersistentStoreOptions<T>, 'key' | 'initialValue' | 'deserialize'>) {
    const parse = deserialize ?? defaultDeserialize

    if (typeof window === 'undefined') {
        return initialValue
    }

    const storedValue = window.localStorage.getItem(key)

    if (storedValue === null || storedValue.trim().length === 0) {
        return initialValue
    }

    try {
        return parse(storedValue)
    } catch {
        return initialValue
    }
}

function writeStoredValue<T>(
    key: string,
    value: T,
    serialize: PersistentStoreOptions<T>['serialize'],
) {
    const stringify = serialize ?? defaultSerialize

    if (typeof window === 'undefined') {
        return
    }

    try {
        window.localStorage.setItem(key, stringify(value))
    } catch {
        // Ignore storage write failures so the UI still works offline or with
        // restrictive browser storage policies.
    }
}

/**
 * Creates a TanStack Store that stays in sync with localStorage.
 */
export function usePersistentStore<T>({
    key,
    initialValue,
    serialize,
    deserialize,
}: PersistentStoreOptions<T>): PersistentStoreResult<T> {
    const store = useMemo(
        () => new Store<T>(readStoredValue({ key, initialValue, deserialize })),
        [deserialize, initialValue, key],
    )

    const value = useStore(store, (state) => state)

    useEffect(() => {
        writeStoredValue(key, value, serialize)
    }, [key, serialize, value])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key !== key || event.newValue === null) {
                return
            }

            try {
                const parse = deserialize ?? defaultDeserialize
                store.setState(parse(event.newValue))
            } catch {
                // Ignore malformed storage payloads.
            }
        }

        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [deserialize, key, store])

    const setValue = useCallback(
        (nextValue: SetStateAction<T>) => {
            store.setState((currentValue) =>
                typeof nextValue === 'function'
                    ? (nextValue as (previousValue: T) => T)(currentValue)
                    : nextValue,
            )
        },
        [store],
    )

    const resetValue = useCallback(() => {
        store.setState(initialValue)
    }, [initialValue, store])

    return {
        store,
        value,
        setValue,
        resetValue,
    }
}
