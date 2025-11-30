"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/ui/button"
import { ArrowRightIcon } from "lucide-react"

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl"
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-4 py-1.5 text-sm backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-green-500"></span>
            </span>
            <span className="font-medium text-muted-foreground">Now with AI SDK v5 + React 19</span>
          </div>
          
          <h1 className="mb-8 text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
            Build AI Applications{" "}
            <span className="bg-linear-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              at Scale
            </span>
          </h1>
          
          <p className="mb-10 text-xl leading-relaxed text-muted-foreground sm:text-2xl">
            Production-grade multi-agent framework with RAG pipelines, 
            observability, and secure governance. Ship faster with 22+ agents ready to deploy.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild className="h-12 px-8 text-base">
              <Link href="/chat">
                Start Building <ArrowRightIcon className="ml-2 size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
              <Link href="/test">
                View Demo
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
