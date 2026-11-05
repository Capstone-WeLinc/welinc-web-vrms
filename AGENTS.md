# welinc-web-vrms

## Overview

The VRMS web app: a React 19 + Vite 8 + Tailwind 4 single page app on port 8001 where admins and mechanics manage repair tickets, users, audit logs, analytics and the knowledge base. It talks to the gateway on port 3000 (`/auth/*` and `/vrms/*`, which includes `/vrms/analytics/*` and `/vrms/ai/*`) and usually receives its login token from the SSO portal.

## Key files

| File | Owns |
|---|---|
| `src/App.tsx` | All routes, the `RequireAuth` guard and the permission guards (`<Can>` on a key), user sync on mount, cross tab reload on token change |
| `src/lib/api/axios.ts` | The one axios instance: base URL, `Bearer` token from `localStorage`, sign out and redirect on 401 or an "Account is locked" 403, a toast for the 503, and on any other 403 an event that refetches the permissions plus the one fixed "You no longer have permission to do that." toast |
| `src/lib/api/*Api.ts` | Typed wrappers per backend area: `authApi`, `repairApi`, `vrmsConfigApi`, `analyticsApi`, `aiApi`, `knowledgeApi` |
| `src/lib/api/errors.ts` | `getApiErrorMessage(err, fallback)` and `getApiErrorStatus(err)` for `catch` blocks. A 403 always reads as the fixed denied text, so a page never shows the server's wording for one |
| `src/store/authStore.ts` | Zustand auth store (token, user, login, logout), persisted |
| `src/features/auth/pages/LoginPage.tsx` | SSO handoff (`?token=` from the portal); with no token it redirects to `{VITE_PORTAL_URL}/login`. There is no local login form |
| `src/features/user-management/` workload files (`lib/workload.ts`, `hooks/useWorkload.ts`, `components/UserWorkCell.tsx`, `MechanicOpenTickets.tsx`, `ReassignDialog.tsx`) | The Users page workload (feature 57): Occupied or Free from `GET /vrms/mechanics/workload` (a deactivated or locked mechanic gets a dash), the `?work=` filter, and the Open tickets list in the Edit user dialog. Its Unassign and Reassign call `PUT /vrms/repairs/:id/assignments`, so the audit rows, status moves and the 409 stale check stay on the server. The pure rules live in `lib/workload.ts` |
| `src/features/user-management/lib/mechanicSync.ts` | Calls `POST /vrms/mechanics/sync` after Users page saves and when `/users` or `/repairs/new` opens |
| `src/components/SessionMonitor.tsx` | 15 minute inactivity logout with a warning modal |
| `src/components/layout/` | `DashboardShell`, `AppHeader`, `SidebarNav`, `UserMenu`, `MobileNavSheet`, `MobileTabBar`, `PageHeader` |
| `src/components/shared/`, `src/hooks/` | Widgets used by more than one feature (`GoToPageInput` for every paginated table, `Callout`, `DetailSection`, `FormSection`, `BackLink`, `PlateChip` for naming a truck, badges) and shared hooks (`useLeaveGuard` for unsaved forms) |
| `src/lib/permissions/` | The permission keys (`keys.ts`, mirroring the backend's `catalog.ts`), the CASL ability built from `/vrms/permissions/me` (`PermissionsProvider.tsx`, refetched on focus, every 60 seconds and after a 403), `<Can>`, `useCan()` and `usePermissions()` (spec 0011) |
| `src/features/settings/` | The Admin Settings hub at `/settings` (spec 0012): Modules, Thresholds, Roles and permissions (the matrix editor with its review step), Lookup lists (issue categories, vehicle types and corporations), Vehicles (a type per truck, behind `vehicle.manage`) and Change history, backed by `settingsApi.ts` and `permissionsApi.ts`. Each section shows only for its permission key, and a switched off module comes from `modules` in `usePermissions()` |
| `src/features/dashboard/` | `DashboardPage` picks one of three dashboards from permission keys, never the role name: Chief (work, verify and see all without administer, spec 0015), Mechanic (work only) or Admin; the pure list rules live in `lib/attention.ts`. The Chief view's Team panel (spec 0022) is `components/TeamSection.tsx` on `lib/team.ts` (the roster and tickets join, sort, per person workload mix and current truck) and `hooks/useMechanicRoster.ts` (`GET /vrms/mechanics/roster`, behind `mechanics.view`) |
| `src/features/repair/` files (specs 0017 and 0018) | Ticket photos and documents: `lib/api/attachmentsApi.ts` (list, upload as multipart, remove), `TicketFilesProvider` (one list and one upload queue per ticket, keyed by ticket), `PhotoStrip` and the lazy `PhotoViewer` (yet-another-react-lightbox, loaded on first open), `DocumentsCard` (people with cost access only), and the pure rules in `lib/photoUpload.ts` and `lib/photoCaption.ts`. Spec 0018: one strip with Before and After groups (photos upload as `PHOTO`, the server picks the group), `lib/takenAt.ts` (exifr reads the taken time before the shrink) and `lib/coalesce.ts` (one shared reload when thumbnails fail together). Buttons come from the list's `can`, each file's `canRemove` and `canMove`, and a move's `blockedBy`, never a role. Signed links expire in 10 to 20 minutes, so the list refetches on focus after 8 minutes and after an image error |
| `src/features/repair/components/edit/`, `hooks/useEditSession.ts`, `lib/ticketEdits.ts` | Ticket edit dialogs on the detail page (spec 0019): one session per open dialog that keeps the ticket snapshot it opened with, `guardedClose` for the discard prompt, and the pure payload builders that send only changed fields |
| `src/hooks/useVisiblePoll.ts`, `src/lib/visiblePoll.ts` | The one live refresh: every `TICKET_POLL_MS` (3 seconds) while the tab is visible, paused when hidden, 15 seconds after three failures in a row. The repair detail page, the repair list and the dashboard use it (spec 0019) |
| `src/features/knowledge-base/` | Knowledge base library, entry, editor, suggestions and categories pages, backed by `/vrms/knowledge` (spec 0007) |
| `src/context/toast.ts`, `ToastContext.tsx` | `useToast()` hook and context, and the provider component |
| `src/lib/repairStatus.ts` | The one definition of open and finished ticket statuses (mirrors the backend's `ticket-statuses.ts`); screens read it, never a list of their own |
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

`npm run test` runs Vitest (node environment, `src/**/*.test.ts`) on pure logic only: no jsdom, no component tests. Shared fixtures live in `src/test/`.

## Conventions

- Code is grouped by feature: `src/features/<feature>/{pages,components,hooks}`. Shared layout and widgets live in `src/components/`, API wrappers in `src/lib/api/`.
- Every backend call goes through the axios instance (via a wrapper in `src/lib/api/`), so it carries the token and the 401 handling. Don't use raw `fetch`.
- In `catch` blocks, leave the error untyped and read it with `getApiErrorMessage`; no `err: any`.
- Pages are named exports (`export function RepairListPage`). Imports mostly use relative paths; the `@` alias for `src` also works.
- Never check a role in the UI. Roles are `ADMIN`, `CHIEF_MECHANIC` and `MECHANIC`, but routes, nav items and page buttons use `<Can I="<key>">` or `useCan(...keys)` on the keys the server sends, and ticket buttons use the ticket's `can` flags (`work`, `administer`, `verify`, `editCosts`, `unlock`, `assign`). The browser holds only keys and flags; rules with conditions are evaluated on the server (spec 0011).
- Repair updates send `lastUpdatedAt` for optimistic locking; the backend rejects stale writes. Keep sending it on any new update call.
- List endpoints may return either an array or `{ data, total }`; the API wrappers normalize both to `{ data, total }`.
- Colors: no hex values in components. Use the CSS variables in inline styles (`var(--primary)`, `--danger`, `--success`, `--warning`, `--muted`, `--border`, `--status-*`, `--chart-1..5`) and the token utilities from `@theme inline` in `className` (`bg-primary`, `text-muted-foreground`, `bg-highlight`; Tailwind's default palette is off, so only tokens exist). `--danger`, `--warning`, `--on-accent` and `--on-primary` are older aliases that still work. Tint with `color-mix(...)` (see `tint()` in `features/analytics/utils.ts`). Gold is `--highlight`, and text on it is `--highlight-foreground` (dark). `--accent` is now a light slate, not gold. Text on navy is `--primary-foreground`.
- The lint config includes the React Compiler rules. Don't call `setState` synchronously inside `useEffect`: fetch in the effect and set state in `.then` with a `cancelled` flag, reset pagination inside the filter `onChange`, and adjust state from changed props during render (see `CostEncodingPanel`).
- Live data refreshes through `useVisiblePoll`; don't add a page timer or a refetch on focus of your own. A background refetch updates the page but never an open edit dialog's form, which keeps the `lastUpdatedAt` it opened with (spec 0019).
- Motion uses the theme curves `ease-snappy` (dialogs, popups) and `ease-drawer` (sheets) from `index.css`. The lint config bans arbitrary values such as `ease-[cubic-bezier(...)]`, so add a token instead.
- The mechanic pickers (Assign, new ticket, Reassign) share `mechanicDescription` and `sharedNames` in `features/repair/lib/mechanicOrder.ts`: a row shows only the open count, its email is the hover `title`, and the email shows inline only when two mechanics share a name. The shared `Combobox` takes an optional `title` per option.
- Files that export components export only components (fast refresh). Put hooks, constants and helpers in their own `.ts` file.

## Gotchas

- `useRepairTicket`'s `reload` is a new function every render, so it must never sit in an effect's dependency list: it makes the effect refetch forever (this froze the photo viewer's arrow keys on a dead link).
- The auth token is stored three times: `welinc_token` and `welinc_user` in `localStorage`, plus the Zustand persist key `welinc-auth-storage`. Login, logout and the 401 handler must keep all three in step.
- There is no dark mode. No component toggles a theme and `index.css` has no `.dark` color rules, so the app is light only.
- The analytics page never shows sample data: a failed section shows the shared error state with Retry, and CSV and PDF export stay disabled while any section is loading or failed. Peso fields arrive as `null` without `ticket.costs.view`, and the page hides money columns with a note.
- `src/lib/repairOptions.ts` holds the fixed priority, account type and root cause lists for the repair form. Corporations come from the `corporation` lookup list, and drivers from the server search (`GET /vrms/config/drivers?q=`), never from `localStorage` (spec 0016).
- shadcn components live in `src/components/ui/` (config in `components.json`). Check there before hand rolling a dialog, select, combobox or table.
- For quick session timeout tests, set `window.__WELINC_INACTIVITY_LIMIT__ = 30` (seconds) in the browser console.
- In development only, a "Demo data" pill on every page (mounted in `DashboardShell`; the x folds it to a dot, Alt+Shift+D shows or hides it, an amber dot means a fixture is on; or `?data=worst`) swaps in break-ui's worst case, empty, one and 1,284 row datasets (`src/features/dev-ui/worst-case/`); on `/repairs/new` it also fills the form (`formPrefill.ts`), and saves are refused while a fixture shows. Production builds drop it. The Users page and its workload are covered too (`usersData.ts`).
- Seed logins for local testing are in `welinc-auth/prisma/seeds/users.seed.ts` (for example `vrms.admin@welinc.com`). In portal mode, open `/login?token=<jwt>` to skip the portal.

## Agent skills

- [vercel-react-best-practices](../.claude/skills/vercel-react-best-practices/), [vercel-composition-patterns](../.claude/skills/vercel-composition-patterns/): `vercel-labs/agent-skills`, React patterns. This app is on React 19, so the React 19 APIs apply.
- [shadcn](../.claude/skills/shadcn/): `shadcn-ui/ui`, adding shadcn components (config in `components.json`)
- Declined (2026-11-02): an Agent Skill search for `exifr`, the library that reads a photo's taken time (spec 0018).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
