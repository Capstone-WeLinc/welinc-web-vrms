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

// Suite spec 0016 AC-17: classes the Control room standard removed (design.md, Banned and Typography).
const BANNED_CLASSES = [
  { pattern: '^.*-\\[.+\\]$', message: 'Arbitrary value. Use a Tailwind scale step or a token.' },
  { pattern: '^(.*[:-])?role-.+$', message: 'Color never encodes a role. Use RoleChip or InitialsTile.' },
  { pattern: '^(.*:)?ease-(snappy|drawer)$', message: 'Removed motion name. Use ease-enter or ease-exit.' },
]
const SWEEP_CLASSES = [
  { pattern: '^(.*:)?shadow-(xs|sm|md|lg)$', message: 'Banned shadow. Use shadow-card, shadow-pop, shadow-bar or shadow-dialog.' },
  {
    pattern: '^(.*:)?text-(xs|sm|base|lg|xl|2xl)$',
    message: 'Old type size. Use text-caption, text-body, text-group, text-subheading, text-heading or text-title.',
  },
]

const TOKEN_ONLY_FILES = ['src/**/*.{ts,tsx}']

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
    plugins: { 'better-tailwindcss': betterTailwindcss, 'design-sweep': betterTailwindcss },
    settings: {
      'better-tailwindcss': { entryPoint: 'src/index.css' },
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', { ignore: LEGACY_CLASSES }],
      'better-tailwindcss/no-restricted-classes': ['error', { restrict: BANNED_CLASSES }],
      // Spec 0016 AC-17: the page sweep moved every page off the old sizes and shadows.
      'design-sweep/no-restricted-classes': ['error', { restrict: SWEEP_CLASSES }],
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
