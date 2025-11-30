"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/ui/input"
import { Badge } from "@/ui/badge"
import { Button } from "@/ui/button"
import {
  SearchIcon,
  WrenchIcon,
  TrendingUpIcon,
  GlobeIcon,
  FileTextIcon,
  DatabaseIcon,
  MailIcon,
  CodeIcon,
  ImageIcon,
  CloudIcon,
  ShieldIcon,
  CalculatorIcon,
  CalendarIcon,
  MapPinIcon,
  LinkIcon,
  BrainIcon,
  MessageSquareIcon,
  BarChartIcon,
  CreditCardIcon,
  ClockIcon,
  ArrowRightIcon,
  StarIcon,
  ZapIcon,
  CheckCircleIcon,
} from "lucide-react"

const CATEGORIES = ["All", "Financial", "Research", "Data", "RAG", "Content", "Utility", "Integration", "System"]

const TOOLS = [
  {
    name: "Stock Ticker",
    id: "stockTicker",
    category: "Financial",
    description: "Real-time stock prices, quotes, and market data from major exchanges.",
    icon: TrendingUpIcon,
    popular: true,
    new: false,
  },
  {
    name: "Company Profile",
    id: "companyProfile",
    category: "Financial",
    description: "Detailed company information including financials, executives, and key metrics.",
    icon: BarChartIcon,
    popular: true,
    new: false,
  },
  {
    name: "Currency Exchange",
    id: "currencyExchange",
    category: "Financial",
    description: "Real-time currency conversion rates for 150+ currencies worldwide.",
    icon: CreditCardIcon,
    popular: false,
    new: false,
  },
  {
    name: "Crypto Prices",
    id: "cryptoPrices",
    category: "Financial",
    description: "Cryptocurrency prices, market caps, and 24h trading volumes.",
    icon: TrendingUpIcon,
    popular: false,
    new: true,
  },
  {
    name: "Web Search",
    id: "webSearch",
    category: "Research",
    description: "Search the web for information using multiple search engines.",
    icon: GlobeIcon,
    popular: true,
    new: false,
  },
  {
    name: "Academic Search",
    id: "academicSearch",
    category: "Research",
    description: "Search academic papers, journals, and research publications.",
    icon: FileTextIcon,
    popular: false,
    new: false,
  },
  {
    name: "News Search",
    id: "newsSearch",
    category: "Research",
    description: "Search and aggregate news from thousands of sources worldwide.",
    icon: GlobeIcon,
    popular: false,
    new: false,
  },
  {
    name: "Wikipedia",
    id: "wikipedia",
    category: "Research",
    description: "Query Wikipedia for encyclopedic information and summaries.",
    icon: BrainIcon,
    popular: false,
    new: false,
  },
  {
    name: "PDF Parser",
    id: "pdfParser",
    category: "Data",
    description: "Extract text, tables, and metadata from PDF documents.",
    icon: FileTextIcon,
    popular: true,
    new: false,
  },
  {
    name: "CSV Processor",
    id: "csvProcessor",
    category: "Data",
    description: "Parse, transform, and analyze CSV data with advanced filtering.",
    icon: DatabaseIcon,
    popular: false,
    new: false,
  },
  {
    name: "JSON Transformer",
    id: "jsonTransformer",
    category: "Data",
    description: "Transform, validate, and restructure JSON data efficiently.",
    icon: CodeIcon,
    popular: false,
    new: false,
  },
  {
    name: "Web Scraper",
    id: "webScraper",
    category: "Data",
    description: "Extract structured data from websites and web pages.",
    icon: LinkIcon,
    popular: true,
    new: false,
  },
  {
    name: "Vector Store",
    id: "vectorStore",
    category: "RAG",
    description: "Store and retrieve vector embeddings with semantic search.",
    icon: DatabaseIcon,
    popular: true,
    new: false,
  },
  {
    name: "Document Chunker",
    id: "documentChunker",
    category: "RAG",
    description: "Split documents into optimal chunks for embedding.",
    icon: FileTextIcon,
    popular: false,
    new: false,
  },
  {
    name: "Embedding Generator",
    id: "embeddingGenerator",
    category: "RAG",
    description: "Generate vector embeddings from text using multiple models.",
    icon: BrainIcon,
    popular: true,
    new: false,
  },
  {
    name: "Semantic Search",
    id: "semanticSearch",
    category: "RAG",
    description: "Search documents by meaning rather than keywords.",
    icon: SearchIcon,
    popular: false,
    new: false,
  },
  {
    name: "Text Summarizer",
    id: "textSummarizer",
    category: "Content",
    description: "Summarize long text content into concise summaries.",
    icon: FileTextIcon,
    popular: true,
    new: false,
  },
  {
    name: "Translation",
    id: "translation",
    category: "Content",
    description: "Translate text between 100+ languages accurately.",
    icon: GlobeIcon,
    popular: false,
    new: false,
  },
  {
    name: "Grammar Check",
    id: "grammarCheck",
    category: "Content",
    description: "Check and correct grammar, spelling, and style issues.",
    icon: CheckCircleIcon,
    popular: false,
    new: false,
  },
  {
    name: "Sentiment Analysis",
    id: "sentimentAnalysis",
    category: "Content",
    description: "Analyze text sentiment and emotional tone.",
    icon: MessageSquareIcon,
    popular: false,
    new: true,
  },
  {
    name: "Weather API",
    id: "weatherApi",
    category: "Utility",
    description: "Current weather and forecasts for any location worldwide.",
    icon: CloudIcon,
    popular: true,
    new: false,
  },
  {
    name: "Calculator",
    id: "calculator",
    category: "Utility",
    description: "Perform complex mathematical calculations and conversions.",
    icon: CalculatorIcon,
    popular: false,
    new: false,
  },
  {
    name: "Date/Time",
    id: "dateTime",
    category: "Utility",
    description: "Date calculations, timezone conversions, and formatting.",
    icon: CalendarIcon,
    popular: false,
    new: false,
  },
  {
    name: "Geocoding",
    id: "geocoding",
    category: "Utility",
    description: "Convert addresses to coordinates and vice versa.",
    icon: MapPinIcon,
    popular: false,
    new: false,
  },
  {
    name: "QR Code Generator",
    id: "qrGenerator",
    category: "Utility",
    description: "Generate QR codes from text, URLs, or data.",
    icon: ImageIcon,
    popular: false,
    new: true,
  },
  {
    name: "Email Sender",
    id: "emailSender",
    category: "Integration",
    description: "Send emails through SMTP or email service providers.",
    icon: MailIcon,
    popular: true,
    new: false,
  },
  {
    name: "Slack Integration",
    id: "slackIntegration",
    category: "Integration",
    description: "Send messages and interact with Slack workspaces.",
    icon: MessageSquareIcon,
    popular: false,
    new: false,
  },
  {
    name: "Webhook Trigger",
    id: "webhookTrigger",
    category: "Integration",
    description: "Trigger webhooks and receive webhook callbacks.",
    icon: ZapIcon,
    popular: false,
    new: false,
  },
  {
    name: "GitHub API",
    id: "githubApi",
    category: "Integration",
    description: "Interact with GitHub repositories, issues, and pull requests.",
    icon: CodeIcon,
    popular: true,
    new: false,
  },
  {
    name: "Database Query",
    id: "databaseQuery",
    category: "System",
    description: "Execute queries against PostgreSQL, MySQL, and SQLite.",
    icon: DatabaseIcon,
    popular: true,
    new: false,
  },
  {
    name: "File System",
    id: "fileSystem",
    category: "System",
    description: "Read, write, and manage files in the file system.",
    icon: FileTextIcon,
    popular: false,
    new: false,
  },
  {
    name: "HTTP Client",
    id: "httpClient",
    category: "System",
    description: "Make HTTP requests to external APIs and services.",
    icon: GlobeIcon,
    popular: true,
    new: false,
  },
  {
    name: "Cron Scheduler",
    id: "cronScheduler",
    category: "System",
    description: "Schedule tasks to run at specific times or intervals.",
    icon: ClockIcon,
    popular: false,
    new: false,
  },
  {
    name: "Security Scanner",
    id: "securityScanner",
    category: "System",
    description: "Scan for security vulnerabilities and compliance issues.",
    icon: ShieldIcon,
    popular: false,
    new: true,
  },
]

export function ToolsList() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showAll, setShowAll] = useState(false)

  const filteredTools = TOOLS.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase()) ||
      tool.category.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === "All" || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const displayedTools = showAll ? filteredTools : filteredTools.slice(0, 18)
  const popularTools = TOOLS.filter((tool) => tool.popular)

  return (
    <section className="container mx-auto px-4 py-24">
      {/* Header */}
      <div className="mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="mb-4">
            {TOOLS.length}+ Tools Available
          </Badge>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Tools Library
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Production-ready tools for your AI agents. Connect to APIs, process data, and automate
            workflows.
          </p>
        </motion.div>
      </div>

      {/* Popular tools showcase */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-16"
      >
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
          <StarIcon className="size-5 text-yellow-500" />
          Popular Tools
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popularTools.slice(0, 4).map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link
                href={`/docs/tools/${tool.id}`}
                className="group flex h-full flex-col rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <tool.icon className="size-5" />
                  </div>
                  <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    Popular
                  </Badge>
                </div>
                <h3 className="mb-1 font-semibold text-foreground group-hover:text-primary transition-colors">
                  {tool.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Search and filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mx-auto mb-12 max-w-4xl space-y-6"
      >
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tools by name or description..."
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
              onClick={() => {
                setSelectedCategory(category)
                setShowAll(false)
              }}
            >
              {category}
              {category !== "All" && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({TOOLS.filter((t) => t.category === category).length})
                </span>
              )}
            </Badge>
          ))}
        </div>
      </motion.div>

      {/* Tools grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {displayedTools.map((tool, index) => (
            <motion.div
              key={tool.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
            >
              <Link
                href={`/docs/tools/${tool.id}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <tool.icon className="size-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {tool.new && (
                      <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                        New
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs font-normal">
                      {tool.category}
                    </Badge>
                  </div>
                </div>

                <h3 className="mb-2 font-semibold text-foreground group-hover:text-primary transition-colors">
                  {tool.name}
                </h3>
                <p className="mb-4 flex-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {tool.description}
                </p>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <code className="text-xs text-muted-foreground/70">{tool.id}</code>
                  <span className="flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    View Docs
                    <ArrowRightIcon className="ml-1 size-3 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filteredTools.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-24 text-center"
        >
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <WrenchIcon className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-foreground">No tools found</h3>
          <p className="mb-6 text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("")
              setSelectedCategory("All")
            }}
          >
            Clear Filters
          </Button>
        </motion.div>
      )}

      {/* Show more button */}
      {filteredTools.length > 18 && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <Button variant="outline" size="lg" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show Less" : `Show All ${filteredTools.length} Tools`}
            <ArrowRightIcon
              className={`ml-2 size-4 transition-transform ${showAll ? "rotate-90" : ""}`}
            />
          </Button>
        </motion.div>
      )}

      {/* CTA section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="mt-20 rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-8 text-center lg:p-12"
      >
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex size-14 items-center justify-center rounded-full bg-primary/10">
            <WrenchIcon className="size-7 text-primary" />
          </div>
          <h3 className="mb-3 text-2xl font-bold text-foreground lg:text-3xl">
            Need a Custom Tool?
          </h3>
          <p className="mb-8 text-lg text-muted-foreground">
            Build custom tools to connect your agents to any API, database, or service. Our SDK
            makes it easy.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/docs/tools/custom">
                Build Custom Tool
                <ArrowRightIcon className="ml-2 size-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/contact">Request a Tool</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
