"use client"

import { Badge } from "@/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { ExternalLink, Link, CheckCircle, XCircle } from "lucide-react"
import type { LinkExtractorUITool } from "@/src/mastra/tools/web-scraper-tool"

interface LinkExtractorToolProps {
  toolCallId: string
  input: LinkExtractorUITool["input"]
  output?: LinkExtractorUITool["output"]
  errorText?: string
}

export function LinkExtractorTool({ input, output, errorText }: LinkExtractorToolProps) {
  if (errorText) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Link className="size-4 text-destructive" />
              Link Extraction Failed
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
            <Link className="size-4 animate-pulse" />
            Extracting links from {input.url}...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Finding internal and external links
          </div>
        </CardContent>
      </Card>
    )
  }

  const { links, summary } = output

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Link className="size-4 text-green-600" />
            Links Extracted from {output.url}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="text-green-700">
              {summary.total} total links
            </Badge>
            <Badge variant="secondary" className="text-blue-700">
              {summary.internal} internal
            </Badge>
            <Badge variant="secondary" className="text-orange-700">
              {summary.external} external
            </Badge>
            {summary.invalid > 0 && (
              <Badge variant="secondary" className="text-red-700">
                {summary.invalid} invalid
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Links List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Extracted Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {links.map((link, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  link.isValid
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-red-200 bg-red-50/50'
                }`}
              >
                {link.isValid ? (
                  <CheckCircle className="size-4 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="size-4 text-red-600 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={link.type === 'internal' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {link.type}
                    </Badge>
                    {link.text && (
                      <span className="text-sm font-medium truncate">
                        {link.text}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {link.href}
                  </div>
                </div>

                {link.isValid && (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}