"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { Badge } from "@/ui/badge"
import { CalendarIcon, ClockIcon, ArrowLeftIcon, ShareIcon } from "lucide-react"
import { Button } from "@/ui/button"

interface BlogLayoutProps {
  children: ReactNode
  title: string
  date: string
  readTime: string
  category: string
  author?: string
  tags?: string[]
}

export function BlogLayout({ 
  children, 
  title, 
  date, 
  readTime, 
  category,
  author = "AgentStack Team",
  tags = []
}: BlogLayoutProps) {
  const handleShare = async () => {
    if (typeof window === "undefined") return
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href })
    } else {
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <article className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/blog">
              <ArrowLeftIcon className="mr-2 size-4" /> Back to Blog
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <ShareIcon className="mr-2 size-4" /> Share
          </Button>
        </div>
        
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
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        <div className="mdx-content">
          {children}
        </div>
      </div>
    </article>
  )
}
