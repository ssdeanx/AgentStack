"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/ui/button"
import { ArrowRightIcon, PlayIcon, SparklesIcon, ZapIcon } from "lucide-react"

const FLOATING_ICONS = [
  { icon: SparklesIcon, delay: 0, x: -120, y: -80 },
  { icon: ZapIcon, delay: 0.5, x: 100, y: -60 },
  { icon: SparklesIcon, delay: 1, x: -80, y: 60 },
  { icon: ZapIcon, delay: 1.5, x: 140, y: 40 },
]

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background py-24 sm:py-32 lg:py-40">
      {/* Animated grid background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

      {/* Gradient orbs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.2, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-[120px]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 2, delay: 0.5 }}
        className="absolute bottom-0 right-0 -z-10 h-[400px] w-[400px] translate-x-1/4 translate-y-1/4 rounded-full bg-blue-500/30 blur-[100px]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.1 }}
        transition={{ duration: 2, delay: 0.8 }}
        className="absolute bottom-0 left-0 -z-10 h-[300px] w-[300px] -translate-x-1/4 translate-y-1/4 rounded-full bg-purple-500/30 blur-[100px]"
      />

      {/* Floating icons */}
      <div className="absolute inset-0 -z-5 hidden lg:block">
        {FLOATING_ICONS.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 0.3,
              y: [0, -10, 0],
            }}
            transition={{
              opacity: { duration: 1, delay: item.delay },
              y: { duration: 3, repeat: Infinity, delay: item.delay }
            }}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(calc(-50% + ${item.x}px), calc(-50% + ${item.y}px))`
            }}
          >
            <item.icon className="size-8 text-primary/40" />
          </motion.div>
        ))}
      </div>

      <div className="container relative mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-sm backdrop-blur-sm"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            <span className="font-medium text-muted-foreground">
              Now with AI SDK v5 + React 19
            </span>
            <ArrowRightIcon className="size-3 text-muted-foreground" />
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          >
            Build AI Applications{" "}
            <span className="relative">
              <span className="relative z-10 bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
                at Scale
              </span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="absolute -bottom-2 left-0 h-3 w-full origin-left bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-sm"
              />
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl lg:text-2xl"
          >
            Production-grade multi-agent framework with RAG pipelines,
            observability, and secure governance.{" "}
            <span className="font-medium text-foreground">
              Ship faster with 22+ agents ready to deploy.
            </span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              asChild
              className="group h-12 min-w-[180px] bg-gradient-to-r from-primary to-primary/90 px-8 text-base shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              <Link href="/chat">
                Start Building
                <ArrowRightIcon className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="group h-12 min-w-[180px] px-8 text-base backdrop-blur-sm"
            >
              <Link href="/test">
                <PlayIcon className="mr-2 size-4" />
                View Demo
              </Link>
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-green-500/10">
                <div className="size-2 rounded-full bg-green-500" />
              </div>
              <span>Open Source</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-blue-500/10">
                <div className="size-2 rounded-full bg-blue-500" />
              </div>
              <span>Enterprise Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-purple-500/10">
                <div className="size-2 rounded-full bg-purple-500" />
              </div>
              <span>TypeScript First</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
