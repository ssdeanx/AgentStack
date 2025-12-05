"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/ui/input"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import {
  SearchIcon,
  ArrowRightIcon,
  BotIcon,
  TrendingUpIcon,
  FileTextIcon,
  DatabaseIcon,
  CloudIcon,
  CodeIcon,
  MailIcon,
  ImageIcon,
  ShieldIcon,
  CalculatorIcon,
  GlobeIcon,
  MicIcon,
  BrainIcon,
  BarChartIcon,
  BookOpenIcon,
  PenToolIcon,
  LayersIcon,
  ZapIcon,
  UsersIcon,
  SettingsIcon,
} from "lucide-react"

const CATEGORIES = ["All", "Financial", "Content", "Research", "Data Pipeline", "Utility", "System"]

const AGENTS = [
  {
    name: "Weather Agent",
    id: "weatherAgent",
    category: "Utility",
    description: "Real-time weather data and forecasts for any location worldwide.",
    icon: CloudIcon,
    popular: false,
  },
  {
    name: "Research Agent",
    id: "researchAgent",
    category: "Research",
    description: "Multi-source research aggregation with citation tracking.",
    icon: BookOpenIcon,
    popular: true,
  },
  {
    name: "Stock Analysis",
    id: "stockAnalysisAgent",
    category: "Financial",
    description: "Real-time stock data, technical analysis, and market insights.",
    icon: TrendingUpIcon,
    popular: true,
  },
  {
    name: "Copywriter",
    id: "copywriterAgent",
    category: "Content",
    description: "Generate compelling marketing copy and content.",
    icon: PenToolIcon,
    popular: true,
  },
  {
    name: "Editor Agent",
    id: "editorAgent",
    category: "Content",
    description: "Polish and refine content with grammar and style improvements.",
    icon: FileTextIcon,
    popular: false,
  },
  {
    name: "Report Agent",
    id: "reportAgent",
    category: "Content",
    description: "Generate comprehensive reports from structured data.",
    icon: BarChartIcon,
    popular: false,
  },
  {
    name: "Data Export",
    id: "dataExportAgent",
    category: "Data Pipeline",
    description: "Export data to various formats and destinations.",
    icon: DatabaseIcon,
    popular: false,
  },
  {
    name: "Data Ingestion",
    id: "dataIngestionAgent",
    category: "Data Pipeline",
    description: "Ingest data from multiple sources with validation.",
    icon: LayersIcon,
    popular: false,
  },
  {
    name: "Research Paper",
    id: "researchPaperAgent",
    category: "Research",
    description: "Analyze and summarize academic papers and publications.",
    icon: BookOpenIcon,
    popular: false,
  },
  {
    name: "Document Processing",
    id: "documentProcessingAgent",
    category: "Research",
    description: "Extract and structure data from PDFs and documents.",
    icon: FileTextIcon,
    popular: false,
  },
  {
    name: "Code Assistant",
    id: "codeAssistantAgent",
    category: "Utility",
    description: "Help with coding tasks, debugging, and code review.",
    icon: CodeIcon,
    popular: true,
  },
  {
    name: "Email Agent",
    id: "emailAgent",
    category: "Content",
    description: "Draft and manage professional email communications.",
    icon: MailIcon,
    popular: false,
  },
  {
    name: "Image Analysis",
    id: "imageAnalysisAgent",
    category: "Utility",
    description: "Analyze and describe images with computer vision.",
    icon: ImageIcon,
    popular: false,
  },
  {
    name: "Security Agent",
    id: "securityAgent",
    category: "System",
    description: "Monitor and analyze security threats and vulnerabilities.",
    icon: ShieldIcon,
    popular: false,
  },
  {
    name: "Calculator Agent",
    id: "calculatorAgent",
    category: "Utility",
    description: "Perform complex calculations and mathematical analysis.",
    icon: CalculatorIcon,
    popular: false,
  },
  {
    name: "Web Scraper",
    id: "webScraperAgent",
    category: "Data Pipeline",
    description: "Extract structured data from websites and APIs.",
    icon: GlobeIcon,
    popular: false,
  },
  {
    name: "Voice Agent",
    id: "voiceAgent",
    category: "Utility",
    description: "Process and transcribe voice recordings.",
    icon: MicIcon,
    popular: false,
  },
  {
    name: "Reasoning Agent",
    id: "reasoningAgent",
    category: "Research",
    description: "Complex multi-step reasoning and problem solving.",
    icon: BrainIcon,
    popular: true,
  },
  {
    name: "Analytics Agent",
    id: "analyticsAgent",
    category: "Financial",
    description: "Generate insights from business and financial data.",
    icon: BarChartIcon,
    popular: false,
  },
  {
    name: "Orchestrator",
    id: "orchestratorAgent",
    category: "System",
    description: "Coordinate multiple agents for complex workflows.",
    icon: ZapIcon,
    popular: true,
  },
  {
    name: "Customer Support",
    id: "customerSupportAgent",
    category: "Utility",
    description: "Handle customer inquiries with context awareness.",
    icon: UsersIcon,
    popular: false,
  },
  {
    name: "System Agent",
    id: "systemAgent",
    category: "System",
    description: "Monitor and manage system operations and health.",
    icon: SettingsIcon,
    popular: false,
  },
]

export function LandingAgents() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showAll, setShowAll] = useState(false)

  const filteredAgents = AGENTS.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.category.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === "All" || agent.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const displayedAgents = showAll ? filteredAgents : filteredAgents.slice(0, 12)

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-12 flex flex-col items-center justify-between gap-6 lg:flex-row">
        <div className="text-center lg:text-left">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Available Agents
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="max-w-xl text-lg text-muted-foreground"
          >
            {AGENTS.length}+ specialized AI agents ready to handle your workflows. Each agent is
            optimized for specific tasks and can work together.
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="relative w-full max-w-sm"
        >
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="h-11 pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </motion.div>
      </div>

      {/* Category filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        viewport={{ once: true }}
        className="mb-8 flex flex-wrap justify-center gap-2"
      >
        {CATEGORIES.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            className="cursor-pointer px-4 py-1.5 text-sm transition-all hover:scale-105"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </motion.div>

      {/* Agents grid */}
      <div className="@container grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {displayedAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
            >
              <Link
                href={`/chat?agent=${agent.id}`}
                className="perspective group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all duration-300 ease-spring hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <agent.icon className="size-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {agent.popular && (
                      <Badge className="bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs">
                        Popular
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs font-normal">
                      {agent.category}
                    </Badge>
                  </div>
                </div>

                <h3 className="mb-1.5 font-semibold text-foreground transition-colors group-hover:text-primary">
                  {agent.name}
                </h3>
                <p className="mb-3 flex-1 text-sm text-muted-foreground line-clamp-2">
                  {agent.description}
                </p>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <code className="text-xs text-muted-foreground/70">{agent.id}</code>
                  <span className="flex items-center text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                    Try Agent
                    <ArrowRightIcon className="ml-1 size-3 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filteredAgents.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 text-center"
        >
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <BotIcon className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">No agents found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
        </motion.div>
      )}

      {/* Show more button */}
      {filteredAgents.length > 12 && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <Button variant="outline" size="lg" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show Less" : `Show All ${filteredAgents.length} Agents`}
            <ArrowRightIcon
              className={`ml-2 size-4 transition-transform ${showAll ? "rotate-90" : ""}`}
            />
          </Button>
        </motion.div>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="mt-12 text-center"
      >
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          View all agents and start chatting <ArrowRightIcon className="size-4" />
        </Link>
      </motion.div>
    </section>
  )
}
