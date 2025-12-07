'use client'

import type { ReactNode } from 'react'

interface MonacoToolbarProps {
  theme: string
  onThemeChange: (theme: string) => void
  language: string
  onLanguageChange: (language: string) => void
  onFormat: () => void
  onRunAction?: () => void
  themes: Array<{ id: string; label: string }>
  languages: Array<{ id: string; label: string }>
  rightSlot?: ReactNode
}

export function MonacoToolbar({
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  onFormat,
  onRunAction,
  themes,
  languages,
  rightSlot,
}: MonacoToolbarProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <label className="text-foreground/70">Theme</label>
        <select
          value={theme}
          onChange={(event) => onThemeChange(event.target.value)}
          aria-label="Select theme"
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground shadow-sm"
        >
          {themes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-foreground/70">Language</label>
        <select
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
          aria-label="Select language"
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground shadow-sm"
        >
          {languages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border bg-primary px-3 py-1 text-primary-foreground shadow-sm transition hover:brightness-105"
          onClick={onFormat}
        >
          Format
        </button>
        {onRunAction ? (
          <button
            type="button"
            className="rounded-md border border-border bg-secondary px-3 py-1 text-secondary-foreground shadow-sm transition hover:brightness-105"
            onClick={onRunAction}
          >
            Run
          </button>
        ) : null}
        {rightSlot}
      </div>
    </div>
  )
}

export default MonacoToolbar
