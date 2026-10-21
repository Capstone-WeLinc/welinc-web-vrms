import { readFileSync } from 'node:fs'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Design tokens only (spec 0001, AC-3): colors live in src/index.css, never in components.
const RAW_COLOR = '/#[0-9a-fA-F]{3,8}\\b|rgba?\\(/'
const noRawColors = [
  'error',
  { selector: `Literal[value=${RAW_COLOR}]`, message: 'Raw color value. Use a design token (bg-primary, var(--primary)).' },
  { selector: `TemplateElement[value.raw=${RAW_COLOR}]`, message: 'Raw color value. Use a design token (bg-primary, var(--primary)).' },
]

// Legacy classes in index.css's @layer components are valid until the UI refresh
// deletes them. Read their names from the selector lines so this list never drifts.
const css = readFileSync(new URL('./src/index.css', import.meta.url), 'utf8')
const legacySelectors = css
  .slice(css.indexOf('@layer components {'))
  .split('\n')
  .filter((line) => /[{,]\s*$/.test(line))
  .join(' ')
const LEGACY_CLASSES = [...new Set([...legacySelectors.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => `^${m[1]}$`))]

// Milestone 4 widens this list to all of src.
const TOKEN_ONLY_FILES = [
  'src/components/ui/**/*.{ts,tsx}',
  'src/components/shared/**/*.{ts,tsx}',
  'src/features/dev-ui/**/*.{ts,tsx}',
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: TOKEN_ONLY_FILES,
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: {
      'better-tailwindcss': { entryPoint: 'src/index.css' },
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', { ignore: LEGACY_CLASSES }],
      'better-tailwindcss/no-restricted-classes': [
        'error',
        { restrict: [{ pattern: '^.*-\\[.+\\]$', message: 'Arbitrary value. Use a Tailwind scale step or a token.' }] },
      ],
      'no-restricted-syntax': noRawColors,
    },
  },
  {
    // shadcn files export their variant helpers next to the component.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
