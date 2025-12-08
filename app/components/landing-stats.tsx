"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
import {
  BotIcon,
  WrenchIcon,
  GitBranchIcon,
  NetworkIcon,
  UsersIcon,
  StarIcon,
  DownloadIcon,
  BuildingIcon,
} from "lucide-react"

interface StatItem {
  label: string
  value: number
  suffix: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const STATS: StatItem[] = [
  {
    label: "Specialized Agents",
    value: 22,
    suffix: "+",
    icon: BotIcon,
    description: "Production-ready AI agents",
  },
  {
    label: "Enterprise Tools",
    value: 30,
    suffix: "+",
    icon: WrenchIcon,
    description: "Integrations and utilities",
  },
  {
    label: "Workflows",
    value: 10,
    suffix: "",
    icon: GitBranchIcon,
    description: "Pre-built automation templates",
  },
  {
    label: "Agent Networks",
    value: 4,
    suffix: "",
    icon: NetworkIcon,
    description: "Multi-agent orchestration",
  },
]

const SECONDARY_STATS = [
  { label: "Active Developers", value: 10, suffix: "k+", icon: UsersIcon },
  { label: "GitHub Stars", value: 2.5, suffix: "k+", icon: StarIcon },
  { label: "Weekly Downloads", value: 50, suffix: "k+", icon: DownloadIcon },
  { label: "Enterprise Clients", value: 100, suffix: "+", icon: BuildingIcon },
]

function AnimatedCounter({
  value,
  suffix,
  duration = 2,
}: {
  value: number
  suffix: string
  duration?: number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  useEffect(() => {
    if (!isInView) {return}

    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) {startTime = timestamp}
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * value * 10) / 10)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setCount(value)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [isInView, value, duration])

  return (
    <span ref={ref}>
      {Number.isInteger(value) ? Math.floor(count) : count.toFixed(1)}
      {suffix}
    </span>
  )
}

export function LandingStats() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[24px_24px]" />
      </div>

      <div className="container mx-auto px-4 py-16 lg:py-24">
        {/* Primary stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="@container mb-16 grid grid-cols-2 gap-6 @md:grid-cols-4"
        >
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:border-primary/20 hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
            >
              {/* Icon with monochrome transition */}
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-background border border-border shadow-sm text-foreground transition-all duration-300 group-hover:border-primary/30 group-hover:text-primary group-hover:scale-110">
                <stat.icon className="size-6" strokeWidth={1.5} />
              </div>

              {/* Value */}
              <div className="mb-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>

              {/* Label */}
              <div className="mb-1 text-sm font-semibold uppercase tracking-wider text-foreground">
                {stat.label}
              </div>

              {/* Description */}
              <div className="text-xs text-muted-foreground">{stat.description}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Secondary stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card/30 p-6 backdrop-blur-sm transition-discrete"
        >
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {SECONDARY_STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center justify-center gap-4 text-center md:justify-start transition-all duration-200 ease-smooth hover:scale-105"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200 group-hover:bg-foreground/10 group-hover:text-foreground">
                  <stat.icon className="size-5" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2.5} />
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom text */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
          Join thousands of developers building the future of AI applications
        </motion.p>
      </div>
    </section>
  )
}
