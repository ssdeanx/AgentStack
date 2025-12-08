'use client'

import { loader } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'

const themeLoaders = {
  github: () => import('./themes/GitHub.json', { assert: { type: 'json' } }),
  monokai: () => import('./themes/Monokai.json', { assert: { type: 'json' } }),
  dracula: () => import('./themes/Dracula.json', { assert: { type: 'json' } }),
  solarizedDark: () => import('./themes/Solarized-dark.json', { assert: { type: 'json' } }),
} satisfies Record<string, () => Promise<unknown>>

const registeredThemes = new Set<string>()
let monacoInitialized = false
let initPromise: ReturnType<typeof loader.init> | null = null

async function getMonaco() {
  initPromise ??= loader.init()
  const monaco = await initPromise
  if (!monacoInitialized) {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowJs: true,
      allowNonTsExtensions: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      target: monaco.languages.typescript.ScriptTarget.ES2022,
      noEmit: true,
      typeRoots: ['node_modules/@types'],
    })
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })
    monacoInitialized = true
  }
  return monaco
}

async function ensureTheme(themeId: keyof typeof themeLoaders) {
  const monaco = await getMonaco()
  if (registeredThemes.has(themeId)) {
    return monaco
  }
  const imported = (await themeLoaders[themeId]()) as
    | { default: Monaco.editor.IStandaloneThemeData }
    | Monaco.editor.IStandaloneThemeData
  const themeData = 'default' in imported ? imported.default : imported
  monaco.editor.defineTheme(themeId, themeData)
  registeredThemes.add(themeId)
  return monaco
}

export const availableThemes = [
  { id: 'github', label: 'GitHub Light' },
  { id: 'monokai', label: 'Monokai' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'solarizedDark', label: 'Solarized Dark' },
] as const

export async function applyTheme(themeId: string) {
  const safeTheme = (availableThemes.some((t) => t.id === themeId) ? themeId : 'github') as keyof typeof themeLoaders
  const monaco = await ensureTheme(safeTheme)
  monaco.editor.setTheme(safeTheme)
  return safeTheme
}

export async function loadMonaco() {
  return getMonaco()
}
