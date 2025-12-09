"use client"

import { motion } from "framer-motion"
import { NetworkBackground } from "./network-background"

export function LandingHero() {
  return (
    <section className="relative h-[800px] w-full overflow-hidden border-b border-border bg-background">
      {/* Interactive System Visualization */}
      <NetworkBackground />

      {/* Vignette to focus attention */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)]" />

      <div className="container relative z-10 mx-auto flex h-full flex-col items-center justify-center px-4 text-center">

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl"
        >
          <div className="mb-6 inline-flex items-center rounded-full border border-white/10 bg-black/50 px-3 py-1 text-sm backdrop-blur-md shadow-lg shadow-black/20">
            <span className="flex size-2 me-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-white/80 font-mono text-xs tracking-wider">SYSTEM OPERATIONAL</span>
          </div>

          <h1 className="mb-8 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-8xl drop-shadow-2xl">
            Agent Orchestration
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-b from-white to-white/50">
              Interactive Swarm
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
             Visualizing real-time agent interactions. Hover over the nodes to interact with the neural network.
          </p>

          <div className="flex items-center justify-center gap-4">
             <div className="h-px w-24 bg-linear-to-r from-transparent via-border to-transparent" />
             <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Live Simulation</span>
             <div className="h-px w-24 bg-linear-to-r from-transparent via-border to-transparent" />
          </div>

        </motion.div>
      </div>
    </section>
  )
}
