'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import 'monaco-editor/min/vs/editor/editor.main.css'
import Editor from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { applyTheme, availableThemes, loadMonaco } from './theme-loader'
import MonacoStatusBar from './MonacoStatusBar'
import MonacoTabs from './MonacoTabs'
import type { MonacoTab } from './MonacoTabs'
import MonacoToolbar from './MonacoToolbar'

interface EditorFile extends MonacoTab {
  value: string
}

const defaultFiles: EditorFile[] = [
  {
    id: 'app.tsx',
    label: 'app.tsx',
    language: 'typescript',
    value: `import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Monaco Editor</h1>
      <button onClick={() => setCount((value) => value + 1)}>
        Clicked {count} times
      </button>
    </div>
  )
}
`,
  },
  {
    id: 'styles.css',
    label: 'styles.css',
    language: 'css',
    value: `.editor-shell {
  background: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.12), transparent 25%),
    radial-gradient(circle at 90% 10%, rgba(45, 212, 191, 0.12), transparent 22%),
    var(--color-background);
  border: 1px solid var(--color-border);
  box-shadow: 0 10px 40px color-mix(in srgb, var(--shadow-color) 70%, transparent);
}
`,
  },
]

const languageOptions = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'json', label: 'JSON' },
  { id: 'css', label: 'CSS' },
  { id: 'markdown', label: 'Markdown' },
]

function getThemeLabel(theme: string) {
  return availableThemes.find((item) => item.id === theme)?.label ?? 'Theme'
}

export default function MonacoCodeEditor() {
  const [files, setFiles] = useState<EditorFile[]>(defaultFiles)
  const [activeId, setActiveId] = useState(defaultFiles[0].id)
  const [theme, setTheme] = useState<string>('github')
  const [position, setPosition] = useState({ line: 1, column: 1 })
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const [monacoReady, setMonacoReady] = useState(false)

  const activeFile = useMemo(
    () => files.find((file) => file.id === activeId) ?? files[0],
    [activeId, files]
  )

  useEffect(() => {
    loadMonaco().then(() => setMonacoReady(true))
  }, [])

  useEffect(() => {
    applyTheme(theme).catch(() => setTheme('github'))
  }, [theme])

  const handleChange = useCallback(
    (value: string | undefined) => {
      const currentId = activeFile?.id
      if (!currentId) {
        return
      }
      setFiles((prev) =>
        prev.map((file) => (file.id === currentId ? { ...file, value: value ?? '' } : file))
      )
    },
    [activeFile]
  )

  const handleFormat = useCallback(() => {
    const editor = editorRef.current
    if (editor) {
      editor.getAction('editor.action.formatDocument')?.run()
    }
  }, [])

  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
      editorRef.current = editor
      editor.onDidChangeCursorPosition((event) => {
        setPosition({ line: event.position.lineNumber, column: event.position.column })
      })
      monaco.editor.setTheme(theme)
    },
    [theme]
  )

  const themeLabel = getThemeLabel(theme)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <MonacoToolbar
        theme={theme}
        onThemeChange={setTheme}
        language={activeFile?.language ?? 'typescript'}
        onLanguageChange={(lang) =>
          setFiles((prev) => prev.map((file) => (file.id === activeId ? { ...file, language: lang } : file)))
        }
        onFormat={handleFormat}
        themes={[...availableThemes]}
        languages={languageOptions}
      />

      <MonacoTabs tabs={files} activeId={activeFile?.id ?? ''} onSelect={setActiveId} />

      <div className="editor-shell relative flex min-h-[360px] flex-1 overflow-hidden bg-background">
        {monacoReady ? (
          <Editor
            key={activeFile?.id}
            height="100%"
            defaultLanguage={activeFile?.language}
            language={activeFile?.language}
            value={activeFile?.value}
            theme={theme}
            onChange={handleChange}
            onMount={handleMount}
            options={{
              fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 14,
              minimap: { enabled: true },
              smoothScrolling: true,
              scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              tabSize: 2,
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-foreground/70">Loading editor…</div>
        )}
      </div>

      <MonacoStatusBar position={position} language={activeFile?.language ?? 'typescript'} themeLabel={themeLabel} />
    </div>
  )
}
