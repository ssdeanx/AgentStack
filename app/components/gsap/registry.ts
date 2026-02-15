import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let hasRegisteredGsap = false

export function ensureGsapRegistered() {
    if (hasRegisteredGsap || typeof window === 'undefined') {
        return
    }

    gsap.registerPlugin(useGSAP, ScrollTrigger)
    hasRegisteredGsap = true
}
