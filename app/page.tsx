import { Footer } from '@/app/components/footer'
import { LandingHero } from '@/app/components/landing-hero'
import { LandingStats } from '@/app/components/landing-stats'
import { LandingTrust } from '@/app/components/landing-trust'
import { LandingFeatures } from '@/app/components/landing-features'
import { LandingSvgLab } from '@/app/components/landing-svg-lab'
import { LandingTestimonials } from '@/app/components/landing-testimonials'
import { LandingAgents } from '@/app/components/landing-agents'
import { LandingCTA } from '@/app/components/landing-cta'

export default function HomePage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <main className="flex-1">
                <LandingHero />
                <LandingStats />
                <LandingTrust />
                <LandingFeatures />
                <LandingSvgLab />
                <LandingTestimonials />
                <LandingAgents />
                <LandingCTA />
            </main>
            <Footer />
        </div>
    )
}
