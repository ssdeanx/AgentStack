"use client"

import { motion } from "framer-motion"

const STATS = [
  { label: "Specialized Agents", value: "22+" },
  { label: "Enterprise Tools", value: "30+" },
  { label: "Workflows", value: "10" },
  { label: "Agent Networks", value: "4" },
]

export function LandingStats() {
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
