"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { BookOpen, Search, ExternalLink, User, Calendar, AlertCircle, Loader2, Newspaper } from "lucide-react"
import { ScrollArea } from "@/ui/scroll-area"
import { Badge } from "@/ui/badge"

// ... (Existing ArxivPaperCard and SearchResultList)

export function NewsCarousel({ input, output, errorText }: ToolProps<any, any>) {
  if (errorText) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            News Search Failed
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
            Fetching news...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const news = output.news_results || output.data || []

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Newspaper className="size-4 text-primary" />
          News Results ({news.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {news.map((item: any, idx: number) => (
              <div key={`${item.link}-${idx}`} className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{item.source?.name || item.source}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.date}</span>
                </div>
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:underline leading-tight">
                  {item.title}
                </a>
                {item.thumbnail && (
                  <img src={item.thumbnail} alt="" className="w-full h-32 object-cover rounded-md mt-1" />
                )}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-normal">
                  {item.snippet}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

interface ToolProps<TInput, TOutput> {
  toolCallId: string
  input: TInput
  output?: TOutput
  errorText?: string
}

export function ArxivPaperCard({ input, output, errorText }: ToolProps<any, any>) {
  if (errorText) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            ArXiv Search Failed
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
            Searching ArXiv...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const papers = output.results || []

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          Research Papers ({papers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-4">
            {papers.map((paper: any) => (
              <div key={paper.url} className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:underline leading-tight">
                  {paper.title}
                </a>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="size-3" />
                    <span>{paper.authors.join(", ")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    <span>{new Date(paper.published).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-normal">
                  {paper.summary}
                </p>
                <div className="pt-1">
                  <a href={paper.url.replace('abs', 'pdf')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-medium">
                    View PDF <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export function SearchResultList({ input, output, errorText }: ToolProps<any, any>) {
  if (errorText) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            Search Failed
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
            Searching web...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const results = output.organic_results || []

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Search className="size-4 text-primary" />
          Search Results ({results.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-4">
            {results.map((result: any, idx: number) => (
              <div key={`${result.link}-${idx}`} className="flex flex-col gap-1 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  {result.link && (
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${new URL(result.link).hostname}&sz=32`} 
                      alt="" 
                      className="size-4"
                    />
                  )}
                  <span className="text-[10px] text-muted-foreground truncate">{result.displayed_link || (result.link && new URL(result.link).hostname)}</span>
                </div>
                <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline leading-tight">
                  {result.title}
                </a>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-normal mt-1">
                  {result.snippet}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
