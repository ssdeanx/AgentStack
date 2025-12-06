import { Footer } from "@/app/components/footer"
import { DocsNav } from "@/app/components/docs-nav"

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <DocsNav />
      </main>
      <Footer />
    </div>
  )
}
