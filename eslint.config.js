import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import { includeIgnoreFile } from '@eslint/compat'
import { fileURLToPath } from 'node:url'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier/flat'
import reactRefresh from 'eslint-plugin-react-refresh'
import nextVitals from 'eslint-config-next/core-web-vitals'
import tseslint from 'typescript-eslint'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))
const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig([
  includeIgnoreFile(gitignorePath, 'Imported .gitignore patterns'),
  globalIgnores(
    [
      '**/.agent/**',
      '**/.claude/**',
      '**/.codacy/**',
      '**/.continue/**',
      '**/.cursor/**',
      '**/.gemini/**',
      '**/.github/**',
      '**/.kiro/**',
      '**/.kilocode/**',
      '**/.mastra/**',
      '**/.roo/**',
      '**/.spec/**',
      '**/.specify/**',
      '**/.specstory/**',
      '**/.vscode/**',
      '**/.windsurf/**',
      '**/.zencoder/**',
      '**/assets/**',
      '**/build/**',
      '**/corpus/**',
      '**/coverage/**',
      '**/data/**',
      '**/docs/**',
      '**/dist/**',
      '**/logs/**',
      '**/memory-bank/**',
      '**/memories/**',
      '**/out/**',
      '**/public/**',
      '**/scripts/**',
      '**/thoughts/**',
      '**/*.log',
      '**/*.md',
      '**/*.mdx',
    ],
    'AgentStack non-source content'
  ),
  js.configs.recommended,
  ...nextVitals,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    linterOptions: {
      noInlineConfig: false,
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: rootDir,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-var': 'warn',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'warn',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-as-const': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/member-ordering': [
        'warn',
        {
          default: ['signature', 'field', 'constructor', 'method'],
        },
      ],
      '@typescript-eslint/prefer-readonly': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
      '@typescript-eslint/prefer-regexp-exec': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      'no-undef': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  prettierConfig,
])

