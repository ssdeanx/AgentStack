import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { TermsContent } from "@/app/components/terms-content"

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <TermsContent />
      </main>
      <Footer />
    </div>
  )
}
