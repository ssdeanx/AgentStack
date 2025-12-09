"use client"

import Link from "next/link"
import type { Route } from "next"
import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/ui/button"
import { ThemeToggle } from "@/ui/theme-toggle"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import {
  MenuIcon,
  XIcon
} from "lucide-react"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setMobileOpen(false)
      prevPathnameRef.current = pathname
    }
  }, [pathname])

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300 border-b",
        scrolled
          ? "border-border/40 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60 shadow-sm"
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
                <Button variant="ghost" className={`relative group overflow-hidden h-9 px-4 hover:bg-primary/5 transition-all duration-200 ${pathname === "/chat" ? "bg-primary/10 shadow-sm" : ""}`}>
                    <svg className="mr-2 size-5 text-primary group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        <circle cx="9" cy="10" r="1"/>
                        <circle cx="12" cy="10" r="1"/>
                        <circle cx="15" cy="10" r="1"/>
                    </svg>
                    <span className="font-medium">Chat</span>
                    <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-primary transition-all duration-200 ${pathname === "/chat" ? "scale-x-100" : "scale-x-0"} group-hover:scale-x-100`} />
                </Button>
             </Link>

             <Link href="/networks">
                <Button variant="ghost" className={`relative group overflow-hidden h-9 px-4 hover:bg-blue-500/5 transition-all duration-200 ${pathname === "/networks" ? "bg-blue-500/10 shadow-sm" : ""}`}>
                    <svg className="mr-2 size-5 text-blue-500 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="2" r="1"/>
                        <circle cx="5" cy="7" r="1"/>
                        <circle cx="19" cy="7" r="1"/>
                        <circle cx="3" cy="12" r="1"/>
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="21" cy="12" r="1"/>
                        <circle cx="5" cy="17" r="1"/>
                        <circle cx="19" cy="17" r="1"/>
                        <circle cx="12" cy="22" r="1"/>
                        <path d="M7 7h10"/>
                        <path d="M5 12h14"/>
                        <path d="M7 17h10"/>
                        <path d="M12 2v4"/>
                        <path d="M12 18v4"/>
                        <path d="M5 7v5"/>
                        <path d="M19 7v5"/>
                        <path d="M5 17v-5"/>
                        <path d="M19 17v-5"/>
                        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.2"/>
                    </svg>
                    <span className="font-medium">Networks</span>
                    <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 transition-transform duration-200 ${pathname === "/networks" ? "scale-x-100" : "scale-x-0"} group-hover:scale-x-100`} />
                </Button>
             </Link>

             <Link href="/workflows">
                <Button variant="ghost" className={`relative group overflow-hidden h-9 px-4 hover:bg-red-500/5 transition-all duration-200 ${pathname === "/workflows" ? "bg-red-500/10 shadow-sm" : ""}`}>
                    <svg className="mr-2 size-5 text-red-500 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="6" height="6" rx="2"/>
                        <path d="M7 9V21"/>
                        <rect x="15" y="3" width="6" height="6" rx="2"/>
                        <path d="M17 9V21"/>
                        <path d="M7 15h10"/>
                        <path d="M9 12l2-2 2 2"/>
                        <path d="M15 12l2-2 2 2"/>
                    </svg>
                    <span className="font-medium">Workflows</span>
                    <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-orange-500 transition-transform duration-200 ${pathname === "/workflows" ? "scale-x-100" : "scale-x-0"} group-hover:scale-x-100`} />
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
                    <svg className="mr-2 size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
                        <path d="M20 3v4"/>
                        <path d="M22 5h-4"/>
                        <path d="M4 17v2"/>
                        <path d="M5 18H3"/>
                    </svg>
                    Get Started
                </Link>
            </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-haspopup="menu"
          aria-controls="mobile-menu"
        >
            {mobileOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

       <AnimatePresence>
         {mobileOpen && (
           <motion.div
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             transition={{ duration: 0.2 }}
             id="mobile-menu"
             className="fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-3xl border-t p-6 md:hidden flex flex-col gap-4"
           >
             <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Products</div>

             <Link href="/chat" className={`flex items-center gap-4 p-3 rounded-xl hover:bg-primary/5 transition-colors group ${pathname === "/chat" ? "bg-primary/10" : ""}`} onClick={() => setMobileOpen(false)}>
                <div className={`flex size-10 items-center justify-center rounded-lg transition-colors ${pathname === "/chat" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"} group-hover:bg-primary group-hover:text-primary-foreground`}>
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        <circle cx="9" cy="10" r="1"/>
                        <circle cx="12" cy="10" r="1"/>
                        <circle cx="15" cy="10" r="1"/>
                    </svg>
                </div>
                <div className="font-semibold text-lg">Chat Agents</div>
             </Link>

             <Link href="/networks" className={`flex items-center gap-4 p-3 rounded-xl hover:bg-blue-500/5 transition-colors group ${pathname === "/networks" ? "bg-muted" : ""}`} onClick={() => setMobileOpen(false)}>
                <div className={`flex size-10 items-center justify-center rounded-lg transition-colors ${pathname === "/networks" ? "bg-blue-500 text-white" : "bg-blue-500/10 text-blue-500"} group-hover:bg-blue-500 group-hover:text-white`}>
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="2" r="1"/>
                        <circle cx="5" cy="7" r="1"/>
                        <circle cx="19" cy="7" r="1"/>
                        <circle cx="3" cy="12" r="1"/>
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="21" cy="12" r="1"/>
                        <circle cx="5" cy="17" r="1"/>
                        <circle cx="19" cy="17" r="1"/>
                        <circle cx="12" cy="22" r="1"/>
                        <path d="M7 7h10"/>
                        <path d="M5 12h14"/>
                        <path d="M7 17h10"/>
                        <path d="M12 2v4"/>
                        <path d="M12 18v4"/>
                        <path d="M5 7v5"/>
                        <path d="M19 7v5"/>
                        <path d="M5 17v-5"/>
                        <path d="M19 17v-5"/>
                        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.2"/>
                    </svg>
                </div>
                <div className="font-semibold text-lg">Agent Networks</div>
             </Link>

             <Link href="/workflows" className={`flex items-center gap-4 p-3 rounded-xl hover:bg-red-500/5 transition-colors group ${pathname === "/workflows" ? "bg-muted" : ""}`} onClick={() => setMobileOpen(false)}>
                <div className={`flex size-10 items-center justify-center rounded-lg transition-colors ${pathname === "/workflows" ? "bg-purple-500 text-white" : "bg-purple-500/10 text-purple-500"} group-hover:bg-purple-500 group-hover:text-white`}>
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="6" height="6" rx="2"/>
                        <path d="M7 9V21"/>
                        <rect x="15" y="3" width="6" height="6" rx="2"/>
                        <path d="M17 9V21"/>
                        <path d="M7 15h10"/>
                        <path d="M9 12l2-2 2 2"/>
                        <path d="M15 12l2-2 2 2"/>
                    </svg>
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
           </motion.div>
         )}
       </AnimatePresence>
    </header>
  )
}
