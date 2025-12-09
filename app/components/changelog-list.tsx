"use client"

import { motion } from "framer-motion"
import { Badge } from "@/ui/badge"
import { SparklesIcon, BugIcon, WrenchIcon, ZapIcon } from "lucide-react"

const CHANGELOG_ENTRIES = [
  {
    version: "1.0.6",
    date: "2025-11-28",
    type: "release",
    changes: [
      { type: "feature", text: "Added AI SDK v5 support with React 19 compatibility" },
      { type: "feature", text: "New agent orchestration patterns for complex workflows" },
      { type: "improvement", text: "Enhanced RAG pipeline performance by 40%" },
      { type: "fix", text: "Fixed memory leak in long-running agent sessions" },
    ],
  },
  {
    version: "1.0.5",
    date: "2025-11-20",
    type: "release",
    changes: [
      { type: "feature", text: "Introduced 5 new financial analysis tools" },
      { type: "improvement", text: "Improved observability with Arize integration" },
      { type: "fix", text: "Resolved agent timeout issues in production" },
    ],
  },
  {
    version: "1.0.4",
    date: "2025-11-15",
    type: "release",
    changes: [
      { type: "feature", text: "Added PgVector support for embeddings storage" },
      { type: "feature", text: "New document processing capabilities" },
      { type: "improvement", text: "Better error handling across all agents" },
    ],
  },
]

const CHANGE_ICONS = {
  feature: SparklesIcon,
  fix: BugIcon,
  improvement: WrenchIcon,
  breaking: ZapIcon,
}

const CHANGE_COLORS = {
  feature: "text-green-500",
  fix: "text-red-500",
  improvement: "text-blue-500",
  breaking: "text-yellow-500",
}

export function ChangelogList() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Changelog
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Track the latest changes and improvements to AgentStack.
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="relative border-l-2 border-border pl-8">
          {CHANGELOG_ENTRIES.map((entry, index) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative mb-12 last:mb-0"
            >
              <div className="absolute -left-[41px] flex size-5 items-center justify-center rounded-full border-2 border-primary bg-background">
                <div className="size-2 rounded-full bg-primary" />
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge variant="default" className="text-sm font-semibold">
                  v{entry.version}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 transition-all duration-300 ease-spring hover:border-primary/30 hover:shadow-md">
                <ul className="space-y-4">
                  {entry.changes.map((change, changeIndex) => {
                    const Icon = CHANGE_ICONS[change.type as keyof typeof CHANGE_ICONS] || SparklesIcon
                    const colorClass = CHANGE_COLORS[change.type as keyof typeof CHANGE_COLORS] || "text-primary"
                    return (
                      <li key={changeIndex} className="group flex items-start gap-3 transition-colors duration-200 hover:text-foreground">
                        <Icon className={`mt-0.5 size-5 shrink-0 ${colorClass} transition-transform duration-200 group-hover:scale-110`} />
                        <span className="text-muted-foreground">{change.text}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
