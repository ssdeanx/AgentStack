"use client"

import { useState } from "react"
import { DashboardProviders } from "./providers"
import { Sidebar } from "./_components"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <DashboardProviders>
      <div className="flex h-screen bg-background">
        <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </DashboardProviders>
  )
}
