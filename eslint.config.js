// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import { includeIgnoreFile } from '@eslint/compat'
import { fileURLToPath } from 'node:url'
import globals from 'globals'
import prettierConfig from 'eslint-config-prettier/flat'
import reactRefresh from 'eslint-plugin-react-refresh'
import nextVitals from 'eslint-config-next/core-web-vitals'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url))
const sourceFiles = ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}']
const nextSourceFiles = [
  'app/**/*.{js,jsx,ts,tsx}',
  'components/**/*.{js,jsx,ts,tsx}',
  'src/components/**/*.{js,jsx,ts,tsx}',
  'ui/**/*.{js,jsx,ts,tsx}',
  'lib/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
  'mdx-components.tsx',
  'next.config.ts',
]

const scopedNextVitals = nextVitals.map(config => ({
  ...config,
  files: nextSourceFiles,
}))

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
  ...scopedNextVitals,
  {
    linterOptions: {
      noInlineConfig: false,
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: sourceFiles,
    settings: {
      react: {
        // Avoid eslint-plugin-react calling context-based version detection (ESLint 10 compatibility).
        version: '19.2.4',
      },
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-var': 'warn',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'warn',
      'no-shadow': 'error',
      'no-undef': 'error',
      'no-redeclare': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsParser,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
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
  ...storybook.configs["flat/recommended"]
])

