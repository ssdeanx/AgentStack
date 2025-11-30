import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { PricingTiers } from "@/app/components/pricing-tiers"

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <PricingTiers />
      </main>
      <Footer />
    </div>
  )
}
