const js = require('@eslint/js')
const tseslint = require('@typescript-eslint/eslint-plugin')
const tsparser = require('@typescript-eslint/parser')
const prettierConfig = require('eslint-config-prettier')


module.exports = [
  js.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    plugins: {
      //      react: reactPlugin,
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Standard style guide rules
      'no-unused-vars': 'warn', // Turn off base rule
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': 'warn',
      'no-var': 'warn',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'warn',
      'no-shadow': 'off', // Turn off base rule for TS version
      '@typescript-eslint/no-shadow': 'error',

      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-as-const': 'warn',
      '@typescript-eslint/consistent-type-definitions': [
        'error',
        'interface',
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/array-type': [
        'error',
        { default: 'array-simple' },
      ],
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
      '@typescript-eslint/no-unnecessary-boolean-literal-compare':
        'error',

      // Disable some rules that conflict with Standard
      'no-undef': 'off', // TypeScript handles this
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',

      // Additional code quality rules
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
    },
  },
  {
    files: [
      '/app/**/*.ts',
      '/app/**/*.tsx',
      '/src/**/*.ts',
      '/src/**/*.tsx',
      '/ui/**/*.ts',
      '/ui/**/*.tsx',
      '/lib/**/*.ts',
      '/lib/**/*.tsx',
      '/hooks/**/*.ts',
      '/hooks/**/*.tsx',
      '/pages/**/*.ts',
      '/pages/**/*.tsx'
    ],
    rules: {
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
      '@typescript-eslint/prefer-regexp-exec': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare':
        'error',

      // Disable some rules that conflict with Standard
      'no-undef': 'off', // TypeScript handles this
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',

      // Additional code quality rules
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
    },
  },
  {
    files: [
      '/app/**/*.ts',
      '/app/**/*.tsx',
      '/src/**/*.ts',
      '/src/**/*.tsx',
      '/ui/**/*.ts',
      '/ui/**/*.tsx',
      '/lib/**/*.ts',
      '/lib/**/*.tsx',
      '/hooks/**/*.ts',
      '/hooks/**/*.tsx',
      '/pages/**/*.ts',
      '/pages/**/*.tsx'
    ],
    rules: {
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'warn',
      '@typescript-eslint/prefer-regexp-exec': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare':
        'error',

      // Disable some rules that conflict with Standard
      'no-undef': 'off', // TypeScript handles this
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',

      // Additional code quality rules
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn',
    },
  },
  {
    ignores: [
      "node_modules/**/*.d.ts",
      'node_modules/',
      '/node_modules/**/*.js',
      '/node_modules/**/*.jsx',
      '/node_modules/**/*.ts',
      '/node_modules/**/*.tsx',
      '/node_modules/**/*.d.ts',
      '/dist/**/*.js',
      '/docs/**/*.md',
      '/memories/**/*.md',
      '/memory-bank/**/*.md',
      'dist/**/*.ts',
      'dist/**/*.d.ts',
      '.vscode/mcp.json',
      '.vscode',
      'memory-bank',
      'memory-bank/',
      'node_modules',
      'node_modules/**/*.ts',
      '.mastra/**',
      'eslint.config.js',
      'vitest.config.ts',
      'globalSetup.ts',
      'testSetup.ts',
      'vite.config.ts',
      '.github/**',
      '.kilocode/**',
      'scripts/**',
      '.gemini/**',
      '.github/prompts/**/*.md',
      '.github/chatmodes/*.md',
      'logs/*.log',
      '.kilocode/**/*.md',
      'memory-bank/**/*.md',
      '.spec/**',
      '.specstory/**',
      '.kiro/**',
      '.vscode/**',
      '.codacy/**',
      'docs/**',
      'components/ui/**',
      'docker/**',
      'public/**',
      'coverage/**',
      'LICENSE',
      'CHANGELOG.md',
      'README.md',
      'CONTRIBUTING.md',
    ],
  },
]
