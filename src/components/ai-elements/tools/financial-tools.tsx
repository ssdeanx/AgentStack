"use client"

import { Badge } from "@/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { TrendingDown, TrendingUp, DollarSign, AlertCircle, Loader2, LineChart as LineChartIcon, Building2, Globe, Users } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"
import type { FinnhubQuotesUITool, ChartSupervisorUITool, FinnhubCompanyUITool } from "./types"

// ... (FinancialQuoteCard and FinancialChart components remain the same)

export function CompanyProfileCard({ input, output, errorText }: {
  toolCallId: string
  input: { symbol: string }
  output?: { data: any }
  errorText?: string
}) {
  if (errorText) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            Profile Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{errorText}</div>
        </CardContent>
      </Card>
    )
  }

  if (!output) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Fetching profile for {input.symbol}...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const profile = output.data
  const marketCap = profile.marketCapitalization ? `${(profile.marketCapitalization / 1000000).toFixed(2)}T` : 'N/A'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {profile.logo && (
              <img src={profile.logo} alt={profile.name} className="size-10 rounded-full border bg-muted" />
            )}
            <div>
              <CardTitle className="text-base">{profile.name}</CardTitle>
              <div className="text-sm text-muted-foreground">{profile.ticker}</div>
            </div>
          </div>
          <Badge variant="outline">{profile.finnhubIndustry || profile.industry}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="size-3" /> Market Cap
            </div>
            <div className="text-sm font-medium">{marketCap}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="size-3" /> Website
            </div>
            <a href={profile.weburl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate block">
              {new URL(profile.weburl).hostname}
            </a>
          </div>
        </div>
        {profile.description && (
          <p className="text-xs text-muted-foreground line-clamp-3">
            {profile.description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface FinancialQuoteCardProps {
  toolCallId: string
  input: { symbol: string }
  output?: {
    data: any
    metadata?: {
      symbol?: string
    }
    message?: string
  }
  errorText?: string
}

export function FinancialQuoteCard({ input, output, errorText }: FinancialQuoteCardProps) {
  if (errorText) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            Quote Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{errorText}</div>
        </CardContent>
      </Card>
    )
  }

  if (!output) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Fetching quote for {input.symbol}...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  // Handle Finnhub data structure (c: current, d: change, dp: percent change)
  const price = output.data?.c
  const change = output.data?.d
  const percentChange = output.data?.dp
  const symbol = output.metadata?.symbol ?? input.symbol

  const isPositive = change >= 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-muted-foreground" />
            <span>{symbol}</span>
          </div>
          {price && (
            <span className="text-xl font-bold">{price.toFixed(2)}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge variant={isPositive ? "default" : "destructive"} className="gap-1">
            {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {change > 0 ? "+" : ""}{change?.toFixed(2)} ({percentChange?.toFixed(2)}%)
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

interface FinancialChartProps {
  toolCallId: string
  input: { symbols: string[]; chartType?: string }
  output?: {
    data?: {
      chartData: any[]
      metadata?: {
        symbols: string[]
      }
    }
    success: boolean
  }
  errorText?: string
}

export function FinancialChart({ input, output, errorText }: FinancialChartProps) {
  if (errorText) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            Chart Generation Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">{errorText}</div>
        </CardContent>
      </Card>
    )
  }

  if (!output) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Generating chart for {input.symbols.join(", ")}...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-md" />
        </CardContent>
      </Card>
    )
  }

  const { chartData, metadata } = output.data || {}
  const symbols = metadata?.symbols || input.symbols
  const chartType = input.chartType || "line"

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <LineChartIcon className="size-4 text-primary" />
          {symbols.join(", ")} Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip />
                <Area type="monotone" dataKey="price" stroke="#8884d8" fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
