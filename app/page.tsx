import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { LandingHero } from "@/app/components/landing-hero"
import { LandingStats } from "@/app/components/landing-stats"
import { LandingTrust } from "@/app/components/landing-trust"
import { LandingFeatures } from "@/app/components/landing-features"
import { LandingTestimonials } from "@/app/components/landing-testimonials"
import { LandingAgents } from "@/app/components/landing-agents"
import { LandingCTA } from "@/app/components/landing-cta"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <LandingHero />
        <LandingStats />
        <LandingTrust />
        <LandingFeatures />
        <LandingTestimonials />
        <LandingAgents />
        <LandingCTA />
      </main>
      <Footer />
    </div>
  )
}
