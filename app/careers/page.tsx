import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { CareersContent } from "@/app/components/careers-content"

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <CareersContent />
      </main>
      <Footer />
    </div>
  )
}
