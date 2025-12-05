import * as React from "react"
import NextLink from "next/link"
import type { Route } from "next"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import type { UrlObject } from "url"

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string | UrlObject
  variant?: "default" | "muted" | "underline" | "nav"
  external?: boolean
  asChild?: boolean
}

const linkVariants = {
  default: "text-primary hover:underline underline-offset-4",
  muted: "text-muted-foreground hover:text-foreground transition-colors",
  underline: "underline underline-offset-4 hover:text-primary transition-colors",
  nav: "text-muted-foreground hover:text-foreground transition-colors font-medium",
}

export function Link({
  href,
  variant = "default",
  external,
  asChild,
  className,
  children,
  ...props
}: LinkProps) {
  const hrefString = typeof href === 'string' ? href : href.href ?? ''
  const isExternal = external || hrefString.startsWith("http") || hrefString.startsWith("//")
  const Comp = asChild ? Slot : isExternal ? "a" : NextLink

  const externalProps = isExternal
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {}

  return (
    <Comp
      href={href as Route}
      className={cn(linkVariants[variant], className)}
      {...externalProps}
      {...props}
    >
      {children}
    </Comp>
  )
}

export interface NavLinkProps extends Omit<LinkProps, "variant"> {
  active?: boolean
}

export function NavLink({ active, className, children, ...props }: NavLinkProps) {
  return (
    <Link
      variant="nav"
      className={cn(active && "text-foreground", className)}
      {...props}
    >
      {children}
    </Link>
  )
}
