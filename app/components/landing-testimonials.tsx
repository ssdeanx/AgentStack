"use client"

import { motion } from "framer-motion"
import { StarIcon } from "lucide-react"

const TESTIMONIALS = [
  {
    quote: "AgentStack transformed our development workflow. We went from concept to production in weeks instead of months.",
    author: "Sarah Chen",
    title: "CTO, TechFlow Inc.",
    avatar: "SC",
    rating: 5,
  },
  {
    quote: "The multi-agent orchestration is incredible. Our AI agents now collaborate seamlessly, handling complex tasks autonomously.",
    author: "Marcus Rodriguez",
    title: "Lead AI Engineer, DataCorp",
    avatar: "MR",
    rating: 5,
  },
  {
    quote: "Enterprise-grade observability and security features gave us the confidence to deploy in production. Outstanding framework.",
    author: "Emily Watson",
    title: "VP of Engineering, InnovateLabs",
    avatar: "EW",
    rating: 5,
  },
]

export function LandingTestimonials() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Trusted by Developers Worldwide
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          See what developers and teams are saying about building with AgentStack.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial, index) => (
          <motion.div
            key={testimonial.author}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex">
              {[...Array(testimonial.rating)].map((_, i) => (
                <StarIcon key={i} className="size-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <blockquote className="mb-6 text-muted-foreground">
              "{testimonial.quote}"
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                {testimonial.avatar}
              </div>
              <div>
                <div className="font-semibold text-foreground">{testimonial.author}</div>
                <div className="text-sm text-muted-foreground">{testimonial.title}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
