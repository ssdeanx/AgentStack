'use client'

import { clsx } from 'clsx'

export interface MonacoTab {
  id: string
  label: string
  language: string
}

interface MonacoTabsProps {
  tabs: MonacoTab[]
  activeId: string
  onSelect: (id: string) => void
}

export function MonacoTabs({ tabs, activeId, onSelect }: MonacoTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-muted/40 px-2 py-1 text-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={clsx(
            'flex items-center gap-2 rounded-md px-3 py-1 transition',
            activeId === tab.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-foreground/70 hover:bg-background'
          )}
          aria-label={`Open ${tab.label}`}
        >
          <span className="truncate">{tab.label}</span>
          <span className="text-xs text-foreground/60">{tab.language}</span>
        </button>
      ))}
    </div>
  )
}

export default MonacoTabs
