"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { StarIcon, ChevronLeftIcon, ChevronRightIcon, QuoteIcon } from "lucide-react"
import { Button } from "@/ui/button"
import { Badge } from "@/ui/badge"

const TESTIMONIALS = [
  {
    quote:
      "AgentStack transformed our development workflow. We went from concept to production in weeks instead of months. The multi-agent orchestration is exactly what we needed.",
    author: "Sarah Chen",
    title: "CTO",
    company: "TechFlow Inc.",
    avatar: "SC",
    rating: 5,
    highlight: "Concept to production in weeks",
    industry: "Technology",
  },
  {
    quote:
      "The multi-agent orchestration is incredible. Our AI agents now collaborate seamlessly, handling complex tasks autonomously. Customer satisfaction improved by 40%.",
    author: "Marcus Rodriguez",
    title: "Lead AI Engineer",
    company: "DataCorp",
    avatar: "MR",
    rating: 5,
    highlight: "40% improvement in satisfaction",
    industry: "Data Analytics",
  },
  {
    quote:
      "Enterprise-grade observability and security features gave us the confidence to deploy in production. Outstanding framework with excellent documentation.",
    author: "Emily Watson",
    title: "VP of Engineering",
    company: "InnovateLabs",
    avatar: "EW",
    rating: 5,
    highlight: "Enterprise-grade security",
    industry: "Enterprise Software",
  },
  {
    quote:
      "We replaced 5 different tools with AgentStack. The unified platform approach saves us hours every week and the RAG pipelines are incredibly powerful.",
    author: "David Kim",
    title: "Head of AI",
    company: "FinanceAI",
    avatar: "DK",
    rating: 5,
    highlight: "Replaced 5 different tools",
    industry: "Financial Services",
  },
  {
    quote:
      "The developer experience is unmatched. TypeScript-first approach, great docs, and an active community. We onboarded our entire team in just two days.",
    author: "Lisa Park",
    title: "Senior Developer",
    company: "StartupXYZ",
    avatar: "LP",
    rating: 5,
    highlight: "Team onboarded in 2 days",
    industry: "Startup",
  },
  {
    quote:
      "From research to report generation, AgentStack handles our entire content pipeline. We've increased output by 3x while maintaining quality standards.",
    author: "James Mitchell",
    title: "Content Director",
    company: "MediaFirst",
    avatar: "JM",
    rating: 5,
    highlight: "3x content output increase",
    industry: "Media & Publishing",
  },
]

const COMPANY_LOGOS = [
  "TechFlow",
  "DataCorp",
  "InnovateLabs",
  "FinanceAI",
  "StartupXYZ",
  "MediaFirst",
  "CloudScale",
  "AIVentures",
]

export function LandingTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const nextTestimonial = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length)
  }, [])

  const prevTestimonial = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  }, [])

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(nextTestimonial, 5000)
    return () => clearInterval(interval)
  }, [isAutoPlaying, nextTestimonial])

  return (
    <section className="relative overflow-hidden bg-muted/30 py-24 lg:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <Badge variant="outline" className="mb-4">
            Testimonials
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Trusted by Developers Worldwide
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            See what developers and teams are saying about building with AgentStack.
          </p>
        </motion.div>

        {/* Featured testimonial carousel */}
        <div
          className="relative mx-auto mb-16 max-w-4xl"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-xl md:p-12">
            {/* Quote icon */}
            <div className="absolute right-8 top-8 opacity-10">
              <QuoteIcon className="size-24 text-primary" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {/* Rating */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex">
                    {[...Array(TESTIMONIALS[activeIndex].rating)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className="size-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {TESTIMONIALS[activeIndex].industry}
                  </Badge>
                </div>

                {/* Quote */}
                <blockquote className="mb-8 text-xl font-medium leading-relaxed text-foreground md:text-2xl">
                  "{TESTIMONIALS[activeIndex].quote}"
                </blockquote>

                {/* Highlight badge */}
                <div className="mb-8">
                  <Badge className="bg-linear-to-r from-primary to-blue-500 text-primary-foreground">
                    ✨ {TESTIMONIALS[activeIndex].highlight}
                  </Badge>
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary/70 text-lg font-bold text-primary-foreground shadow-lg">
                    {TESTIMONIALS[activeIndex].avatar}
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">
                      {TESTIMONIALS[activeIndex].author}
                    </div>
                    <div className="text-muted-foreground">
                      {TESTIMONIALS[activeIndex].title} at{" "}
                      <span className="font-medium text-foreground">
                        {TESTIMONIALS[activeIndex].company}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="absolute bottom-8 right-8 flex items-center gap-2 md:bottom-12 md:right-12">
              <Button
                variant="outline"
                size="icon"
                onClick={prevTestimonial}
                className="size-10 rounded-full"
                aria-label="Previous testimonial"
              >
                <ChevronLeftIcon className="size-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                className="size-10 rounded-full"
                aria-label="Next testimonial"
              >
                <ChevronRightIcon className="size-5" />
              </Button>
            </div>
          </div>

          {/* Dots indicator */}
          <div className="mt-6 flex justify-center gap-2">
            {TESTIMONIALS.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2 rounded-full transition-all ${index === activeIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Testimonial grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="@container grid gap-6 @md:grid-cols-2 @lg:grid-cols-3"
        >
          {TESTIMONIALS.slice(0, 6).map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`card-3d group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 ease-spring hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 cursor-pointer ${index === activeIndex ? "ring-2 ring-primary/20" : ""
                }`}
              onClick={() => setActiveIndex(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActiveIndex(index)
                }
              }}
            >
              {/* Rating */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className="size-4 fill-yellow-400 text-yellow-400 transition-transform duration-200 hover:scale-110"
                    />
                  ))}
                </div>
                <Badge variant="outline" className="text-xs">
                  {testimonial.industry}
                </Badge>
              </div>

              {/* Quote */}
              <blockquote className="mb-6 text-muted-foreground line-clamp-4 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary transition-all duration-200 ease-spring group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.title}, {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Company logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Trusted by innovative teams worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {COMPANY_LOGOS.map((company) => (
              <div
                key={company}
                className="flex h-12 items-center justify-center rounded-lg bg-muted/50 px-6 text-lg font-semibold text-muted-foreground transition-all duration-200 ease-smooth hover:bg-muted hover:text-foreground hover:scale-105"
              >
                {company}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-2 gap-8 rounded-2xl border border-border bg-card p-8 md:grid-cols-4"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground md:text-4xl">10k+</div>
            <div className="mt-1 text-sm text-muted-foreground">Developers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground md:text-4xl">500+</div>
            <div className="mt-1 text-sm text-muted-foreground">Companies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground md:text-4xl">4.9/5</div>
            <div className="mt-1 text-sm text-muted-foreground">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground md:text-4xl">99%</div>
            <div className="mt-1 text-sm text-muted-foreground">Satisfaction</div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
