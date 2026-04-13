'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

export function useCopyToClipboard(): [
    string | null,
    (text: string) => Promise<boolean>,
] {
    const [copiedText, setCopiedText] = useState<string | null>(null)

    const copy = useCallback(async (text: string): Promise<boolean> => {
        if (!navigator?.clipboard) {
            return false
        }

        try {
            await navigator.clipboard.writeText(text)
            setCopiedText(text)
            return true
        } catch (error) {
            void error
            setCopiedText(null)
            return false
        }
    }, [])

    return [copiedText, copy]
}

export function useClickOutside<T extends HTMLElement>(
    handler: () => void
): RefObject<T | null> {
    const ref = useRef<T | null>(null)

    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return
            }
            handler()
        }

        document.addEventListener('mousedown', listener)
        document.addEventListener('touchstart', listener)

        return () => {
            document.removeEventListener('mousedown', listener)
            document.removeEventListener('touchstart', listener)
        }
    }, [handler])

    return ref
}

export function useToggle(
    initialValue = false
): [boolean, () => void, (value: boolean) => void] {
    const [value, setValue] = useState(initialValue)
    const toggle = useCallback(() => setValue((v) => !v), [])
    return [value, toggle, setValue]
}

export function useInterval(callback: () => void, delay: number | null) {
    const savedCallback = useRef(callback)

    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    useEffect(() => {
        if (delay === null) {return}

        const id = setInterval(() => savedCallback.current(), delay)
        return () => clearInterval(id)
    }, [delay])
}

export function useTimeout(callback: () => void, delay: number | null) {
    const savedCallback = useRef(callback)

    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    useEffect(() => {
        if (delay === null) {return}

        const id = setTimeout(() => savedCallback.current(), delay)
        return () => clearTimeout(id)
    }, [delay])
}
