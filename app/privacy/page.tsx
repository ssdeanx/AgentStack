import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { PrivacyContent } from "@/app/components/privacy-content"

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <PrivacyContent />
      </main>
      <Footer />
    </div>
  )
}
