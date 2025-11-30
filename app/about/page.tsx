import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { AboutContent } from "@/app/components/about-content"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <AboutContent />
      </main>
      <Footer />
    </div>
  )
}
