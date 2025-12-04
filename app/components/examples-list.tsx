"use client"

import { useState } from "react"
// use standard anchor for external links to avoid next/link type errors
import { motion } from "framer-motion"
import { Input } from "@/ui/input"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import { SearchIcon, GithubIcon, ExternalLinkIcon } from "lucide-react"

const EXAMPLES = [
  {
    title: "Simple Chat Agent",
    description: "A basic conversational agent with memory and context awareness.",
    tags: ["Beginner", "Chat", "Memory"],
    github: "https://github.com/agentstack/examples/simple-chat",
  },
  {
    title: "RAG Document Q&A",
    description: "Build a document question-answering system with RAG pipelines.",
    tags: ["Intermediate", "RAG", "Embeddings"],
    github: "https://github.com/agentstack/examples/rag-qa",
  },
  {
    title: "Multi-Agent Research",
    description: "Coordinate multiple agents to conduct research and synthesize reports.",
    tags: ["Advanced", "Multi-Agent", "Workflow"],
    github: "https://github.com/agentstack/examples/multi-agent-research",
  },
  {
    title: "Financial Analysis Bot",
    description: "Analyze stocks and market data using specialized financial tools.",
    tags: ["Intermediate", "Financial", "Tools"],
    github: "https://github.com/agentstack/examples/financial-analysis",
  },
  {
    title: "Content Generation Pipeline",
    description: "Automated content creation with editor and copywriter agents.",
    tags: ["Intermediate", "Content", "Pipeline"],
    github: "https://github.com/agentstack/examples/content-pipeline",
  },
  {
    title: "Real-time Data Processing",
    description: "Stream and process data in real-time with agent workflows.",
    tags: ["Advanced", "Streaming", "Data"],
    github: "https://github.com/agentstack/examples/realtime-data",
  },
]

export function ExamplesList() {
  const [search, setSearch] = useState("")

  const filteredExamples = EXAMPLES.filter(example =>
    example.title.toLowerCase().includes(search.toLowerCase()) ||
    example.description.toLowerCase().includes(search.toLowerCase()) ||
    example.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Examples
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Explore code samples and starter projects to accelerate your development.
        </p>
      </div>

      <div className="mx-auto mb-12 max-w-xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search examples..."
            className="h-12 pl-12 text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredExamples.map((example, index) => (
          <motion.div
            key={example.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {example.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <h2 className="mb-2 text-xl font-bold text-foreground">
              {example.title}
            </h2>
            <p className="mb-6 flex-1 text-muted-foreground">
              {example.description}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <a href={example.github} target="_blank" rel="noopener noreferrer">
                  <GithubIcon className="mr-2 size-4" /> View Code
                </a>
              </Button>
              <Button size="sm" asChild className="flex-1">
                <a href={example.github} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon className="mr-2 size-4" /> Live Demo
                </a>
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
