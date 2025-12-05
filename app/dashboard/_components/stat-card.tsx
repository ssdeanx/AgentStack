"use client"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Skeleton } from "@/ui/skeleton"
import Link from "next/link"
import type { Route } from "next"
import { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: number | string
  loading?: boolean
  icon: LucideIcon
  href?: string
  description?: string
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  className?: string
}

export function StatCard({
  title,
  value,
  loading = false,
  icon: Icon,
  href,
  description,
  trend,
  className,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        href && "hover:bg-accent/50 transition-colors cursor-pointer",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.positive ? "text-green-500" : "text-red-500"
            )}
          >
            {trend.positive ? "+" : "-"}
            {trend.value}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href as Route}>{content}</Link>
  }

  return content
}
