"use client"

import { motion } from "framer-motion"
import { ShieldIcon, LockIcon, GithubIcon, CheckCircleIcon } from "lucide-react"

const TRUST_SIGNALS = [
  {
    icon: ShieldIcon,
    title: "Enterprise Security",
    description: "SOC 2 Type II compliant with end-to-end encryption",
  },
  {
    icon: LockIcon,
    title: "Data Privacy",
    description: "GDPR compliant with zero data retention policies",
  },
  {
    icon: GithubIcon,
    title: "Open Source",
    description: "Transparent codebase with community contributions",
  },
  {
    icon: CheckCircleIcon,
    title: "Production Ready",
    description: "Battle-tested in enterprise environments",
  },
]

export function LandingTrust() {
  return (
    <section className="border-b border-border bg-muted/30">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {TRUST_SIGNALS.map((signal, index) => (
            <motion.div
              key={signal.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <signal.icon className="size-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{signal.title}</h3>
              <p className="text-sm text-muted-foreground">{signal.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
