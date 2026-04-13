'use client'

import { useCallback, useEffect, useState } from 'react'

export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
    const [storedValue, setStoredValue] = useState<T>(initialValue)

    useEffect(() => {
        let cancelled = false
        try {
            const item = window.localStorage.getItem(key)
            if (item) {
                const parsed = JSON.parse(item) as T
                // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from persisted browser storage after mount.
                const frame = window.requestAnimationFrame(() => {
                    if (!cancelled) {
                        setStoredValue(parsed)
                    }
                })
                return () => {
                    cancelled = true
                    window.cancelAnimationFrame(frame)
                }
            }
        } catch (error) {
            void error
        }
        return () => {
            cancelled = true
        }
    }, [key])

    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                const valueToStore =
                    value instanceof Function ? value(storedValue) : value
                setStoredValue(valueToStore)
                window.localStorage.setItem(key, JSON.stringify(valueToStore))
            } catch (error) {
                void error
            }
        },
        [key, storedValue]
    )

    const removeValue = useCallback(() => {
        try {
            window.localStorage.removeItem(key)
            setStoredValue(initialValue)
        } catch (error) {
            void error
        }
    }, [key, initialValue])

    return [storedValue, setValue, removeValue]
}
