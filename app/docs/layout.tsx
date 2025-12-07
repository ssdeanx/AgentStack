import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { Sidebar } from "@/app/components/sidebar"
import StripFrontmatter from "@/app/components/strip-frontmatter"

export const metadata = {
  title: "Docs - AgentStack",
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "AgentStack Docs",
    description: "Technical documentation for AgentStack (Mastra)",
    url: "https://deanmachines.com/docs",
    publisher: { "@type": "Organization", name: "AgentStack", url: "https://deanmachines.com" },
    mainEntityOfPage: "https://deanmachines.com/docs",
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <div className="container mx-auto flex w-full flex-1 gap-6 px-4 py-8 lg:py-12 lg:px-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        {/* Sidebar on large screens */}
        <Sidebar />

        {/* Main content area. Add top padding so sticky header doesn't overlap */}
        <main className="w-full min-h-[60vh] pt-4 lg:pt-0 lg:pl-2">
          <StripFrontmatter />
          {children}
        </main>
      </div>

      <Footer />
    </div>
  )
}
