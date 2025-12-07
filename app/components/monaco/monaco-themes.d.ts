import type { editor } from 'monaco-editor';

declare module 'monaco-themes/themes/*.json' {
  const value: editor.IStandaloneThemeData
  export default value
}
