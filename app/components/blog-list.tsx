"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Badge } from "@/ui/badge"
import { CalendarIcon, ClockIcon, ArrowRightIcon } from "lucide-react"

const BLOG_POSTS = [
  {
    title: "Introducing AgentStack: Multi-Agent Framework for Production",
    excerpt: "Learn how AgentStack simplifies building, deploying, and managing AI agents at scale with our new open-source framework.",
    date: "2025-11-28",
    readTime: "5 min read",
    category: "Announcement",
    slug: "introducing-agentstack",
  },
  {
    title: "Building RAG Pipelines with PgVector",
    excerpt: "A comprehensive guide to implementing retrieval-augmented generation using PostgreSQL and vector embeddings.",
    date: "2025-11-25",
    readTime: "8 min read",
    category: "Tutorial",
    slug: "rag-pipelines-pgvector",
  },
  {
    title: "Agent Orchestration Patterns",
    excerpt: "Explore common patterns for coordinating multiple AI agents in complex workflows.",
    date: "2025-11-20",
    readTime: "6 min read",
    category: "Architecture",
    slug: "agent-orchestration-patterns",
  },
  {
    title: "Observability for AI Applications",
    excerpt: "How to implement tracing, monitoring, and debugging for your AI agent systems.",
    date: "2025-11-15",
    readTime: "7 min read",
    category: "Best Practices",
    slug: "observability-ai-applications",
  },
]

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
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg"
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
                Read more <ArrowRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
