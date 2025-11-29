"use client"

import { useNetworkContext } from "@/app/networks/providers/network-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { ScrollArea } from "@/ui/scroll-area"
import { Loader } from "@/src/components/ai-elements/loader"
import type { UIMessage, TextUIPart } from "ai"

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"
  const textPart = message.parts?.find((p): p is TextUIPart => p.type === "text")
  const text = textPart?.text ?? ""

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  )
}

export function NetworkMessages() {
  const { messages, networkStatus, streamingOutput } = useNetworkContext()

  const isStreaming = networkStatus === "executing" || networkStatus === "routing"

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Conversation</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-4 px-4 pb-4">
            {messages.length === 0 && !isStreaming ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Send a message to start routing through the network
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}

                {isStreaming && !streamingOutput && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader size={16} />
                    <span className="text-sm">
                      {networkStatus === "routing" ? "Routing..." : "Executing..."}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
