"use client"

import { useState } from "react"
import { useNetworkContext } from "@/app/networks/providers/network-context"
import { Button } from "@/ui/button"
import { Textarea } from "@/ui/textarea"
import { SendIcon, SquareIcon } from "lucide-react"

export function NetworkInput() {
  const { sendMessage, networkStatus, stopExecution } = useNetworkContext()
  const [input, setInput] = useState("")

  const isExecuting = networkStatus === "executing" || networkStatus === "routing"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isExecuting) {
      sendMessage(input.trim())
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message to the network..."
          className="min-h-[60px] resize-none"
          disabled={isExecuting}
        />
        {isExecuting ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={stopExecution}
          >
            <SquareIcon className="size-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <SendIcon className="size-4" />
          </Button>
        )}
      </div>
    </form>
  )
}
