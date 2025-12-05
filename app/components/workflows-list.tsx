"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Input } from "@/ui/input"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import {
  SearchIcon,
  PlayIcon,
  ArrowRightIcon,
  GitBranchIcon,
  ClockIcon,
  LayersIcon,
  ZapIcon,
  FileTextIcon,
  DatabaseIcon,
  MailIcon,
  TrendingUpIcon,
  UsersIcon,
  ShieldIcon,
} from "lucide-react"

const CATEGORIES = ["All", "Content", "Data", "Research", "Financial", "Operations", "Integration"]

const WORKFLOWS = [
  {
    id: "contentStudioWorkflow",
    name: "Content Studio",
    description: "End-to-end content creation pipeline with research, writing, editing, and publishing stages.",
    category: "Content",
    icon: FileTextIcon,
    steps: 6,
    estimatedTime: "5-10 min",
    agents: ["researchAgent", "copywriterAgent", "editorAgent"],
    tags: ["Automated", "Multi-Agent"],
    status: "production",
  },
  {
    id: "dataPipelineWorkflow",
    name: "Data Pipeline",
    description: "Automated data ingestion, transformation, validation, and export with error handling.",
    category: "Data",
    icon: DatabaseIcon,
    steps: 8,
    estimatedTime: "Variable",
    agents: ["dataIngestionAgent", "dataTransformAgent", "dataExportAgent"],
    tags: ["ETL", "Scheduled"],
    status: "production",
  },
  {
    id: "researchSynthesisWorkflow",
    name: "Research Synthesis",
    description: "Multi-source research aggregation with citation tracking and summary generation.",
    category: "Research",
    icon: LayersIcon,
    steps: 5,
    estimatedTime: "10-15 min",
    agents: ["researchAgent", "researchPaperAgent", "reportAgent"],
    tags: ["Academic", "Citations"],
    status: "production",
  },
  {
    id: "financialAnalysisWorkflow",
    name: "Financial Analysis",
    description: "Comprehensive financial data collection, analysis, and report generation.",
    category: "Financial",
    icon: TrendingUpIcon,
    steps: 7,
    estimatedTime: "3-5 min",
    agents: ["stockAnalysisAgent", "researchAgent", "reportAgent"],
    tags: ["Real-time", "Market Data"],
    status: "production",
  },
  {
    id: "customerOnboardingWorkflow",
    name: "Customer Onboarding",
    description: "Automated customer welcome flow with personalized content and setup assistance.",
    category: "Operations",
    icon: UsersIcon,
    steps: 5,
    estimatedTime: "2-3 min",
    agents: ["copywriterAgent", "editorAgent"],
    tags: ["Personalized", "Email"],
    status: "beta",
  },
  {
    id: "emailCampaignWorkflow",
    name: "Email Campaign",
    description: "Create, test, and schedule email marketing campaigns with A/B testing support.",
    category: "Content",
    icon: MailIcon,
    steps: 6,
    estimatedTime: "5-8 min",
    agents: ["copywriterAgent", "editorAgent", "dataExportAgent"],
    tags: ["Marketing", "A/B Testing"],
    status: "production",
  },
  {
    id: "securityAuditWorkflow",
    name: "Security Audit",
    description: "Automated security scanning, vulnerability assessment, and compliance reporting.",
    category: "Operations",
    icon: ShieldIcon,
    steps: 8,
    estimatedTime: "15-20 min",
    agents: ["systemAgent", "reportAgent"],
    tags: ["Compliance", "Automated"],
    status: "beta",
  },
  {
    id: "apiIntegrationWorkflow",
    name: "API Integration",
    description: "Connect and sync data between multiple APIs with transformation and validation.",
    category: "Integration",
    icon: ZapIcon,
    steps: 4,
    estimatedTime: "Variable",
    agents: ["dataIngestionAgent", "dataTransformAgent"],
    tags: ["REST", "Webhooks"],
    status: "production",
  },
  {
    id: "documentProcessingWorkflow",
    name: "Document Processing",
    description: "Extract, analyze, and structure data from various document formats including PDFs.",
    category: "Data",
    icon: FileTextIcon,
    steps: 5,
    estimatedTime: "1-5 min",
    agents: ["documentProcessingAgent", "dataTransformAgent"],
    tags: ["OCR", "Extraction"],
    status: "production",
  },
  {
    id: "competitorAnalysisWorkflow",
    name: "Competitor Analysis",
    description: "Gather and analyze competitor data, pricing, and market positioning.",
    category: "Research",
    icon: TrendingUpIcon,
    steps: 6,
    estimatedTime: "10-15 min",
    agents: ["researchAgent", "stockAnalysisAgent", "reportAgent"],
    tags: ["Market Intel", "Automated"],
    status: "beta",
  },
]

const STATUS_STYLES = {
  production: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  beta: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  alpha: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
}

export function WorkflowsList() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const filteredWorkflows = WORKFLOWS.filter((workflow) => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(search.toLowerCase()) ||
      workflow.description.toLowerCase().includes(search.toLowerCase()) ||
      workflow.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = selectedCategory === "All" || workflow.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Workflows
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Pre-built workflow templates for common AI automation tasks. Customize and deploy in minutes.
        </p>
      </div>

      <div className="mx-auto mb-12 max-w-4xl space-y-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            className="h-14 pl-12 text-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      <div className="@container grid gap-6 @md:grid-cols-2 @lg:grid-cols-3">
        {filteredWorkflows.map((workflow, index) => (
          <motion.div
            key={workflow.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            viewport={{ once: true }}
          >
            <div className="card-3d group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 ease-spring hover:border-primary/50 hover:shadow-lg hover:-translate-y-1">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-200 ease-spring group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105">
                  <workflow.icon className="size-6" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {workflow.category}
                  </Badge>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[workflow.status as keyof typeof STATUS_STYLES]}`}
                  >
                    {workflow.status}
                  </span>
                </div>
              </div>

              <h3 className="mb-2 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {workflow.name}
              </h3>
              <p className="mb-4 flex-1 text-sm text-muted-foreground leading-relaxed">
                {workflow.description}
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                {workflow.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="mb-6 grid grid-cols-3 gap-4 border-t border-border pt-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <GitBranchIcon className="size-4" />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{workflow.steps}</div>
                  <div className="text-xs text-muted-foreground">Steps</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <ClockIcon className="size-4" />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{workflow.estimatedTime}</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <UsersIcon className="size-4" />
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{workflow.agents.length}</div>
                  <div className="text-xs text-muted-foreground">Agents</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href={{ pathname: "/workflows", query: { workflow: workflow.id } }}>
                    <PlayIcon className="mr-2 size-4" /> Try It
                  </Link>
                </Button>
                <Button size="sm" asChild className="flex-1">
                  <Link href={{ pathname: `/docs/workflows/${workflow.id}` }}>
                    Learn More <ArrowRightIcon className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="py-24 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <SearchIcon className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">No workflows found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      <div className="mt-16 rounded-2xl border border-border bg-muted/30 p-8 text-center">
        <h3 className="mb-2 text-2xl font-bold text-foreground">Need a Custom Workflow?</h3>
        <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
          Our team can help you design and implement custom workflows tailored to your specific business needs.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href={{ pathname: "/contact" }}>Contact Us</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href={{ pathname: "/docs/workflows/custom" }}>Build Your Own</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
