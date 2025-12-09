"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/ui/button"
import {
  ArrowRightIcon,
  GithubIcon,
  SparklesIcon,
  RocketIcon,
  ZapIcon,
  CheckCircleIcon,
} from "lucide-react"

const CTA_FEATURES = [
  "Free to start",
  "Open source",
  "Enterprise ready",
  "Active community",
]

const QUICK_LINKS = [
  {
    title: "Quick Start Guide",
    description: "Get up and running in 5 minutes",
    href: "/docs/getting-started",
    icon: RocketIcon,
  },
  {
    title: "API Reference",
    description: "Complete API documentation",
    href: "/api-reference",
    icon: ZapIcon,
  },
  {
    title: "Examples",
    description: "Browse code samples",
    href: "/examples",
    icon: SparklesIcon,
  },
]

export function LandingCTA() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      {/* Background gradients - subtler */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-t from-primary/5 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-24 lg:py-32">
        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm backdrop-blur-sm"
          >
            <SparklesIcon className="size-4 text-foreground" />
            <span className="font-medium text-foreground">
              Start building in minutes
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Ready to Build{" "}
            <span className="text-muted-foreground">
              Something Amazing?
            </span>
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground lg:text-xl"
          >
            Join thousands of developers building the next generation of AI applications
            with AgentStack. Open source, enterprise-ready, and backed by an amazing community.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              asChild
              className="group h-14 min-w-[200px] bg-foreground text-background px-8 text-base transition-all duration-300 ease-spring hover:bg-foreground/90 hover:-translate-y-0.5"
            >
              <Link href="/chat">
                <RocketIcon className="mr-2 size-5" />
                Launch Chat
                <ArrowRightIcon className="ml-2 size-4 transition-transform duration-200 ease-spring group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="group h-14 min-w-[200px] border px-8 text-base backdrop-blur-sm transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:bg-muted"
            >
              <Link
                href="https://github.com/ssdeanx/agentstack"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon className="mr-2 size-5" />
                Star on GitHub
              </Link>
            </Button>
          </motion.div>

          {/* Feature badges */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
            className="mt-10 flex flex-wrap items-center justify-center gap-6"
          >
            {CTA_FEATURES.map((feature, index) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <CheckCircleIcon className="size-4 text-green-500" />
                <span>{feature}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto mt-20 max-w-4xl"
        >
          <div className="@container grid gap-4 @md:grid-cols-3">
            {QUICK_LINKS.map((link, index) => (
              <motion.div
                key={link.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link
                  href={link.href}
                  className="card-3d group flex h-full flex-col rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 ease-spring hover:border-primary/50 hover:bg-card hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 ease-spring group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                    <link.icon className="size-6" />
                  </div>
                  <h3 className="mb-1 font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                    {link.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                  <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 transition-all duration-200 ease-spring group-hover:opacity-100 group-hover:translate-x-1">
                    Learn more
                    <ArrowRightIcon className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Terminal/Code preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
          className="mx-auto mt-16 max-w-2xl"
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-zinc-950 shadow-2xl">
            {/* Terminal header */}
            <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-500" />
                <div className="size-3 rounded-full bg-yellow-500" />
                <div className="size-3 rounded-full bg-green-500" />
              </div>
              <span className="ml-2 text-sm text-zinc-400">terminal</span>
            </div>

            {/* Terminal content */}
            <div className="p-6 font-mono text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">$</span>
                <span className="text-zinc-300">npx create-mastra@latest</span>
              </div>
              <div className="mt-3 text-zinc-500">
                <span className="text-blue-400">✔</span> Creating your AgentStack project...
              </div>
              <div className="mt-1 text-zinc-500">
                <span className="text-blue-400">✔</span> Installing dependencies...
              </div>
              <div className="mt-1 text-zinc-500">
                <span className="text-blue-400">✔</span> Setting up agents and tools...
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-green-400">$</span>
                <span className="text-zinc-300">npm run dev</span>
              </div>
              <div className="mt-3 text-green-400">
                ✨ Your AI agents are ready at{" "}
                <span className="underline">http://localhost:3000</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Get started with a single command. No configuration required.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
