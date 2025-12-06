"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Badge } from "@/ui/badge"
import { Input } from "@/ui/input"
import { SearchIcon, NetworkIcon, UsersIcon, ZapIcon, ArrowRightIcon } from "lucide-react"

const NETWORKS = [
  {
    name: "Agent Network",
    id: "agentNetwork",
    description: "Core network for routing tasks to specialized agents based on intent classification.",
    agents: 8,
    category: "Core",
    icon: NetworkIcon,
  },
  {
    name: "Data Pipeline Network",
    id: "dataPipelineNetwork",
    description: "Orchestrates data ingestion, transformation, and export workflows.",
    agents: 4,
    category: "Data",
    icon: ZapIcon,
  },
  {
    name: "Report Generation Network",
    id: "reportGenerationNetwork",
    description: "Coordinates research, writing, and editing agents for comprehensive reports.",
    agents: 5,
    category: "Content",
    icon: UsersIcon,
  },
  {
    name: "Research Pipeline Network",
    id: "researchPipelineNetwork",
    description: "Manages multi-source research synthesis and knowledge aggregation.",
    agents: 6,
    category: "Research",
    icon: NetworkIcon,
  },
]

export function NetworksList() {
  const [search, setSearch] = useState("")

  const filteredNetworks = NETWORKS.filter(network =>
    network.name.toLowerCase().includes(search.toLowerCase()) ||
    network.description.toLowerCase().includes(search.toLowerCase()) ||
    network.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Agent Networks
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Pre-configured networks for orchestrating multiple agents in complex workflows.
        </p>
      </div>

      <div className="mx-auto mb-12 max-w-xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search networks..."
            className="h-12 pl-12 text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredNetworks.map((network, index) => (
          <motion.div
            key={network.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <Link
              href={`/networks/${network.id}`}
              className="card-3d group flex h-full flex-col rounded-2xl border border-border bg-card p-8 transition-all duration-300 ease-spring hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="mb-6 flex items-start justify-between">
                <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-200 ease-spring group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105">
                  <network.icon className="size-7" />
                </div>
                <Badge variant="secondary">{network.category}</Badge>
              </div>
              
              <h2 className="mb-2 text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                {network.name}
              </h2>
              <p className="mb-6 flex-1 text-muted-foreground leading-relaxed">
                {network.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {network.agents} agents
                </span>
                <span className="inline-flex items-center text-sm font-medium text-primary">
                  Explore <ArrowRightIcon className="ml-1 size-4 transition-transform duration-200 ease-spring group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
