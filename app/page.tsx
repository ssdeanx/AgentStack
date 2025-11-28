import Link from "next/link";

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
];

const STATS = [
  { label: "Agents", value: "22+" },
  { label: "Tools", value: "30+" },
  { label: "Workflows", value: "10" },
  { label: "Networks", value: "4" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-foreground">
            AgentStack
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Production-grade multi-agent framework for building AI applications
            with RAG, observability, and secure governance.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg p-6 text-center"
            >
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/test"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Server Action Demo
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center justify-center rounded-md bg-secondary px-6 py-3 text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors"
          >
            Client SDK Chat
          </Link>
        </div>

        <section>
          <h2 className="text-2xl font-semibold mb-6 text-foreground">
            Available Agents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="font-medium text-foreground">{agent.name}</div>
                <div className="text-sm text-muted-foreground">
                  {agent.category}
                </div>
                <code className="text-xs text-muted-foreground mt-2 block">
                  {agent.id}
                </code>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 pt-8 border-t border-border text-center text-muted-foreground">
          <p>
            Built with{" "}
            <a
              href="https://mastra.ai"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mastra
            </a>{" "}
            • Next.js 16 • React 19
          </p>
        </footer>
      </div>
    </main>
  );
}
