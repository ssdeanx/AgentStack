import Link from "next/link"
import { Navbar } from "./components/navbar"
import { Footer } from "./components/footer"

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

const STATS = [
  { label: "Agents", value: "22+" },
  { label: "Tools", value: "30+" },
  { label: "Workflows", value: "10" },
  { label: "Networks", value: "4" },
]

const FEATURES = [
  {
    title: "Multi-Agent Orchestration",
    description: "Coordinate complex workflows with 22+ specialized agents working together seamlessly.",
    icon: "🤖",
  },
  {
    title: "RAG Pipelines",
    description: "Built-in retrieval-augmented generation with PgVector and document processing.",
    icon: "📚",
  },
  {
    title: "Enterprise Tools",
    description: "30+ production-ready tools for financial data, research, and content creation.",
    icon: "🔧",
  },
  {
    title: "Observability",
    description: "Full tracing and monitoring with Arize/Phoenix integration for AI operations.",
    icon: "📊",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-green-500"></span>
              </span>
              Now with AI SDK v5 + React 19
            </div>
            
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
              Build AI Applications{" "}
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                at Scale
              </span>
            </h1>
            
            <p className="mb-10 text-xl text-muted-foreground">
              Production-grade multi-agent framework with RAG pipelines, 
              observability, and secure governance. Ship faster with 22+ agents ready to deploy.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/chat"
                className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-8 text-background font-medium transition-colors hover:bg-foreground/90"
              >
                Start Building
              </Link>
              <Link
                href="/test"
                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-8 font-medium transition-colors hover:bg-accent"
              >
                View Demo
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl font-bold text-foreground">{stat.value}</div>
                  <div className="mt-1 text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Everything You Need
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              A complete framework for building, deploying, and monitoring AI agent applications.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20"
              >
                <div className="mb-4 text-3xl">{feature.icon}</div>
                <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-4 py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Available Agents
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Specialized AI agents ready to handle your workflows.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {AGENTS.map((agent) => (
              <Link
                key={agent.id}
                href={`/chat?agent=${agent.id}`}
                className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {agent.name}
                </div>
                <div className="text-muted-foreground text-sm">{agent.category}</div>
                <code className="mt-2 block text-xs text-muted-foreground/70">
                  {agent.id}
                </code>
              </Link>
            ))}
          </div>
          
          <div className="mt-8 text-center">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              View all 22+ agents →
            </Link>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30">
          <div className="container mx-auto px-4 py-24 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Ready to Get Started?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
              Join developers building the next generation of AI applications with AgentStack.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/chat"
                className="inline-flex h-11 items-center justify-center rounded-md bg-foreground px-8 text-background font-medium transition-colors hover:bg-foreground/90"
              >
                Launch Chat
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-8 font-medium transition-colors hover:bg-accent"
              >
                View on GitHub
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}
