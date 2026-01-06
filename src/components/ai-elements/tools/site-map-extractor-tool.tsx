"use client"

import { Badge } from "@/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { TreePine, Link, ExternalLink, FileText } from "lucide-react"
import type { SiteMapExtractorUITool } from "./types"

interface SiteMapExtractorToolProps {
  toolCallId: string
  input: SiteMapExtractorUITool["input"]
  output?: SiteMapExtractorUITool["output"]
  errorText?: string
}

export function SiteMapExtractorTool({ input, output, errorText }: SiteMapExtractorToolProps) {
  if (errorText) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TreePine className="size-4 text-destructive" />
              Site Map Extraction Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-destructive">{errorText}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!output) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TreePine className="size-4 animate-pulse" />
            Extracting site map from {input.url}...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Crawling up to depth {input.maxDepth ?? 2}, max {input.maxPages ?? 50} pages
          </div>
        </CardContent>
      </Card>
    )
  }

  const { pages, totalPages } = output

  // Group pages by depth for hierarchical display
  const pagesByDepth = pages.reduce((acc, page) => {
    if (!acc[page.depth]) {acc[page.depth] = []}
    acc[page.depth].push(page)
    return acc
  }, {} as Record<number, typeof pages>)

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TreePine className="size-4 text-blue-600" />
            Site Map Extracted
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="text-blue-700">
              {totalPages} pages discovered
            </Badge>
            <Badge variant="secondary" className="text-purple-700">
              Depth: {Math.max(...pages.map(p => p.depth))}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Site Structure */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Site Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(pagesByDepth)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([depth, depthPages]) => (
                <div key={depth} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <div className="w-4 h-px bg-muted-foreground" />
                    Depth {depth}
                    <Badge variant="outline" className="text-xs">
                      {depthPages.length} pages
                    </Badge>
                  </div>
                  <div className="ml-6 space-y-1">
                    {depthPages.map((page, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                        <FileText className="size-3 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {page.title ?? page.url.split('/').pop() ?? 'Untitled'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {page.url}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Badge variant="secondary" className="text-xs">
                            {page.internalLinks.length} internal
                          </Badge>
                          {page.externalLinks.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {page.externalLinks.length} external
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
