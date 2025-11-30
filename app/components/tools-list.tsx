"use client"

import { useState } from "react"
import { Input } from "@/ui/input"
import { Badge } from "@/ui/badge"
import { SearchIcon, WrenchIcon } from "lucide-react"
import { motion } from "framer-motion"

const CATEGORIES = ['All', 'Financial', 'Research', 'Data', 'RAG', 'Content', 'Utility']

const TOOLS = [
  { name: "Stock Ticker", category: "Financial", description: "Real-time stock data" },
  { name: "Company Profile", category: "Financial", description: "Detailed company information" },
  { name: "Web Search", category: "Research", description: "Search the web for information" },
  { name: "PDF Parser", category: "Data", description: "Extract text from PDF documents" },
  { name: "Vector Store", category: "RAG", description: "Store and retrieve embeddings" },
  { name: "Text Summarizer", category: "Content", description: "Summarize long text content" },
  // Add more tools as needed
]

export function ToolsList() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const filteredTools = TOOLS.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase()) || 
                          tool.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === "All" || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Tools Library
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Explore our collection of 30+ production-ready tools for your AI agents.
        </p>
      </div>
      
      <div className="mx-auto mb-12 max-w-4xl space-y-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search tools..." 
            className="h-12 pl-10 text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className="cursor-pointer px-4 py-1.5 text-sm hover:bg-primary/90"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTools.map((tool, index) => (
          <motion.div
            key={tool.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <WrenchIcon className="size-5" />
              </div>
              <Badge variant="secondary" className="text-xs">
                {tool.category}
              </Badge>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {tool.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tool.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
