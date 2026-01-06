"use client"

import { Badge } from "@/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import type { BatchWebScraperUITool } from "./types"

interface BatchWebScraperToolProps {
  toolCallId: string
  input: BatchWebScraperUITool["input"]
  output?: BatchWebScraperUITool["output"]
  errorText?: string
}

export function BatchWebScraperTool({ input, output, errorText }: BatchWebScraperToolProps) {
  if (errorText) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <XCircle className="size-4 text-destructive" />
              Batch Scraping Failed
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
            <Clock className="size-4 animate-pulse" />
            Batch scraping {input.urls.length} URLs...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Processing multiple pages concurrently
          </div>
        </CardContent>
      </Card>
    )
  }

  const { results, totalProcessed, successful, failed } = output

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle className="size-4 text-green-600" />
            Batch Scraping Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="text-green-700">
              {successful}/{totalProcessed} successful
            </Badge>
            {failed > 0 && (
              <Badge variant="secondary" className="text-red-700">
                {failed} failed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results List */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <Card key={index} className={`border ${result.success ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="size-4 text-green-600" />
                  ) : (
                    <XCircle className="size-4 text-red-600" />
                  )}
                  <span className="truncate max-w-md">{result.url}</span>
                </div>
                <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                  {result.success ? "Success" : "Failed"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {result.success ? (
                <div className="space-y-2">
                  {(Boolean(result.markdownContent)) && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Content Preview</div>
                      <div className="text-sm line-clamp-3 prose prose-sm max-w-none">
                        {result.markdownContent?.substring(0, 200) ?? ''}...
                      </div>
                    </div>
                  )}
                  {result.extractedData && result.extractedData.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Extracted {result.extractedData.length} elements
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  {result.errorMessage ?? "Unknown error occurred"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
