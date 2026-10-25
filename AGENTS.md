# welinc-web-vrms

## Overview

The VRMS web app: a React 19 + Vite 8 + Tailwind 4 single page app on port 8001 where admins and mechanics manage repair tickets, users, audit logs, analytics and the knowledge base. It talks to the gateway on port 3000 (`/auth/*`, `/vrms/*`, `/analytics/*`, `/ai/*`) and usually receives its login token from the SSO portal.

## Key files

| File | Owns |
|---|---|
| `src/App.tsx` | All routes, the `RequireAuth` and `RequireRole` guards, user sync on mount, cross tab reload on token change |
| `src/lib/api/axios.ts` | The one axios instance: base URL, `Bearer` token from `localStorage`, 401 logout and redirect |
| `src/lib/api/*Api.ts` | Typed wrappers per backend area: `authApi`, `repairApi`, `vrmsConfigApi`, `analyticsApi`, `aiApi`, `knowledgeApi` |
| `src/lib/api/errors.ts` | `getApiErrorMessage(err, fallback)` and `getApiErrorStatus(err)` for `catch` blocks |
| `src/store/authStore.ts` | Zustand auth store (token, user, login, logout), persisted |
| `src/features/auth/pages/LoginPage.tsx` | SSO handoff (`?token=` from the portal) and the standalone login form |
| `src/components/SessionMonitor.tsx` | 15 minute inactivity logout with a warning modal |
| `src/components/layout/` | `DashboardShell`, `AppHeader`, `SidebarNav`, `UserMenu`, `MobileNavSheet`, `MobileTabBar`, `PageHeader` |
| `src/components/shared/`, `src/hooks/` | Widgets used by more than one feature (`GoToPageInput` for every paginated table, `Callout`, `DetailSection`, `FormSection`, `BackLink`, badges) and shared hooks (`useLeaveGuard` for unsaved forms) |
| `src/lib/roles.ts` | `isMechanicRole` (mechanic or chief mechanic) and `isKnowledgeEditor` (admin or chief mechanic) |
| `src/features/knowledge-base/` | Knowledge base library, entry, editor, suggestions and categories pages, backed by `/vrms/knowledge` (spec 0007) |
| `src/context/toast.ts`, `ToastContext.tsx` | `useToast()` hook and context, and the provider component |
| `src/types/index.ts` | Shared types: `RepairTicket`, `RepairStatus`, `UserRole`, `ManagedUser` |
| `src/index.css` | Tailwind 4 entry (`@import 'tailwindcss'`), color tokens as CSS variables mapped in `@theme inline`, plus custom classes |
| `src/features/analytics/` | Analytics page split into `hooks/`, `components/` (one per tab), `utils.ts`, `export.ts` (CSV and PDF) |

## Commands

```bash
npm install
npm run dev          # Vite on 8001
npm run lint         # ESLint 9 flat config (eslint.config.js)
npm run typecheck    # tsc --noEmit with the root tsconfig.json
npm run build        # typecheck then vite build
```

There is no test runner yet.

## Conventions

- Code is grouped by feature: `src/features/<feature>/{pages,components,hooks}`. Shared layout and widgets live in `src/components/`, API wrappers in `src/lib/api/`.
- Every backend call goes through the axios instance (via a wrapper in `src/lib/api/`), so it carries the token and the 401 handling. Don't use raw `fetch`.
- In `catch` blocks, leave the error untyped and read it with `getApiErrorMessage`; no `err: any`.
- Pages are named exports (`export function RepairListPage`). Imports mostly use relative paths; the `@` alias for `src` also works.
- Three roles: `ADMIN`, `CHIEF_MECHANIC` and `MECHANIC`. Admin only routes are wrapped in `RequireRole role="ADMIN"` (it also takes an array, like `['ADMIN', 'CHIEF_MECHANIC']` for knowledge base editing); mechanics also get UI level restrictions inside pages. A chief mechanic gets the mechanic rules on tickets, so check with `isMechanicRole`, never `role === 'MECHANIC'`.
- Repair updates send `lastUpdatedAt` for optimistic locking; the backend rejects stale writes. Keep sending it on any new update call.
- List endpoints may return either an array or `{ data, total }`; the API wrappers normalize both to `{ data, total }`.
- Colors: no hex values in components. Use the CSS variables in inline styles (`var(--primary)`, `--danger`, `--success`, `--warning`, `--muted`, `--border`, `--status-*`, `--chart-1..5`) and the token utilities from `@theme inline` in `className` (`bg-primary`, `text-muted-foreground`, `bg-highlight`; Tailwind's default palette is off, so only tokens exist). `--danger`, `--warning`, `--on-accent` and `--on-primary` are older aliases that still work. Tint with `color-mix(...)` (see `tint()` in `features/analytics/utils.ts`). Gold is `--highlight`, and text on it is `--highlight-foreground` (dark). `--accent` is now a light slate, not gold. Text on navy is `--primary-foreground`.
- The lint config includes the React Compiler rules. Don't call `setState` synchronously inside `useEffect`: fetch in the effect and set state in `.then` with a `cancelled` flag, reset pagination inside the filter `onChange`, and adjust state from changed props during render (see `CostEncodingPanel`).
- Files that export components export only components (fast refresh). Put hooks, constants and helpers in their own `.ts` file.

## Gotchas

- The auth token is stored three times: `welinc_token` and `welinc_user` in `localStorage`, plus the Zustand persist key `welinc-auth-storage`. Login, logout and the 401 handler must keep all three in step.
- There is no dark mode. No component toggles a theme and `index.css` has no `.dark` color rules, so the app is light only.
- The analytics page shows hardcoded sample data when the service returns nothing (`SAMPLE_*` in `useAnalyticsData.ts`, and fallback AI numbers in `getAiFeedbackStats`). On screen it looks like real data.
- The analytics and AI service (`/analytics/*`, `/ai/*`) does not check the JWT, so the token this app sends there is ignored.
- `src/lib/repairOptions.ts` holds the fixed dropdown lists for the repair form and the locally remembered driver names (`welinc_driver_names` in `localStorage`).
- shadcn components live in `src/components/ui/` (config in `components.json`). Check there before hand rolling a dialog, select, combobox or table.
- For quick session timeout tests, set `window.__WELINC_INACTIVITY_LIMIT__ = 30` (seconds) in the browser console.
- Seed logins for local testing are in `welinc-auth/prisma/seeds/users.seed.ts` (for example `vrms.admin@welinc.com`). In portal mode, open `/login?token=<jwt>` to skip the portal.

## Agent skills

- [vercel-react-best-practices](../.claude/skills/vercel-react-best-practices/), [vercel-composition-patterns](../.claude/skills/vercel-composition-patterns/): `vercel-labs/agent-skills`, React patterns. This app is on React 19, so the React 19 APIs apply.
- [shadcn](../.claude/skills/shadcn/): `shadcn-ui/ui`, adding shadcn components (config in `components.json`)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
