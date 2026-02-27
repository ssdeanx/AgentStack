'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to track media query matches.
 * Robust implementation with SSR support and fallback for older browsers.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        if (typeof window === 'undefined') {return}

        const media = window.matchMedia(query)

        // Set initial value
        setMatches(media.matches)

        const listener = (event: MediaQueryListEvent) => {
            setMatches(event.matches)
        }

        // Standard addEventListener for modern browsers
        if (media.addEventListener) {
            media.addEventListener('change', listener)
            return () => media.removeEventListener('change', listener)
        }

        // Fallback for older Safari (< 14) and other older browsers
        // @ts-ignore - addListener is deprecated but required for old browsers
        media.addListener(listener)
        // @ts-ignore
        return () => media.removeListener(listener)
    }, [query])

    return matches
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
