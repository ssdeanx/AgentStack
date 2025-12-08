import type { editor } from 'monaco-editor';

declare module './themes/*.json' {
  const value: editor.IStandaloneThemeData
  export default value
}
