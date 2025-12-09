"use client";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  MaximizeIcon,
  MinimizeIcon,
  PaletteIcon,
  PlayIcon,
  WandIcon,
  XIcon,
  FileCodeIcon,
  PlusIcon,
  SaveIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";

export type CodeLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "json"
  | "css"
  | "html"
  | "markdown"
  | "yaml"
  | "sql";

export type EditorTheme =
  | "vs-dark"
  | "light"
  | "one-dark-pro"
  | "github-dark"
  | "dracula";

export interface EditorFile {
  id: string;
  name: string;
  language: CodeLanguage;
  content: string;
}

export type CodeEditorProps = ComponentProps<"div"> & {
  files?: EditorFile[];
  defaultFile?: EditorFile;
  theme?: EditorTheme;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  showMinimap?: boolean;
  height?: string | number;
  onChange?: (content: string, fileId?: string) => void;
  onRun?: (content: string) => void;
  onSave?: (file: EditorFile) => void;
};

const languageLabels: Record<CodeLanguage, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  yaml: "YAML",
  sql: "SQL",
};

const languageIcons: Record<CodeLanguage, string> = {
  typescript: "TS",
  javascript: "JS",
  python: "PY",
  json: "{}",
  css: "#",
  html: "<>",
  markdown: "MD",
  yaml: "YML",
  sql: "SQL",
};

const defaultFiles: EditorFile[] = [
  {
    id: "main",
    name: "main.ts",
    language: "typescript",
    content: `// Welcome to the Code Editor
import { useState } from 'react';

export function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Hello World</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}
`,
  },
];

export const CodeEditor = ({
  files = defaultFiles,
  defaultFile,
  theme = "vs-dark",
  readOnly = false,
  showLineNumbers = true,
  showMinimap = true,
  height = "400px",
  onChange,
  onRun,
  onSave,
  className,
  ...props
}: CodeEditorProps) => {
  const [activeFileId, setActiveFileId] = useState(
    defaultFile?.id ?? files[0]?.id ?? "main"
  );
  const [editorFiles, setEditorFiles] = useState<EditorFile[]>(files);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<EditorTheme>(theme);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const activeFile = editorFiles.find((f) => f.id === activeFileId) ?? editorFiles[0];

  const handleEditorMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      editor.onDidChangeCursorPosition((e) => {
        setCursorPosition({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });
    },
    []
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) {return;}
      setEditorFiles((prev) =>
        prev.map((f) =>
          f.id === activeFileId ? { ...f, content: value } : f
        )
      );
      onChange?.(value, activeFileId);
    },
    [activeFileId, onChange]
  );

  const handleFormat = useCallback(async () => {
    if (editorRef.current) {
      await editorRef.current.getAction("editor.action.formatDocument")?.run();
    }
  }, []);

  const handleCopy = useCallback(async () => {
  await navigator.clipboard.writeText(activeFile.content);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob([activeFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeFile]);

  const handleCloseFile = useCallback(
    (fileId: string) => {
      if (editorFiles.length <= 1) {return;}
      setEditorFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (activeFileId === fileId) {
        setActiveFileId(editorFiles[0].id === fileId ? editorFiles[1].id : editorFiles[0].id);
      }
    },
    [editorFiles, activeFileId]
  );

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-background shadow-lg",
        isFullscreen && "fixed inset-4 z-50",
        className
      )}
      {...props}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <Select
            value={activeFile?.language}
            onValueChange={(lang) => {
              setEditorFiles((prev) =>
                prev.map((f) =>
                  f.id === activeFileId
                    ? { ...f, language: lang as CodeLanguage }
                    : f
                )
              );
            }}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(languageLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">
                      {languageIcons[value as CodeLanguage]}
                    </span>
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentTheme}
            onValueChange={(t) => setCurrentTheme(t as EditorTheme)}
          >
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <PaletteIcon className="mr-1 size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vs-dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="one-dark-pro">One Dark</SelectItem>
              <SelectItem value="github-dark">GitHub</SelectItem>
              <SelectItem value="dracula">Dracula</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleFormat}>
                  <WandIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Format code</TooltipContent>
            </Tooltip>

            {onSave && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onSave(activeFile)}>
                    <SaveIcon className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save file</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCopy}>
                  {copied ? (
                    <CheckIcon className="size-3.5 text-emerald-500" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy code"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleDownload}>
                  <DownloadIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download file</TooltipContent>
            </Tooltip>

            {onRun && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => onRun(activeFile?.content ?? "")}
                  >
                    <PlayIcon className="size-3.5" />
                    Run
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run code</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setIsFullscreen((prev) => !prev)}
                >
                  {isFullscreen ? (
                    <MinimizeIcon className="size-3.5" />
                  ) : (
                    <MaximizeIcon className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* File Tabs */}
      {editorFiles.length > 1 && (
        <div className="flex items-center border-b bg-muted/20 px-2">
          <Tabs value={activeFileId} onValueChange={setActiveFileId} className="flex-1">
            <TabsList className="h-8 gap-1 bg-transparent p-0">
              {editorFiles.map((file) => (
                <TabsTrigger
                  key={file.id}
                  value={file.id}
                  className="group relative h-7 gap-1.5 rounded-t-md px-3 text-xs data-[state=active]:bg-background"
                >
                  <FileCodeIcon className="size-3" />
                  {file.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseFile(file.id);
                    }}
                    className="ml-1 rounded-sm opacity-0 hover:bg-muted group-hover:opacity-100"
                    aria-label="Close file"
                  >
                    <XIcon className="size-3" />
                  </button>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Editor */}
      <div className="relative flex-1" style={{ height }}>
        <Editor
          height="100%"
          language={activeFile?.language ?? "typescript"}
          value={activeFile?.content ?? ""}
          theme={currentTheme}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            lineNumbers: showLineNumbers ? "on" : "off",
            minimap: { enabled: showMinimap },
            fontFamily: "JetBrains Mono, Menlo, Monaco, monospace",
            fontSize: 13,
            tabSize: 2,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 12, bottom: 12 },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
          <Badge variant="secondary" className="h-5 text-[10px]">
            {activeFile?.language.toUpperCase()}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {activeFile?.content.split("\n").length ?? 0} lines
        </div>
      </div>
    </div>
  );
};

export type CodeEditorSimpleProps = ComponentProps<"div"> & {
  code: string;
  language?: CodeLanguage;
  onChange?: (code: string) => void;
  height?: string | number;
};

export const CodeEditorSimple = ({
  code,
  language = "typescript",
  onChange,
  height = "200px",
  className,
  ...props
}: CodeEditorSimpleProps) => (
  <CodeEditor
    files={[{ id: "main", name: `code.${language}`, language, content: code }]}
    height={height}
    onChange={onChange}
    showMinimap={false}
    className={className}
    {...props}
  />
);
