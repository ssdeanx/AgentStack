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
  NETWORK_CONFIGS,
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

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="size-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-3">
          <NetworkIcon className="size-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">Agent Networks</h1>
            <p className="text-sm text-muted-foreground">
              {networkConfig?.description || "Multi-agent routing and orchestration"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={selectedNetwork}
          onValueChange={(value) => selectNetwork(value as NetworkId)}
        >
          <SelectTrigger className="w-[280px]">
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
                        <Badge variant="secondary" className="text-xs">
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

        {networkStatus === "executing" || networkStatus === "routing" ? (
          <Button variant="outline" size="icon" onClick={stopExecution}>
            <SquareIcon className="size-4" />
          </Button>
        ) : null}

        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearHistory} title="Clear history">
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </div>
    </header>
  )
}
