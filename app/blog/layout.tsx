import { Navbar } from "@/app/components/navbar"
import { Footer } from "@/app/components/footer"
import { Sidebar } from "@/app/components/sidebar"
import Link from "next/link"
import { BLOG_POSTS } from "@/app/components/blog-data"

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <div className="container mx-auto flex w-full flex-1 gap-6 px-4 py-8 lg:py-12 lg:px-6">
        <Sidebar />
        <main className="w-full min-h-[60vh] pt-4 lg:pt-0 lg:pl-2">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="col-span-2">{children}</div>
            <aside className="col-span-1 hidden lg:block">
              <div className="sticky top-20 rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-sm font-semibold text-muted-foreground">Recent posts</div>
                <ul className="space-y-3">
                  {BLOG_POSTS.slice(0, 5).map((p) => (
                    <li key={p.slug}>
                      <Link href={`/blog/${p.slug}`} className="block text-sm text-muted-foreground hover:text-foreground">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{p.title}</span>
                          <span className="text-xs text-muted-foreground">{p.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{p.excerpt}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}
