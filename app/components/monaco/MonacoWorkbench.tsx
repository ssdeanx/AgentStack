'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'

import { applyTheme, availableThemes, loadMonaco } from './theme-loader'
import MonacoStatusBar from './MonacoStatusBar'
import MonacoTabs, { type MonacoTab } from './MonacoTabs'
import MonacoToolbar from './MonacoToolbar'
import MonacoExplorer from './MonacoExplorer'
import MonacoBottomPanel, { type BottomPanelTabId } from './MonacoBottomPanel'
import MonacoRightPanel from './MonacoRightPanel'

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

const STORAGE_KEY = 'monaco-workbench-state:v1'

interface PersistedState {
    files: EditorFile[]
    activeId: string
    theme: string
    bottomPanelOpen: boolean
    bottomPanelTab: BottomPanelTabId
    rightPanelOpen: boolean
}

function readPersistedState(): PersistedState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw === null) {
            return null
        }
        return JSON.parse(raw) as PersistedState
    } catch {
        return null
    }
}

function writePersistedState(state: PersistedState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
        // ignore
    }
}

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

export default function MonacoWorkbench() {
    const [files, setFiles] = useState<EditorFile[]>(defaultFiles)
    const [activeId, setActiveId] = useState(defaultFiles[0].id)
    const [theme, setTheme] = useState<string>('github')
    const [position, setPosition] = useState({ line: 1, column: 1 })

    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
    const [monacoReady, setMonacoReady] = useState(false)
    const viewStateRef = useRef(new Map<string, Monaco.editor.ICodeEditorViewState | null>())

    const [bottomPanelOpen, setBottomPanelOpen] = useState(true)
    const [bottomPanelTab, setBottomPanelTab] = useState<BottomPanelTabId>('terminal')
    const [rightPanelOpen, setRightPanelOpen] = useState(true)

    const [terminalLines, setTerminalLines] = useState<string[]>(["AgentStack terminal ready."])
    const [problems] = useState<Array<{ message: string; severity: 'error' | 'warning' | 'info' }>>([])

    const activeFile = useMemo(
        () => files.find((file) => file.id === activeId) ?? files[0],
        [activeId, files]
    )

    useEffect(() => {
        const persisted = readPersistedState()
        if (!persisted) {
            return
        }

        if (Array.isArray(persisted.files) && persisted.files.length > 0) {
            setFiles(persisted.files)
            const persistedActive = persisted.files.some((f) => f.id === persisted.activeId)
                ? persisted.activeId
                : persisted.files[0].id
            setActiveId(persistedActive)
        }

        if (typeof persisted.theme === 'string' && persisted.theme.trim() !== '') {
            setTheme(persisted.theme)
        }

        setBottomPanelOpen(Boolean(persisted.bottomPanelOpen))
        setBottomPanelTab(persisted.bottomPanelTab ?? 'terminal')
        setRightPanelOpen(Boolean(persisted.rightPanelOpen))
    }, [])

    useEffect(() => {
        loadMonaco().then(() => setMonacoReady(true))
    }, [])

    useEffect(() => {
        applyTheme(theme).catch(() => setTheme('github'))
    }, [theme])

    useEffect(() => {
        writePersistedState({
            files,
            activeId,
            theme,
            bottomPanelOpen,
            bottomPanelTab,
            rightPanelOpen,
        })
    }, [files, activeId, theme, bottomPanelOpen, bottomPanelTab, rightPanelOpen])

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

    const handleSelectTab = useCallback(
        (id: string) => {
            const editor = editorRef.current
            if (editor) {
                const currentModelId = activeFile?.id
                if (currentModelId) {
                    viewStateRef.current.set(currentModelId, editor.saveViewState())
                }
            }
            setActiveId(id)
        },
        [activeFile]
    )

    useEffect(() => {
        const editor = editorRef.current
        if (!editor) {
            return
        }
        const state = viewStateRef.current.get(activeId) ?? null
        if (state) {
            editor.restoreViewState(state)
            editor.focus()
        }
    }, [activeId])

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

    const handleNewFile = useCallback(() => {
        const nextId = `untitled-${files.length + 1}.ts`
        setFiles((prev) => [
            ...prev,
            { id: nextId, label: nextId, language: 'typescript', value: '' },
        ])
        setTerminalLines((prev) => [...prev, `Created ${nextId}`])
        handleSelectTab(nextId)
    }, [files.length, handleSelectTab])

    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg">
            <div className="flex h-10 items-center gap-2 border-b border-border bg-card px-3 text-xs text-foreground/70">
                <span className="font-semibold">AgentStack</span>
                <span className="text-foreground/40">/</span>
                <span className="truncate">Monaco Workbench</span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] hover:bg-muted"
                        onClick={() => setBottomPanelOpen((value) => !value)}
                    >
                        {bottomPanelOpen ? 'Hide Panel' : 'Show Panel'}
                    </button>
                    <button
                        type="button"
                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] hover:bg-muted"
                        onClick={() => setRightPanelOpen((value) => !value)}
                    >
                        {rightPanelOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                    </button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1">
                <div className="w-[260px]">
                    <MonacoExplorer
                        files={files}
                        activeId={activeId}
                        onSelect={handleSelectTab}
                        onNewFile={handleNewFile}
                    />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                    <MonacoToolbar
                        theme={theme}
                        onThemeChange={setTheme}
                        language={activeFile?.language ?? 'typescript'}
                        onLanguageChange={(lang) =>
                            setFiles((prev) =>
                                prev.map((file) =>
                                    file.id === activeId ? { ...file, language: lang } : file
                                )
                            )
                        }
                        onFormat={handleFormat}
                        themes={[...availableThemes]}
                        languages={languageOptions}
                    />

                    <MonacoTabs tabs={files} activeId={activeFile?.id ?? ''} onSelect={handleSelectTab} />

                    <div className="editor-shell relative min-h-0 flex-1 overflow-hidden bg-background">
                        {monacoReady ? (
                            <Editor
                                height="100%"
                                defaultLanguage={activeFile?.language}
                                language={activeFile?.language}
                                value={activeFile?.value}
                                theme={theme}
                                onChange={handleChange}
                                onMount={handleMount}
                                options={{
                                    fontFamily:
                                        'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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
                            <div className="flex h-full w-full items-center justify-center text-foreground/70">
                                Loading editor…
                            </div>
                        )}
                    </div>

                    <div className="border-t border-border">
                        <MonacoStatusBar
                            position={position}
                            language={activeFile?.language ?? 'typescript'}
                            themeLabel={themeLabel}
                        />
                    </div>

                    {bottomPanelOpen ? (
                        <div className="h-[220px]">
                            <MonacoBottomPanel
                                activeTab={bottomPanelTab}
                                onTabChange={setBottomPanelTab}
                                terminalLines={terminalLines}
                                problems={problems}
                            />
                        </div>
                    ) : null}
                </div>

                {rightPanelOpen ? (
                    <div className="w-[320px]">
                        <MonacoRightPanel title="Details" />
                    </div>
                ) : null}
            </div>
        </div>
    )
}
