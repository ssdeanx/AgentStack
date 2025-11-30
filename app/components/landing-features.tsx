"use client"

import { motion } from "framer-motion"
import { BotIcon, DatabaseIcon, WrenchIcon, ActivityIcon } from "lucide-react"

const FEATURES = [
  {
    title: "Multi-Agent Orchestration",
    description: "Coordinate complex workflows with 22+ specialized agents working together seamlessly. Define hierarchies and communication protocols.",
    icon: BotIcon,
    className: "md:col-span-2",
  },
  {
    title: "RAG Pipelines",
    description: "Built-in retrieval-augmented generation with PgVector, document processing, and semantic search capabilities.",
    icon: DatabaseIcon,
    className: "md:col-span-1",
  },
  {
    title: "Enterprise Tools",
    description: "30+ production-ready tools for financial data, research, content creation, and system operations.",
    icon: WrenchIcon,
    className: "md:col-span-1",
  },
  {
    title: "Observability",
    description: "Full tracing and monitoring with Arize/Phoenix integration. Debug agent reasoning and optimize performance.",
    icon: ActivityIcon,
    className: "md:col-span-2",
  },
]

export function LandingFeatures() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Everything You Need
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          A complete framework for building, deploying, and monitoring AI agent applications.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/20 hover:shadow-lg ${feature.className}`}
          >
            <div className="mb-6 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <feature.icon className="size-5" />
            </div>
            <h3 className="mb-3 text-xl font-semibold text-foreground">{feature.title}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
            <div className="absolute inset-0 -z-10 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
