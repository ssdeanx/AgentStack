"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/ui/button"
import { ThemeToggle } from "@/ui/theme-toggle"
import { MenuIcon, XIcon, ChevronDownIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu"

const NAV_LINKS = [
  {
    label: "Products",
    href: "#",
    items: [
      { label: "Agents", href: "/chat", description: "22+ AI agents" },
      { label: "Workflows", href: "/workflows", description: "10 automated workflows" },
      { label: "Networks", href: "/networks", description: "4 agent networks" },
      { label: "Tools", href: "/tools", description: "30+ enterprise tools" },
    ],
  },
  {
    label: "Resources",
    href: "#",
    items: [
      { label: "Documentation", href: "/docs", description: "Guides & API reference" },
      { label: "Examples", href: "/examples", description: "Code samples" },
      { label: "Blog", href: "/blog", description: "Latest updates" },
      { label: "Changelog", href: "/changelog", description: "What's new" },
    ],
  },
  { label: "Pricing", href: "/pricing" },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <nav className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-foreground">
              <span className="font-bold text-background text-sm">A</span>
            </div>
            <span className="font-semibold text-foreground">AgentStack</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) =>
              link.items ? (
                <DropdownMenu key={link.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                      <ChevronDownIcon className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {link.items.map((item) => (
                      <DropdownMenuItem key={item.label} asChild>
                        <Link href={item.href} className="flex flex-col items-start gap-0.5">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {item.description}
                          </span>
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
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              )
            )}
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/test">Demo</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/chat">Get Started</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </Button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-border/40 bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((link) =>
              link.items ? (
                <div key={link.label} className="space-y-1">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    {link.label}
                  </span>
                  {link.items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/test">Demo</Link>
              </Button>
              <Button size="sm" asChild className="w-full">
                <Link href="/chat">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
