"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"
import { ArrowLeftIcon, BookOpenIcon, ChevronRightIcon } from "lucide-react"

interface DocsLayoutProps {
  children: ReactNode
  title: string
  description?: string
  section?: string
  prevPage?: { title: string; href: string }
  nextPage?: { title: string; href: string }
}

export function DocsLayout({ 
  children, 
  title, 
  description,
  section,
  prevPage,
  nextPage
}: DocsLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
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

        <div className="prose prose-neutral dark:prose-invert max-w-none **:text-foreground h1:text-foreground h2:text-foreground h3:text-foreground h4:text-foreground p:text-muted-foreground li:text-muted-foreground code:text-foreground pre:bg-muted blockquote:text-muted-foreground table:border-border th:border-border td:border-border">
          {children}
        </div>

        {(prevPage || nextPage) && (
          <nav className="mt-16 flex items-center justify-between border-t border-border pt-8">
            {prevPage ? (
              <Button variant="outline" asChild>
                <Link href={prevPage.href}>
                  <ArrowLeftIcon className="mr-2 size-4" /> {prevPage.title}
                </Link>
              </Button>
            ) : <div />}
            {nextPage && (
              <Button variant="outline" asChild>
                <Link href={nextPage.href}>
                  {nextPage.title} <ChevronRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            )}
          </nav>
        )}
      </div>
    </div>
  )
}
