"use client"

import { ReactNode, useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import { ArrowLeftIcon, ChevronRightIcon, ListIcon } from "lucide-react"

interface TocItem {
  id: string
  text: string
  level: number
}

interface DocsLayoutProps {
  children: ReactNode
  title: string
  description?: string
  section?: string
  prevPage?: { title: string; href: string }
  nextPage?: { title: string; href: string }
  showToc?: boolean
}

export function DocsLayout({ 
  children, 
  title, 
  description,
  section,
  prevPage,
  nextPage,
  showToc = true
}: DocsLayoutProps) {
  const ld = useMemo(() => {
    const url = typeof window !== "undefined" ? window.location.href : "https://deanmachines.com";
    return {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description: description ?? '',
      publisher: { "@type": "Organization", name: "AgentStack", url: "https://deanmachines.com" },
      url,
      mainEntityOfPage: url,
    };
  }, [title, description]);
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const headings = document.querySelectorAll(".mdx-content h2, .mdx-content h3")
    const items: TocItem[] = []
    
    headings.forEach((heading) => {
      const id = heading.id || heading.textContent?.toLowerCase().replace(/\s+/g, "-") || ""
      if (!heading.id) heading.id = id
      items.push({
        id,
        text: heading.textContent || "",
        level: heading.tagName === "H2" ? 2 : 3,
      })
    })
    
    setToc(items)
  }, [children])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: "-80px 0px -80% 0px" }
    )

    toc.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [toc])

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          {section && (
            <>
              <ChevronRightIcon className="size-4" />
              <span>{section}</span>
            </>
          )}
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_220px]">
          <div>
            <header className="mb-12">
              {section && (
                <Badge variant="secondary" className="mb-4">{section}</Badge>
              )}
              <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {description && (
                <p className="text-xl text-muted-foreground">{description}</p>
              )}
            </header>

            <div className="mdx-content">
              {children}
            </div>

            {(prevPage || nextPage) && (
              <nav className="mt-16 flex items-center justify-between border-t border-border pt-8">
                {prevPage ? (
                  <Button variant="outline" asChild>
                    <Link href={prevPage.href as any}>
                      <ArrowLeftIcon className="mr-2 size-4" /> {prevPage.title}
                    </Link>
                  </Button>
                ) : <div />}
                {nextPage && (
                  <Button variant="outline" asChild>
                    <Link href={nextPage.href as any}>
                      {nextPage.title} <ChevronRightIcon className="ml-2 size-4" />
                    </Link>
                  </Button>
                )}
              </nav>
            )}
          </div>

          {showToc && toc.length > 0 && (
            <aside className="hidden lg:block">
              <nav className="sticky top-24">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                  <ListIcon className="size-4" />
                  On this page
                </div>
                <ul className="space-y-2 text-sm">
                  {toc.map((item) => (
                    <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                      <a
                        href={`#${item.id}`}
                        className={`block py-1 transition-colors hover:text-foreground ${
                          activeId === item.id ? "text-primary font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
