"use client"

import Link from "next/link"
import { Button } from "@/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/ui/select"
import { Badge } from "@/ui/badge"
import { useNetworkContext } from "@/app/networks/providers/network-context"
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getNetworksByCategory,
  type NetworkId,
} from "@/app/networks/config/networks"
import {
  ArrowLeftIcon,
  NetworkIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react"
import { useMemo } from "react"

export function NetworkHeader() {
  const {
    selectedNetwork,
    selectNetwork,
    networkConfig,
    networkStatus,
    stopExecution,
    clearHistory,
    messages,
  } = useNetworkContext()

  const networksByCategory = useMemo(() => getNetworksByCategory(), [])
  const isExecuting = networkStatus === "executing" || networkStatus === "routing"

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon className="size-4" />
          </Button>
        </Link>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div className="flex items-center gap-2">
          <NetworkIcon className="size-5 text-primary" />
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold">Agent Networks</h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selectedNetwork}
          onValueChange={(value) => selectNetwork(value as NetworkId)}
        >
          <SelectTrigger className="w-[180px] md:w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ORDER.map((category) => {
              const networks = networksByCategory[category]
              if (networks.length === 0) return null

              return (
                <SelectGroup key={category}>
                  <SelectLabel>{CATEGORY_LABELS[category]}</SelectLabel>
                  {networks.map((net) => (
                    <SelectItem key={net.id} value={net.id}>
                      <div className="flex items-center gap-2">
                        <span>{net.name}</span>
                        <Badge variant="secondary" className="hidden text-xs sm:inline-flex">
                          {net.agents.length} agents
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>

        {isExecuting && (
          <Button variant="outline" size="icon" onClick={stopExecution} title="Stop execution">
            <SquareIcon className="size-4" />
          </Button>
        )}

        {messages.length > 0 && !isExecuting && (
          <Button variant="ghost" size="icon" onClick={clearHistory} title="Clear history">
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </div>
    </header>
  )
}
