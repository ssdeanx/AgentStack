"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Input } from "@/ui/input"
import { Badge } from "@/ui/badge"
import { SearchIcon, BookOpenIcon, CodeIcon, SettingsIcon, RocketIcon, DatabaseIcon, ShieldIcon } from "lucide-react"

const DOC_SECTIONS = [
  {
    title: "Getting Started",
    description: "Quick start guide to set up AgentStack in your project",
    icon: RocketIcon,
    href: "/docs/getting-started",
    articles: ["Installation", "Quick Start", "Configuration"],
  },
  {
    title: "Core Concepts",
    description: "Understand the fundamentals of multi-agent systems",
    icon: BookOpenIcon,
    href: "/docs/core-concepts",
    articles: ["Agents", "Tools", "Workflows", "Networks"],
  },
  {
    title: "AI SDK",
    description: "Using the Vercel AI SDK with Mastra for streaming, hooks, and UI integration",
    icon: CodeIcon,
    href: "/docs/ai-sdk",
    articles: ["chatRoute()", "useChat()", "toAISdkFormat()"],
  },
  {
    title: "API Reference",
    description: "Complete API documentation for all modules",
    icon: CodeIcon,
    href: "/api-reference",
    articles: ["Agent API", "Tool API", "Workflow API"],
  },
  {
    title: "RAG & Embeddings",
    description: "Build retrieval-augmented generation pipelines",
    icon: DatabaseIcon,
    href: "/docs/rag",
    articles: ["Vector Stores", "Embeddings", "Chunking"],
  },
  {
    title: "Configuration",
    description: "Configure providers, storage, and environment",
    icon: SettingsIcon,
    href: "/docs/configuration",
    articles: ["Providers", "Storage", "Environment Variables"],
  },
  {
    title: "Components",
    description: "Site & component library, examples and usage guidance",
    icon: CodeIcon,
    href: "/docs/components",
    articles: ["Site Components", "Component Patterns", "Examples"],
  },
  {
    title: "UI",
    description: "Theme, tokens, accessibility, and UI guidelines",
    icon: BookOpenIcon,
    href: "/docs/ui",
    articles: ["Design Tokens", "Theme", "Accessibility"],
  },
  {
    title: "Security",
    description: "Best practices for secure AI applications",
    icon: ShieldIcon,
    href: "/docs/security",
    articles: ["Authentication", "Governance", "Audit Logs"],
  },
]

export function DocsNav() {
  const [search, setSearch] = useState("")

  const filteredSections = DOC_SECTIONS.filter(section =>
    section.title.toLowerCase().includes(search.toLowerCase()) ||
    section.description.toLowerCase().includes(search.toLowerCase()) ||
    section.articles.some(a => a.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Documentation
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Comprehensive guides and API references to help you build with AgentStack.
        </p>
      </div>

      <div className="mx-auto mb-12 max-w-xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documentation..."
            className="h-14 pl-12 text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <Link
              href={section.href as any}
              className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <section.icon className="size-6" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {section.title}
              </h2>
              <p className="mb-4 flex-1 text-muted-foreground">
                {section.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {section.articles.map(article => (
                  <Badge key={article} variant="secondary" className="text-xs">
                    {article}
                  </Badge>
                ))}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
