"use client"

import { motion } from "framer-motion"
import {
  ShieldIcon,
  LockIcon,
  CheckCircleIcon,
  ServerIcon,
  GlobeIcon,
  ClockIcon,
  AwardIcon,
  HeartHandshakeIcon,
} from "lucide-react"
import { Badge } from "@/ui/badge"

const TRUST_SIGNALS = [
  {
    icon: ShieldIcon,
    title: "Enterprise Security",
    description: "SOC 2 Type II compliant with end-to-end encryption for all data in transit and at rest.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: LockIcon,
    title: "Data Privacy",
    description: "GDPR and CCPA compliant with zero data retention policies. Your data stays yours.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: ServerIcon,
    title: "99.9% Uptime SLA",
    description: "Enterprise-grade infrastructure with redundancy and automatic failover.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: GlobeIcon,
    title: "Global Infrastructure",
    description: "Deployed across multiple regions for low latency and high availability worldwide.",
    color: "from-orange-500 to-red-500",
  },
]

const CERTIFICATIONS = [
  { name: "SOC 2 Type II", icon: AwardIcon },
  { name: "GDPR Compliant", icon: CheckCircleIcon },
  { name: "HIPAA Ready", icon: ShieldIcon },
  { name: "ISO 27001", icon: LockIcon },
]

const TRUST_METRICS = [
  { label: "Uptime", value: "99.99%", icon: ClockIcon },
  { label: "Security Score", value: "A+", icon: ShieldIcon },
  { label: "Data Centers", value: "12+", icon: ServerIcon },
  { label: "Support SLA", value: "< 1hr", icon: HeartHandshakeIcon },
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

export function LandingTrust() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-muted/30">
      {/* Background decoration - Clean */}
      <div className="absolute inset-0 -z-10" />

      <div className="container mx-auto px-4 py-20 lg:py-28">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <Badge variant="outline" className="mb-4">
            Security & Compliance
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for Enterprise Trust
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Production-ready security, compliance, and reliability that enterprise teams demand.
          </p>
        </motion.div>

        {/* Trust signals grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="@container mb-16 grid gap-6 @sm:grid-cols-2 @lg:grid-cols-4"
        >
          {TRUST_SIGNALS.map((signal) => (
            <motion.div
              key={signal.title}
              variants={itemVariants}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
            >
              {/* Icon */}
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-background border border-border shadow-sm text-foreground transition-transform duration-200 group-hover:scale-105 group-hover:border-primary/30 group-hover:text-primary">
                <signal.icon className="size-6" strokeWidth={1.5} />
              </div>

              {/* Content */}
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {signal.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {signal.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Certifications row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Certifications & Compliance
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {CERTIFICATIONS.map((cert, index) => (
              <motion.div
                key={cert.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 shadow-sm transition-all duration-200 ease-spring hover:border-primary/30 hover:shadow-md hover:scale-105"
              >
                <cert.icon className="size-4 text-primary transition-transform duration-200 group-hover:rotate-12" />
                <span className="text-sm font-medium text-foreground">{cert.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trust metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card/50 p-8 backdrop-blur-sm"
        >
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {TRUST_METRICS.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-200 ease-spring hover:bg-primary hover:text-primary-foreground hover:scale-105">
                  <metric.icon className="size-5" />
                </div>
                <div className="text-2xl font-bold text-foreground md:text-3xl">
                  {metric.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{metric.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Open source badge */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-green-500/30 bg-green-500/10 px-6 py-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircleIcon className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-foreground">Open Source & Auditable</div>
              <div className="text-xs text-muted-foreground">
                Transparent codebase with community security reviews
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
