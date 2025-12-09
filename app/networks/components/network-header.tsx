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
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorEmpty,
  ModelSelectorName,
  ModelSelectorLogo,
} from "@/src/components/ai-elements/model-selector"
import { useNetworkContext } from "@/app/networks/providers/network-context"
import {
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getNetworksByCategory,
  type NetworkId,
} from "@/app/networks/config/networks"
import {
  MODEL_CONFIGS,
  PROVIDER_CONFIGS,
  PROVIDER_ORDER,
  getModelsByProvider,
  formatContextWindow,
  type ModelConfig,
} from "@/app/chat/config/models"
import {
  ArrowLeftIcon,
  NetworkIcon,
  SquareIcon,
  Trash2Icon,
  CpuIcon,
  CheckIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

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

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(
    MODEL_CONFIGS.find((m) => m.isDefault) || MODEL_CONFIGS[0]
  )

  const networksByCategory = useMemo(() => getNetworksByCategory(), [])
  const modelsByProvider = useMemo(() => getModelsByProvider(), [])
  const isExecuting = networkStatus === "executing" || networkStatus === "routing"

  const handleSelectModel = (model: ModelConfig) => {
    setSelectedModel(model)
    setModelSelectorOpen(false)
  }

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
        {/* Model Selector */}
        <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
          <ModelSelectorTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden min-w-[120px] justify-between gap-2 sm:flex"
            >
              <CpuIcon className="size-3.5 text-muted-foreground" />
              <span className="truncate text-xs">{selectedModel.name}</span>
            </Button>
          </ModelSelectorTrigger>
          <ModelSelectorContent className="w-[340px]">
            <ModelSelectorInput placeholder="Search models..." />
            <ModelSelectorList className="max-h-[400px]">
              <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
              {PROVIDER_ORDER.map((provider) => {
                const models = modelsByProvider[provider]
                if (models.length === 0) {return null}
                const providerConfig = PROVIDER_CONFIGS[provider]

                return (
                  <ModelSelectorGroup
                    key={provider}
                    heading={
                      <div className="flex items-center gap-2">
                        <ModelSelectorLogo
                          provider={providerConfig.logo as never}
                          className="size-3"
                        />
                        {providerConfig.name}
                      </div>
                    }
                  >
                    {models.map((model) => (
                      <ModelSelectorItem
                        key={model.id}
                        value={model.id}
                        onSelect={() => handleSelectModel(model)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col gap-0.5">
                          <ModelSelectorName>{model.name}</ModelSelectorName>
                          <span className="text-xs text-muted-foreground">
                            {formatContextWindow(model.contextWindow)} • {model.description}
                          </span>
                        </div>
                        {selectedModel.id === model.id && (
                          <CheckIcon className="size-4 text-primary" />
                        )}
                      </ModelSelectorItem>
                    ))}
                  </ModelSelectorGroup>
                )
              })}
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>

        {/* Network Selector */}
        <Select
          value={selectedNetwork}
          onValueChange={(value) => selectNetwork(value)}
        >
          <SelectTrigger className="w-[180px] md:w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ORDER.map((category) => {
              const networks = networksByCategory[category]
              if (networks.length === 0) {return null}

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
