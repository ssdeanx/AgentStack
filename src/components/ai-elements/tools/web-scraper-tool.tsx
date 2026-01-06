"use client"

import { Badge } from "@/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { ExternalLink, FileText, Globe, Image as ImageIcon, Link } from "lucide-react"
import type { WebScraperUITool } from "./types"
import { CodeBlock } from "../code-block"

interface WebScraperToolProps {
  toolCallId: string
  input: WebScraperUITool["input"]
  output?: WebScraperUITool["output"]
  errorText?: string
}

export function WebScraperTool({ input, output, errorText }: WebScraperToolProps) {
  if (errorText) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-destructive" />
              Web Scraping Failed
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
            <Globe className="size-4 animate-pulse" />
            Scraping {input.url}...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Extracting content with selector: {input.selector || "entire page"}
          </div>
        </CardContent>
      </Card>
    )
  }

  const { extractedData, rawContent, markdownContent, metadata, images, structuredData } = output

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="size-4 text-green-600" />
            Successfully scraped {output.url}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="text-green-700">
              {extractedData.length} elements extracted
            </Badge>
            {markdownContent && (
              <Badge variant="secondary" className="text-blue-700">
                <FileText className="size-3 mr-1" />
                Markdown generated
              </Badge>
            )}
            {images && images.length > 0 && (
              <Badge variant="secondary" className="text-purple-700">
                <ImageIcon className="size-3 mr-1" />
                {images.length} images found
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="extracted" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="extracted" className="text-xs">
            Extracted Data
          </TabsTrigger>
          <TabsTrigger value="markdown" className="text-xs">
            Markdown
          </TabsTrigger>
          <TabsTrigger value="metadata" className="text-xs">
            Metadata
          </TabsTrigger>
          <TabsTrigger value="images" className="text-xs">
            Images
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs">
            Raw HTML
          </TabsTrigger>
        </TabsList>

        <TabsContent value="extracted" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Extracted Elements</CardTitle>
            </CardHeader>
            <CardContent>
              {extractedData.length === 0 ? (
                <div className="text-sm text-muted-foreground">No elements matched the selector</div>
              ) : (
                <div className="space-y-3">
                  {extractedData.map((item, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Element {index + 1}
                      </div>
                      <CodeBlock code={JSON.stringify(item, null, 2)} language="json" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markdown" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Converted Markdown</CardTitle>
            </CardHeader>
            <CardContent>
              {markdownContent ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap text-sm">{markdownContent}</pre>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No markdown content available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Page Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              {metadata && Object.keys(metadata).length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(metadata).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-sm">{String(value || 'N/A')}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No metadata available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Images Found</CardTitle>
            </CardHeader>
            <CardContent>
              {images && images.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {images.map((image, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      <ImageIcon className="size-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{image.alt || `Image ${index + 1}`}</div>
                        <div className="text-xs text-muted-foreground truncate">{image.src}</div>
                      </div>
                      <a
                        href={image.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No images found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Raw HTML Content</CardTitle>
            </CardHeader>
            <CardContent>
              {rawContent ? (
                <CodeBlock code={rawContent} language="html" />
              ) : (
                <div className="text-sm text-muted-foreground">No raw content available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}