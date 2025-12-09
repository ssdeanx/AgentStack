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
import { BentoGrid, BentoGridItem } from "@/ui/effects/bento-grid"

const FeatureHeader = () => (
  <div className="flex flex-1 w-full h-full min-h-24 rounded-xl bg-linear-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100 opacity-50" />
);

const FEATURES = [
  {
    title: "Multi-Agent Orchestration",
    description:
      "Coordinate complex workflows with 22+ specialized agents working together seamlessly.",
    header: <FeatureHeader />,
    icon: <BotIcon className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-2",
  },
  {
    title: "RAG Pipelines",
    description:
      "Built-in retrieval-augmented generation with PgVector and semantic search.",
    header: <FeatureHeader />,
    icon: <DatabaseIcon className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-1",
  },
  {
    title: "Enterprise Tools",
    description:
      "30+ production-ready tools for financial data and research.",
    header: <FeatureHeader />,
    icon: <WrenchIcon className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-1",
  },
  {
    title: "Observability",
    description:
      "Full tracing and monitoring with Arize/Phoenix integration.",
    header: <FeatureHeader />,
    icon: <ActivityIcon className="h-4 w-4 text-neutral-500" />,
    className: "md:col-span-2",
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
       {/* Background decoration - heavily reduced opacity for subtle feel */}
       <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-30" />

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

        {/* Main feature grid (Bento) */}
        <BentoGrid className="mb-24">
          {FEATURES.map((feature, i) => (
            <BentoGridItem
              key={i}
              title={feature.title}
              description={feature.description}
              header={feature.header}
              icon={feature.icon}
              className={feature.className}
            />
          ))}
        </BentoGrid>

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
              className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-background border border-border shadow-sm text-foreground transition-all group-hover:border-primary/30 group-hover:text-primary group-hover:scale-110">
                <feature.icon className="size-5" strokeWidth={1.5} />
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
          className="mt-24 rounded-2xl border border-border/50 bg-muted/20 p-8 backdrop-blur-sm"
        >
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center group">
              <div className="text-3xl font-bold text-foreground lg:text-4xl transition-colors group-hover:text-primary">22+</div>
              <div className="mt-1 text-sm text-muted-foreground">Specialized Agents</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-foreground lg:text-4xl transition-colors group-hover:text-primary">30+</div>
              <div className="mt-1 text-sm text-muted-foreground">Enterprise Tools</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-foreground lg:text-4xl transition-colors group-hover:text-primary">10</div>
              <div className="mt-1 text-sm text-muted-foreground">Workflow Templates</div>
            </div>
            <div className="text-center group">
              <div className="text-3xl font-bold text-foreground lg:text-4xl transition-colors group-hover:text-primary">99.9%</div>
              <div className="mt-1 text-sm text-muted-foreground">Uptime SLA</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
