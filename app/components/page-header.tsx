"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/ui/badge"

interface PageHeaderProps {
  title: string
  description: string
  badge?: string
  children?: ReactNode
  centered?: boolean
  size?: "default" | "large" | "small"
  gradient?: boolean
}

export function PageHeader({
  title,
  description,
  badge,
  children,
  centered = true,
  size = "default",
  gradient = false,
}: PageHeaderProps) {
  const sizeClasses = {
    small: {
      section: "py-12 sm:py-16",
      title: "text-2xl sm:text-3xl",
      description: "text-base",
    },
    default: {
      section: "py-16 sm:py-24",
      title: "text-3xl sm:text-4xl lg:text-5xl",
      description: "text-lg lg:text-xl",
    },
    large: {
      section: "py-24 sm:py-32 lg:py-40",
      title: "text-4xl sm:text-5xl lg:text-6xl",
      description: "text-xl lg:text-2xl",
    },
  }

  const classes = sizeClasses[size]

  return (
    <section
      className={`relative overflow-hidden border-b border-border bg-background perspective ${classes.section}`}
    >
      {/* Background grid */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]" />

      {/* Gradient orb decoration */}
      {gradient && (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute left-1/2 top-0 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-[100px]"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ duration: 2, delay: 0.3 }}
            className="absolute bottom-0 right-0 -z-10 h-[300px] w-[300px] translate-x-1/4 translate-y-1/4 rounded-full bg-blue-500/30 blur-[80px]"
          />
        </>
      )}

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`mx-auto max-w-4xl ${centered ? "text-center" : ""}`}
        >
          {/* Badge */}
          {(Boolean(badge)) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-4"
            >
              <Badge variant="outline" className="px-3 py-1">
                {badge}
              </Badge>
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`mb-4 font-bold tracking-tight text-foreground ${classes.title}`}
          >
            {title}
          </motion.h1>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="prose prose-lg prose-neutral dark:prose-invert mx-auto max-w-none"
          >
            <p
              className={`text-muted-foreground leading-relaxed ${classes.description} ${centered ? "mx-auto max-w-2xl" : ""}`}
            >
              {description}
            </p>
          </motion.div>

          {/* Optional children content */}
          {Boolean(children) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8"
            >
              {children}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
