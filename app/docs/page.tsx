import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { DocsNav } from "@/app/components/docs-nav"

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <DocsNav />
      </main>
      <Footer />
    </div>
  )
}
