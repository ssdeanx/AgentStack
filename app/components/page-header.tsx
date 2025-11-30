"use client"

import { motion } from "framer-motion"

interface PageHeaderProps {
  title: string
  description: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background py-24">
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]"></div>
      
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <div className="prose prose-lg prose-neutral dark:prose-invert mx-auto max-w-none">
            <p className="text-xl text-muted-foreground leading-relaxed">
              {description}
            </p>
            {children}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
