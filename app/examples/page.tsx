import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { ExamplesList } from "@/app/components/examples-list"

export default function ExamplesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <ExamplesList />
      </main>
      <Footer />
    </div>
  )
}
