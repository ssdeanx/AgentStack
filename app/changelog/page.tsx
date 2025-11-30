import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { ChangelogList } from "@/app/components/changelog-list"

export default function ChangelogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <ChangelogList />
      </main>
      <Footer />
    </div>
  )
}
