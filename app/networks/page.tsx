"use client"

import { NetworkProvider } from "./providers/network-context"
import { NetworkHeader } from "./components/network-header"
import { NetworkAgents } from "./components/network-agents"
import { NetworkMessages } from "./components/network-messages"
import { NetworkInput } from "./components/network-input"

export default function NetworksPage() {
  return (
    <NetworkProvider defaultNetwork="agentNetwork">
      <main className="flex h-screen flex-col bg-background">
        <NetworkHeader />
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - agents */}
          <aside className="w-80 border-r p-4">
            <NetworkAgents />
          </aside>

          {/* Main content - messages */}
          <div className="flex flex-1 flex-col">
            <div className="flex-1 overflow-hidden p-4">
              <NetworkMessages />
            </div>
            <NetworkInput />
          </div>
        </div>
      </main>
    </NetworkProvider>
  )
}
