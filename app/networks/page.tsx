"use client"

import { Suspense } from "react"
import { NetworkProvider } from "./providers/network-context"
import { NetworkHeader } from "./components/network-header"
import { NetworkChat } from "./components/network-chat"
import { NetworkRoutingPanel } from "./components/network-routing-panel"

export default function NetworksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
    <NetworkProvider defaultNetwork="agentNetwork">
      <main className="flex h-screen flex-col bg-background">
        <NetworkHeader />
        <div className="flex flex-1 overflow-hidden">
          {/* Main content - chat with AI Elements */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <NetworkChat />
          </div>

          {/* Right sidebar - routing visualization */}
          <aside className="hidden w-80 shrink-0 border-l p-4 lg:block">
            <NetworkRoutingPanel />
          </aside>
        </div>
      </main>
    </NetworkProvider>
    </Suspense>
  )
}
