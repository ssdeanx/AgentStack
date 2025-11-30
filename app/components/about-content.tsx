"use client"

import { motion } from "framer-motion"

const VALUES = [
  {
    title: "Innovation",
    description: "We push the boundaries of what's possible with AI agents.",
  },
  {
    title: "Reliability",
    description: "We build systems that you can trust in production environments.",
  },
  {
    title: "Transparency",
    description: "We believe in open source and clear communication.",
  },
  {
    title: "Community",
    description: "We grow together with our users and contributors.",
  },
]

export function AboutContent() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            About AgentStack
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground">
            AgentStack is a production-grade multi-agent framework designed to help developers build, deploy, and manage AI applications at scale.
          </p>
        </motion.div>

        <div className="mb-24 grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-foreground">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              To democratize access to advanced AI agent technologies and empower developers to create intelligent systems that solve real-world problems. We believe that the future of software is agentic, and we're building the infrastructure to make that future a reality.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-bold text-foreground">The Team</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We are a team of passionate engineers, researchers, and designers dedicated to pushing the boundaries of what's possible with AI. With backgrounds in distributed systems, machine learning, and developer tools, we understand the challenges of building production AI apps.
            </p>
          </div>
        </div>

        <div>
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">Our Values</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {VALUES.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <h3 className="mb-2 text-xl font-semibold text-foreground">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
