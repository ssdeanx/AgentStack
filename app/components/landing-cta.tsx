"use client"

import Link from "next/link"
import { Button } from "@/ui/button"
import { ArrowRightIcon, GithubIcon } from "lucide-react"

export function LandingCTA() {
  return (
    <section className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Ready to Get Started?
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
          Join developers building the next generation of AI applications with AgentStack.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild className="h-12 px-8 text-base">
            <Link href="/chat">
              Launch Chat <ArrowRightIcon className="ml-2 size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
            <Link href="https://github.com" target="_blank" rel="noopener noreferrer">
              <GithubIcon className="mr-2 size-4" /> View on GitHub
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
