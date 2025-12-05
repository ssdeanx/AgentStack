"use client"

import { motion } from "framer-motion"
import {
  BotIcon,
  DatabaseIcon,
  WrenchIcon,
  ActivityIcon,
  ShieldIcon,
  ZapIcon,
  GitBranchIcon,
  CodeIcon,
} from "lucide-react"
import { Badge } from "@/ui/badge"

const FEATURES = [
  {
    title: "Multi-Agent Orchestration",
    description:
      "Coordinate complex workflows with 22+ specialized agents working together seamlessly. Define hierarchies, communication protocols, and fallback strategies.",
    icon: BotIcon,
    gradient: "from-blue-500 to-cyan-500",
    className: "md:col-span-2",
    highlights: ["Agent Networks", "Task Routing", "Parallel Execution"],
  },
  {
    title: "RAG Pipelines",
    description:
      "Built-in retrieval-augmented generation with PgVector, document processing, and semantic search capabilities.",
    icon: DatabaseIcon,
    gradient: "from-purple-500 to-pink-500",
    className: "md:col-span-1",
    highlights: ["Vector Search", "Embeddings"],
  },
  {
    title: "Enterprise Tools",
    description:
      "30+ production-ready tools for financial data, research, content creation, and system operations.",
    icon: WrenchIcon,
    gradient: "from-orange-500 to-red-500",
    className: "md:col-span-1",
    highlights: ["API Integrations", "Custom Tools"],
  },
  {
    title: "Observability",
    description:
      "Full tracing and monitoring with Arize/Phoenix integration. Debug agent reasoning and optimize performance in real-time.",
    icon: ActivityIcon,
    gradient: "from-green-500 to-emerald-500",
    className: "md:col-span-2",
    highlights: ["Tracing", "Metrics", "Debugging"],
  },
]

const ADDITIONAL_FEATURES = [
  {
    title: "Security & Governance",
    description: "Enterprise-grade security with role-based access, audit logs, and compliance features.",
    icon: ShieldIcon,
  },
  {
    title: "Workflow Automation",
    description: "Visual workflow builder with conditional logic, loops, and error handling.",
    icon: GitBranchIcon,
  },
  {
    title: "Lightning Fast",
    description: "Optimized for performance with streaming responses and efficient resource usage.",
    icon: ZapIcon,
  },
  {
    title: "Developer First",
    description: "TypeScript native with excellent DX, comprehensive docs, and active community.",
    icon: CodeIcon,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export function LandingFeatures() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <Badge variant="outline" className="mb-4">
            Features
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything You Need
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground lg:text-xl">
            A complete framework for building, deploying, and monitoring AI agent applications at scale.
          </p>
        </motion.div>

        {/* Main feature grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-16 grid gap-6 md:grid-cols-3"
        >
          {FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className={`card-3d group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 ease-spring hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 ${feature.className}`}
            >
              <div className="card-3d-inner preserve-3d">
              {/* Gradient background on hover */}
              <div
                className={`absolute inset-0 -z-10 bg-linear-to-br ${feature.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-5`}
              />

              {/* Icon */}
              <div
                className={`mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-linear-to-br ${feature.gradient} text-white shadow-lg`}
              >
                <feature.icon className="size-6" />
              </div>

              {/* Content */}
              <h3 className="mb-3 text-xl font-bold text-foreground lg:text-2xl">
                {feature.title}
              </h3>
              <p className="mb-6 text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Highlights */}
              <div className="flex flex-wrap gap-2">
                {feature.highlights.map((highlight) => (
                  <Badge
                    key={highlight}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {highlight}
                  </Badge>
                ))}
              </div>

              {/* Decorative corner */}
              <div
                className={`absolute -right-8 -top-8 size-24 rounded-full bg-linear-to-br ${feature.gradient} opacity-10 blur-2xl transition-all duration-300 group-hover:opacity-20`}
              />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional features */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="@container grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {ADDITIONAL_FEATURES.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="perspective group rounded-xl border border-border bg-card/50 p-6 transition-all duration-300 ease-spring hover:border-primary/30 hover:bg-card hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 rounded-2xl border border-border bg-muted/30 p-8"
        >
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground lg:text-4xl">22+</div>
              <div className="mt-1 text-sm text-muted-foreground">Specialized Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground lg:text-4xl">30+</div>
              <div className="mt-1 text-sm text-muted-foreground">Enterprise Tools</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground lg:text-4xl">10</div>
              <div className="mt-1 text-sm text-muted-foreground">Workflow Templates</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground lg:text-4xl">99.9%</div>
              <div className="mt-1 text-sm text-muted-foreground">Uptime SLA</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
