"use client"

import Link from "next/link"
import type { Route } from "next"
import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/ui/button"
import { ThemeToggle } from "@/ui/theme-toggle"
import {
  MenuIcon,
  XIcon,
  ChevronDownIcon,
  BotIcon,
  GitBranchIcon,
  NetworkIcon,
  WrenchIcon,
  BookOpenIcon,
  CodeIcon,
  NewspaperIcon,
  SparklesIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/ui/dropdown-menu"

const NAV_LINKS = [
  {
    label: "Products",
    href: "#",
    items: [
      {
        label: "Agents",
        href: "/chat",
        description: "22+ AI agents",
        icon: BotIcon,
      },
      {
        label: "Workflows",
        href: "/workflows",
        description: "10 automated workflows",
        icon: GitBranchIcon,
      },
      {
        label: "Networks",
        href: "/networks",
        description: "4 agent networks",
        icon: NetworkIcon,
      },
      {
        label: "Tools",
        href: "/tools",
        description: "30+ enterprise tools",
        icon: WrenchIcon,
      },
    ],
  },
  {
    label: "Resources",
    href: "#",
    items: [
      {
        label: "Documentation",
        href: "/docs",
        description: "Guides & API reference",
        icon: BookOpenIcon,
      },
      {
        label: "Examples",
        href: "/examples",
        description: "Code samples",
        icon: CodeIcon,
      },
      {
        label: "Blog",
        href: "/blog",
        description: "Latest updates",
        icon: NewspaperIcon,
      },
      {
        label: "Changelog",
        href: "/changelog",
        description: "What's new",
        icon: SparklesIcon,
      },
    ],
  },
  { label: "Pricing", href: "/pricing" },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [mobileOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  const isActiveLink = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/"
      return pathname?.startsWith(href)
    },
    [pathname]
  )

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ease-smooth ${scrolled
          ? "border-border/40 bg-background/80 backdrop-blur-lg shadow-sm"
          : "border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
        }`}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-all duration-200 ease-spring hover:opacity-80"
            aria-label="AgentStack Home"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/80 shadow-sm transition-all duration-200 ease-spring group-hover:scale-105 group-hover:shadow-md">
              <span className="font-bold text-primary-foreground text-sm">A</span>
            </div>
            <span className="font-semibold text-foreground text-lg">AgentStack</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) =>
              link.items ? (
                <DropdownMenu key={link.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {link.label}
                      <ChevronDownIcon className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-72"
                    sideOffset={8}
                  >
                    <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {link.label}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {link.items.map((item) => (
                      <DropdownMenuItem key={item.label} asChild>
                        <Link
                          href={item.href as Route}
                          className={`flex items-start gap-3 rounded-md p-2 transition-colors ${isActiveLink(item.href)
                              ? "bg-primary/10 text-primary"
                              : ""
                            }`}
                        >
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <item.icon className="size-4" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">{item.label}</span>
                            <span className="text-muted-foreground text-xs">
                              {item.description}
                            </span>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  key={link.label}
                  variant="ghost"
                  size="sm"
                  asChild
                  className={`transition-colors ${isActiveLink(link.href)
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Link href={link.href as Route}>{link.label}</Link>
                </Button>
              )
            )}
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/test">Demo</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={"/login" as Route}>Login</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="bg-linear-to-r from-primary to-primary/90 shadow-sm transition-all duration-200 ease-spring hover:shadow-md hover:-translate-y-px"
          >
            <Link href="/chat">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="relative"
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            <MenuIcon
              className={`size-5 transition-all duration-200 ${mobileOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                }`}
            />
            <XIcon
              className={`absolute size-5 transition-all duration-200 ${mobileOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
                }`}
            />
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        data-state={mobileOpen ? "open" : "closed"}
        className="mobile-menu fixed inset-x-0 top-16 z-40 h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-background lg:hidden"
        {...(!mobileOpen && { "aria-hidden": true })}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-6">
            {NAV_LINKS.map((link) =>
              link.items ? (
                <div key={link.label} className="space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {link.label}
                  </span>
                  <div className="grid gap-2">
                    {link.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href as Route}
                        className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${isActiveLink(item.href)
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent"
                          }`}
                        onClick={() => setMobileOpen(false)}
                        tabIndex={mobileOpen ? 0 : -1}
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <item.icon className="size-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.description}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={link.label}
                  href={link.href as Route}
                  className={`rounded-lg px-3 py-2.5 text-base font-medium transition-colors ${isActiveLink(link.href)
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent"
                    }`}
                  onClick={() => setMobileOpen(false)}
                  tabIndex={mobileOpen ? 0 : -1}
                >
                  {link.label}
                </Link>
              )
            )}

            {/* Mobile CTA */}
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-6">
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full"
                tabIndex={mobileOpen ? 0 : -1}
              >
                <Link href="/test" onClick={() => setMobileOpen(false)}>
                  View Demo
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full"
                tabIndex={mobileOpen ? 0 : -1}
              >
                <Link href={"/login" as Route} onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
              </Button>
              <Button
                size="lg"
                asChild
                className="w-full bg-linear-to-r from-primary to-primary/90"
                tabIndex={mobileOpen ? 0 : -1}
              >
                <Link href="/chat" onClick={() => setMobileOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu backdrop */}
      {mobileOpen && (
        <div
          className="backdrop-animate fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  )
}
