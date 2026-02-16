import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let hasRegisteredGsap = false

export function ensureGsapRegistered() {
    if (hasRegisteredGsap || typeof window === 'undefined') {
        return
    }

    gsap.registerPlugin(ScrollTrigger)
    hasRegisteredGsap = true
}
