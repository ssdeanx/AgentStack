"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Input } from "@/ui/input"
import { SearchIcon, ArrowRightIcon } from "lucide-react"
import { Badge } from "@/ui/badge"

const AGENTS = [
  { name: "Weather Agent", id: "weatherAgent", category: "Utility" },
  { name: "Research Agent", id: "researchAgent", category: "Research" },
  { name: "Stock Analysis", id: "stockAnalysisAgent", category: "Financial" },
  { name: "Copywriter", id: "copywriterAgent", category: "Content" },
  { name: "Editor", id: "editorAgent", category: "Content" },
  { name: "Report Agent", id: "reportAgent", category: "Content" },
  { name: "Data Export", id: "dataExportAgent", category: "Data Pipeline" },
  { name: "Data Ingestion", id: "dataIngestionAgent", category: "Data Pipeline" },
  { name: "Research Paper", id: "researchPaperAgent", category: "Research" },
  { name: "Document Processing", id: "documentProcessingAgent", category: "Research" },
]

export function LandingAgents() {
  const [search, setSearch] = useState("")

  const filteredAgents = AGENTS.filter(agent => 
    agent.name.toLowerCase().includes(search.toLowerCase()) ||
    agent.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
        <div className="text-center md:text-left">
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
            Available Agents
          </h2>
          <p className="text-muted-foreground">
            Specialized AI agents ready to handle your workflows.
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search agents..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {filteredAgents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            viewport={{ once: true }}
          >
            <Link
              href={`/chat?agent=${agent.id}`}
              className="group flex h-full flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {agent.category}
                  </Badge>
                </div>
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {agent.name}
                </div>
                <code className="mt-2 block text-xs text-muted-foreground/70">
                  {agent.id}
                </code>
              </div>
              <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary">
                Try Agent <ArrowRightIcon className="ml-1 size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-12 text-center">
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          View all 22+ agents <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </section>
  )
}
