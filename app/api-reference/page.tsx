import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { ApiReferenceContent } from "@/app/components/api-reference-content"

export default function ApiReferencePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <ApiReferenceContent />
      </main>
      <Footer />
    </div>
  )
}
