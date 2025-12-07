'use client'

interface MonacoStatusBarProps {
  position: { line: number; column: number }
  language: string
  themeLabel: string
}

export function MonacoStatusBar({ position, language, themeLabel }: MonacoStatusBarProps) {
  return (
    <div className="flex items-center justify-between border-t border-border bg-muted/60 px-3 py-2 text-xs text-foreground/80">
      <div className="flex items-center gap-3">
        <span>
          Ln {position.line}, Col {position.column}
        </span>
        <span className="uppercase tracking-wide">{language}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>{themeLabel}</span>
      </div>
    </div>
  )
}

export default MonacoStatusBar
