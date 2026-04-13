'use client'

import { useEffect, useState } from 'react'

export function useMounted(): boolean {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mounted state intentionally flips after the first client render.
        const frame = window.requestAnimationFrame(() => setMounted(true))
        return () => window.cancelAnimationFrame(frame)
    }, [])

    return mounted
}
