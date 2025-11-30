"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { Badge } from "@/ui/badge"
import { CalendarIcon, ClockIcon, ArrowLeftIcon } from "lucide-react"
import { Button } from "@/ui/button"

interface BlogLayoutProps {
  children: ReactNode
  title: string
  date: string
  readTime: string
  category: string
  author?: string
}

export function BlogLayout({ 
  children, 
  title, 
  date, 
  readTime, 
  category,
  author = "AgentStack Team"
}: BlogLayoutProps) {
  return (
    <article className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link href="/blog">
            <ArrowLeftIcon className="mr-2 size-4" /> Back to Blog
          </Link>
        </Button>
        
        <header className="mb-12">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <Badge variant="secondary">{category}</Badge>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarIcon className="size-4" />
                {new Date(date).toLocaleDateString("en-US", { 
                  month: "long", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="size-4" />
                {readTime}
              </span>
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground">By {author}</p>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none **:text-foreground h1:text-foreground h2:text-foreground h3:text-foreground h4:text-foreground p:text-muted-foreground li:text-muted-foreground code:text-foreground pre:bg-muted blockquote:text-muted-foreground table:border-border th:border-border td:border-border">
          {children}
        </div>
      </div>
    </article>
  )
}
