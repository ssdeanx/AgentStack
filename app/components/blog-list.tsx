"use client"

import Link from "next/link"
import type { Route } from "next"
import { motion } from "framer-motion"
import { Badge } from "@/ui/badge"
import { CalendarIcon, ClockIcon, ArrowRightIcon } from "lucide-react"

import { BLOG_POSTS } from "@/app/components/blog-data"

export function BlogList() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Blog
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Latest updates, tutorials, and insights from the AgentStack team.
        </p>
      </div>

      <div className="mx-auto max-w-4xl space-y-8">
        {BLOG_POSTS.map((post, index) => (
          <motion.article
            key={post.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <Link
              href={`/blog/${post.slug}` as Route}
              className="card-3d group block rounded-2xl border border-border bg-card p-8 transition-all duration-300 ease-spring hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <Badge variant="secondary">{post.category}</Badge>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="size-4" />
                    {new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="size-4" />
                    {post.readTime}
                  </span>
                </div>
              </div>
              <h2 className="mb-3 text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="mb-4 text-muted-foreground leading-relaxed">
                {post.excerpt}
              </p>
              <span className="inline-flex items-center text-sm font-medium text-primary">
                Read more <ArrowRightIcon className="ml-1 size-4 transition-transform duration-200 ease-spring group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
