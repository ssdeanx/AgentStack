'use client'

import { useMemo, useState } from 'react'
import { useMastraQuery } from '@/lib/hooks/use-mastra-query'
import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from '@/src/components/ai-elements/file-tree'
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from '@/src/components/ai-elements/code-block'
import type { BundledLanguage } from 'shiki'

interface WorkspaceFileNode {
  path: string
  name: string
  isDirectory: boolean
}

const toLanguage = (path: string): BundledLanguage => {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'ts' || ext === 'tsx') {
    return 'typescript'
  }
  if (ext === 'js' || ext === 'jsx') {
    return 'javascript'
  }
  if (ext === 'json') {
    return 'json'
  }
  if (ext === 'md') {
    return 'markdown'
  }
  if (ext === 'yml' || ext === 'yaml') {
    return 'yaml'
  }
  if (ext === 'py') {
    return 'python'
  }
  if (ext === 'css') {
    return 'css'
  }
  if (ext === 'html') {
    return 'html'
  }
  return 'markdown'
}

const splitNodes = (files: WorkspaceFileNode[]) => {
  const folders = files.filter((f) => f.isDirectory)
  const plainFiles = files.filter((f) => !f.isDirectory)
  return { folders, plainFiles }
}

export default function WorkspacesPage() {
  const {
    useWorkspaces,
    useSandboxFiles,
    useSandboxReadFile,
    useWorkspaceSkills,
  } = useMastraQuery()

  const workspacesResult = useWorkspaces()
  const workspaces = workspacesResult.data?.workspaces ?? []

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('')
  const activeWorkspaceId = selectedWorkspaceId || workspaces[0]?.id || ''

  const filesResult = useSandboxFiles(activeWorkspaceId, '/', true)
  const fileNodes = useMemo(() => {
    const payload = filesResult.data as unknown
    if (typeof payload !== 'object' || payload === null) {
      return [] as WorkspaceFileNode[]
    }

    const recordPayload = payload as Record<string, unknown>
    const candidate =
      (recordPayload.entries as unknown[]) ??
      (recordPayload.items as unknown[]) ??
      (recordPayload.files as unknown[]) ??
      []

    if (!Array.isArray(candidate)) {
      return [] as WorkspaceFileNode[]
    }

    return candidate
      .filter((item) => typeof item === 'object' && item !== null)
      .map((item) => {
        const rec = item as Record<string, unknown>
        const path =
          typeof rec.path === 'string' && rec.path.length > 0
            ? rec.path
            : typeof rec.name === 'string'
              ? rec.name
              : ''
        const name =
          typeof rec.name === 'string' && rec.name.length > 0
            ? rec.name
            : path.split('/').filter(Boolean).pop() ?? path
        const isDirectory =
          rec.isDirectory === true || rec.type === 'directory' || rec.type === 'dir'

        return {
          path,
          name,
          isDirectory,
        }
      })
      .filter((node) => node.path.length > 0)
  }, [filesResult.data])

  const [selectedFilePath, setSelectedFilePath] = useState<string>('')
  const readFileResult = useSandboxReadFile(
    activeWorkspaceId,
    selectedFilePath,
    'utf-8'
  )

  const skillsResult = useWorkspaceSkills(activeWorkspaceId)
  const skills = skillsResult.data?.skills ?? []

  const selectedContent =
    (readFileResult.data as { content?: string } | undefined)?.content ?? ''

  const { folders, plainFiles } = useMemo(() => splitNodes(fileNodes), [fileNodes])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Workspaces</h1>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="workspace-select">
            Active workspace
          </label>
          <select
            id="workspace-select"
            className="rounded-md border bg-background px-2 py-1 text-sm"
            value={activeWorkspaceId}
            onChange={(e) => {
              setSelectedWorkspaceId(e.target.value)
              setSelectedFilePath('')
            }}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr_320px]">
        <section className="min-h-0 overflow-auto rounded-lg border p-3">
          <h2 className="mb-2 text-sm font-medium">Workspace Files (Sandbox)</h2>
          <FileTree
            selectedPath={selectedFilePath}
            onSelect={(value) => {
              if (typeof value === 'string') {
                setSelectedFilePath(value)
              }
            }}
          >
            {folders.map((folder) => (
              <FileTreeFolder key={folder.path} path={folder.path} name={folder.name} />
            ))}
            {plainFiles.map((file) => (
              <FileTreeFile key={file.path} path={file.path} name={file.name} />
            ))}
          </FileTree>
        </section>

        <section className="min-h-0 overflow-auto rounded-lg border">
          <CodeBlock
            code={selectedContent || '// Select a file from the workspace tree'}
            language={toLanguage(selectedFilePath || 'text')}
            showLineNumbers
          >
            <CodeBlockHeader>
              <CodeBlockTitle>{selectedFilePath || 'No file selected'}</CodeBlockTitle>
              <CodeBlockActions>
                <CodeBlockCopyButton />
              </CodeBlockActions>
            </CodeBlockHeader>
          </CodeBlock>
        </section>

        <section className="min-h-0 overflow-auto rounded-lg border p-3">
          <h2 className="mb-2 text-sm font-medium">Workspace Skills</h2>
          <ul className="space-y-2">
            {skills.length === 0 ? (
              <li className="text-sm text-muted-foreground">No skills found.</li>
            ) : (
              skills.map((skill, idx) => (
                <li key={`${skill.name ?? 'skill'}-${idx}`} className="rounded-md border p-2">
                  <div className="text-sm font-medium">{skill.name ?? `Skill ${idx + 1}`}</div>
                  {typeof skill.description === 'string' && skill.description.trim().length > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">{skill.description}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
