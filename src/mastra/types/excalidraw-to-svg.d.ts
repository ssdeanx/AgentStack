declare module 'excalidraw-to-svg' {
  interface ExcalidrawElement {
    [key: string]: any
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    angle: number
    strokeColor: string
    backgroundColor: string
    fillStyle: string
    strokeWidth: number
    strokeStyle: string
    roughness: number
    opacity: number

  }

  interface ExcalidrawAppState {
    [key: string]: any
    viewBackgroundColor?: string

  }

  interface ExcalidrawData {
    elements: ExcalidrawElement[]
    appState?: ExcalidrawAppState
    files?: Record<string, any>
  }

  interface ExportOptions {
    exportPadding?: number
    exportBackground?: boolean
    viewBackgroundColor?: string
    exportWithDarkMode?: boolean
    exportScale?: number
  }

  function excalidrawToSvg(
    excalidrawData: ExcalidrawData,
    options?: ExportOptions
  ): Promise<string>

  export = excalidrawToSvg
}
