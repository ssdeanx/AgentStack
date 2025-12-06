"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpenIcon, RocketIcon, CodeIcon, DatabaseIcon, SettingsIcon, ShieldIcon } from "lucide-react"

const SECTIONS = [
  { title: "Getting Started", href: "/docs/getting-started", icon: RocketIcon },
  { title: "Core Concepts", href: "/docs/core-concepts", icon: BookOpenIcon },
  { title: "AI SDK", href: "/docs/ai-sdk", icon: CodeIcon },
  { title: "RAG", href: "/docs/rag", icon: DatabaseIcon },
  { title: "Configuration", href: "/docs/configuration", icon: SettingsIcon },
  { title: "Security", href: "/docs/security", icon: ShieldIcon },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-20 space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="mb-2 text-sm font-semibold text-muted-foreground">Documentation</div>
        <nav className="flex flex-col gap-1">
          {SECTIONS.map((s) => {
            const active = pathname?.startsWith(s.href)
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all hover:bg-primary/5 ${
                  active ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                <s.icon className="size-4" />
                {s.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
