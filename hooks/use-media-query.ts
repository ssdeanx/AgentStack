'use client'

import { useSyncExternalStore } from 'react'

/**
 * Hook to track media query matches.
 * Robust implementation with SSR support and fallback for older browsers.
 */
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (onStoreChange) => {
            if (typeof window === 'undefined') {
                return () => undefined
            }

            const media = window.matchMedia(query)
            const listener = () => onStoreChange()

            media.addEventListener('change', listener)

            return () => {
                media.removeEventListener('change', listener)
            }
        },
        () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
        () => false
    )
}

export function useIsMobile(): boolean {
    return useMediaQuery('(max-width: 768px)')
}

export function useIsTablet(): boolean {
    return useMediaQuery('(min-width: 769px) and (max-width: 1024px)')
}

export function useIsDesktop(): boolean {
    return useMediaQuery('(min-width: 1025px)')
}

export function usePrefersDarkMode(): boolean {
    return useMediaQuery('(prefers-color-scheme: dark)')
}

export function usePrefersReducedMotion(): boolean {
    return useMediaQuery('(prefers-reduced-motion: reduce)')
}
