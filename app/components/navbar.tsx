"use client"

import Link from "next/link"
import type { Route } from "next"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/ui/button"
import { ThemeToggle } from "@/ui/theme-toggle"
import { cn } from "@/lib/utils"
import {
  MenuIcon,
  XIcon,
  BotIcon,
  GitBranchIcon,
  NetworkIcon,
  ChevronDownIcon,
  SparklesIcon
} from "lucide-react"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300 border-b",
        scrolled
          ? "border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group mr-8">
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-primary/20">
                <span className="font-bold text-lg">A</span>
            </div>
            <span className="font-bold text-xl tracking-tight">AgentStack</span>
        </Link>

        {/* Desktop Nav - Action Oriented */}
        <nav className="hidden md:flex items-center gap-2">
             <Link href="/chat">
                <Button variant="ghost" className="relative group overflow-hidden h-9 px-4 hover:bg-muted/50">
                    <BotIcon className="mr-2 size-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Chat</span>
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary scale-x-0 transition-transform group-hover:scale-x-100" />
                </Button>
             </Link>

             <Link href="/networks">
                <Button variant="ghost" className="relative group overflow-hidden h-9 px-4 hover:bg-muted/50">
                    <NetworkIcon className="mr-2 size-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Networks</span>
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 scale-x-0 transition-transform group-hover:scale-x-100" />
                </Button>
             </Link>

             <Link href="/workflows">
                <Button variant="ghost" className="relative group overflow-hidden h-9 px-4 hover:bg-muted/50">
                    <GitBranchIcon className="mr-2 size-4 text-purple-500 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Workflows</span>
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-purple-500 scale-x-0 transition-transform group-hover:scale-x-100" />
                </Button>
             </Link>
        </nav>

        <div className="hidden md:flex flex-1" />

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
             <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2">Docs</Link>
             <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mr-2">Pricing</Link>

            <ThemeToggle />
            <div className="h-6 w-px bg-border/50 mx-2" />

            <Button variant="ghost" size="sm" asChild>
                <Link href={"/login" as Route}>Sign In</Link>
            </Button>
            <Button size="sm" className="rounded-full px-6 bg-foreground text-background shadow-lg hover:bg-foreground/90 hover:shadow-xl transition-all hover:-translate-y-0.5" asChild>
                <Link href="/chat">
                    <SparklesIcon className="mr-2 size-3" />
                    Get Started
                </Link>
            </Button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

       {/* Mobile Menu Overlay */}
       {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-3xl border-t p-6 md:hidden flex flex-col gap-4 animate-in slide-in-from-top-4">
             <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Products</div>

             <Link href="/chat" className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group" onClick={() => setMobileOpen(false)}>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <BotIcon className="size-5" />
                </div>
                <div className="font-semibold text-lg">Chat Agents</div>
             </Link>

             <Link href="/networks" className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group" onClick={() => setMobileOpen(false)}>
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <NetworkIcon className="size-5" />
                </div>
                <div className="font-semibold text-lg">Agent Networks</div>
             </Link>

             <Link href="/workflows" className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group" onClick={() => setMobileOpen(false)}>
                <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <GitBranchIcon className="size-5" />
                </div>
                <div className="font-semibold text-lg">Workflow Studio</div>
             </Link>

             <div className="h-px bg-border my-2" />

             <Link href="/docs" className="text-lg font-medium p-2" onClick={() => setMobileOpen(false)}>Documentation</Link>
             <Link href="/pricing" className="text-lg font-medium p-2" onClick={() => setMobileOpen(false)}>Pricing</Link>

             <div className="mt-auto flex flex-col gap-3">
                 <Button className="w-full h-12 text-base rounded-xl" asChild>
                    <Link href="/chat">Get Started Now</Link>
                 </Button>
                 <Button variant="outline" className="w-full h-12 text-base rounded-xl" asChild>
                    <Link href="/login">Sign In</Link>
                 </Button>
             </div>
        </div>
       )}
    </header>
  )
}
