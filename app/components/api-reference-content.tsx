"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Input } from "@/ui/input"
import { Badge } from "@/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { SearchIcon, CodeIcon, BookOpenIcon, CopyIcon, CheckIcon } from "lucide-react"
import { Button } from "@/ui/button"

const API_SECTIONS = [
  {
    category: "Agents",
    endpoints: [
      { method: "POST", path: "/api/agents/create", description: "Create a new agent" },
      { method: "GET", path: "/api/agents/:id", description: "Get agent by ID" },
      { method: "POST", path: "/api/agents/:id/run", description: "Run an agent task" },
      { method: "DELETE", path: "/api/agents/:id", description: "Delete an agent" },
    ],
  },
  {
    category: "Tools",
    endpoints: [
      { method: "GET", path: "/api/tools", description: "List all available tools" },
      { method: "POST", path: "/api/tools/:id/execute", description: "Execute a tool" },
    ],
  },
  {
    category: "Workflows",
    endpoints: [
      { method: "POST", path: "/api/workflows/create", description: "Create a workflow" },
      { method: "POST", path: "/api/workflows/:id/run", description: "Run a workflow" },
      { method: "GET", path: "/api/workflows/:id/status", description: "Get workflow status" },
    ],
  },
]

const METHOD_COLORS = {
  GET: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PUT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export function ApiReferenceContent() {
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          API Reference
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Complete API documentation for integrating AgentStack into your applications.
        </p>
      </div>

      <div className="mx-auto mb-12 max-w-xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search API endpoints..."
            className="h-12 pl-12 text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Quick Links — Agents / Tools / Workflows */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/api-reference/agents"
            className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg"
          >
            <h3 className="mb-1 text-sm font-semibold text-foreground">Agents</h3>
            <p className="text-sm text-muted-foreground">See agent endpoints, streaming, and agent tool call docs</p>
          </Link>

          <Link
            href="/api-reference/tools"
            className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg"
          >
            <h3 className="mb-1 text-sm font-semibold text-foreground">Tools</h3>
            <p className="text-sm text-muted-foreground">Tool execution endpoints and sample integrations</p>
          </Link>

          <Link
            href="/api-reference/workflows"
            className="group block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg"
          >
            <h3 className="mb-1 text-sm font-semibold text-foreground">Workflows</h3>
            <p className="text-sm text-muted-foreground">Workflow run creation, streaming, and management</p>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8">
        {API_SECTIONS.map((section, sectionIndex) => (
          <motion.div
            key={section.category}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: sectionIndex * 0.1 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="border-b border-border bg-muted/30 px-6 py-4">
              <h2 className="text-xl font-bold text-foreground">{section.category}</h2>
            </div>
            <div className="divide-y divide-border">
              {section.endpoints.map((endpoint) => (
                <div
                  key={endpoint.path}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className={`rounded px-2 py-1 text-xs font-bold ${METHOD_COLORS[endpoint.method as keyof typeof METHOD_COLORS]}`}>
                      {endpoint.method}
                    </span>
                    <code className="text-sm text-foreground">{endpoint.path}</code>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hidden text-sm text-muted-foreground sm:block">
                      {endpoint.description}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(endpoint.path)}
                    >
                      {copied === endpoint.path ? (
                        <CheckIcon className="size-4 text-green-500" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
