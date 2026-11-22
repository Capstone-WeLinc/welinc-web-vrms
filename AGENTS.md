# welinc-web-vrms

## Overview

The VRMS web app: a React 19 + Vite 8 + Tailwind 4 SPA where admins and mechanics manage repair tickets, users, audit logs, analytics and the knowledge base. It calls the gateway (`/auth/*` and `/vrms/*`) and signs in through the portal; the access token lives only in memory (see Gotchas).

## Key files

| File | Owns |
|---|---|
| `src/App.tsx` | All routes, the `RequireAuth` guard (the shell outline until the first refresh answers, an error with Retry when the sign in service is down) and the permission guards (`<Can>` on a key). There is no `/login` route |
| `src/lib/api/axios.ts` | The one axios instance and its 503 and 403 toasts (`quiet: true` opts a call out). The token and the 401 handling come from `src/lib/session/session.ts` |
| `src/lib/session/` | The web session (suite spec 0003): `session.ts` owns boot, refresh (Web Lock plus BroadcastChannel), the token interceptor, the 401 retry and the portal redirects; `signOutFlow.ts` backs every sign out button; `switchSystem.ts` decides when Switch system shows |
| `src/components/session/`, `src/features/auth/components/SignedInDevicesCard.tsx`, `SessionRows.tsx`, `src/lib/api/sessionsApi.ts` | Session UI: the idle warning, the reconnecting banner, the profile's Signed in devices card |
| `src/components/activity/ActivityRows.tsx`, `src/hooks/useActivityFeed.ts`, `src/lib/activity/activityFormat.ts`, `src/lib/api/activityApi.ts`, `src/features/auth/components/RecentActivityCard.tsx` | Account activity (suite spec 0011): the My profile Recent activity card; pure formatting in `activityFormat.ts`. A screen that shows a place credits DB-IP |
| `src/lib/api/*Api.ts` | Typed wrappers, one per backend area |
| `src/lib/api/errors.ts` | `getApiErrorMessage(err, fallback)` and `getApiErrorStatus(err)` for `catch` blocks. A 403 always reads as the fixed denied text, so a page never shows the server's wording for one |
| `src/store/authStore.ts` | Zustand auth store (token, expiry, session cutoff, user, boot `status`), memory only; `session.ts` is its only token writer |
| `src/features/user-management/` workload files (`lib/workload.ts`, `hooks/useWorkload.ts`, `components/UserWorkCell.tsx`, `MechanicOpenTickets.tsx`, `ReassignDialog.tsx`) | Users page workload: Occupied or Free, the `?work=` filter, and open tickets with Unassign and Reassign through `PUT /vrms/repairs/:id/assignments` (shown in `TeamPersonDialog` and the dashboard Team panel). Pure rules in `lib/workload.ts` |
| `src/features/auth/components/EmailAddressRow.tsx`, `ChangeEmailDialog.tsx`, `lib/emailChange.ts` | Suite spec 0009 Change email flow; `emailChange.ts` maps server errors to fields |
| `src/features/user-management/hooks/useUsers.ts`, `lib/accountStatus.ts`, `getTeam` in `vrmsConfigApi.ts` | Users page list from `GET /vrms/people` (VRMS's directory copy), never `/auth/users`. Read only: account changes link to the portal (`portalLinks.ts`) |
| `src/features/auth/components/DeleteAccountCard.tsx`, `DeleteAccountDialog.tsx`, `lib/accountDeletion.ts`, `lib/passwordCheck.ts` | Suite spec 0012 Delete account card; `passwordCheck.ts` maps `WRONG_PASSWORD` and `ACCOUNT_LOCKED` to the field |
| `src/features/user-management/hooks/useVrmsRoles.ts`, `getSystems` in `authApi.ts` | VRMS roles for the Users page role filter, from `GET /auth/systems`, loaded once by `UsersPage` |
| `src/components/shared/`, `src/hooks/` | Shared widgets and hooks; check here before writing one (`GoToPageInput`, `MoreMenu`, `BadgePill`, `PlateChip`, `confirm()`, `useLeaveGuard`) |
| `src/lib/permissions/` | The permission keys (`keys.ts`, mirroring the backend's `catalog.ts`), the CASL ability built from `/vrms/permissions/me` (`PermissionsProvider.tsx`, refetched on focus, every 60 seconds and after a 403), `<Can>`, `useCan()` and `usePermissions()` (spec 0011) |
| `src/features/settings/` | Admin Settings hub at `/settings` (`lib/sections.ts` gates each section by key). The permission matrix is edited in the portal (`permissionsUrl()`); `permissionsApi.ts` only reads `/vrms/permissions/me` |
| `src/features/dashboard/` | `DashboardPage` picks the Chief, Mechanic or Admin view from permission keys, never the role. Pure rules in `lib/attention.ts` and `lib/team.ts`; Chief lists reuse `DashboardTicketRow` |
| `src/features/repair/` files (specs 0017, 0018 and 0024) | `attachmentsApi.ts`, `TicketFilesProvider`, `PhotosCard`, `DocumentsCard`; pure rules in `lib/photoUpload.ts`, `photoCaption.ts`, `takenAt.ts`, `coalesce.ts`. Buttons come from `can`, `canRemove` and `canMove`, never a role. Signed links expire in 10 to 20 minutes, so the list refetches on focus after 8 minutes and after an image error |
| `src/features/repair/lib/issueRow.ts`, `hooks/useTicketView.ts`, `hooks/useTickOverrides.ts`, `components/IssuesSection.tsx`, `IssueRow.tsx` | Ticket detail issue rows (spec 0024). An issue's state is derived only by `issueState`, never stored. Open rows persist in `sessionStorage` (`lib/ticketView.ts`); the 3 s refresh never opens or closes a row. No `·` on the ticket page (`lib/noDotSeparator.test.ts`) |
| `src/features/repair/components/edit/`, `hooks/useEditSession.ts`, `lib/ticketEdits.ts` | Ticket edit dialogs on the detail page (spec 0019): one session per open dialog that keeps the ticket snapshot it opened with, `guardedClose` for the discard prompt, and the pure payload builders that send only changed fields |
| `src/features/repair/components/edit/ChecklistEditDialog.tsx`, `lib/checklist.ts` | Edit steps dialog (spec 0023); pure rules in `lib/checklist.ts` mirror the backend's `checklist-edits.ts` |
| `src/hooks/useVisiblePoll.ts`, `src/lib/visiblePoll.ts` | The one live refresh: every `TICKET_POLL_MS` (3 seconds) while the tab is visible, paused when hidden, 15 seconds after three failures in a row. The repair detail page, the repair list and the dashboard use it (spec 0019) |
| `src/features/knowledge-base/` | Library, entry, editor and suggestions pages over `/vrms/knowledge`; categories are managed in Settings, Lookup lists |
| `src/context/toast.ts` | `showToast()` and the `useToast()` hook over sonner; the `<Toaster />` is mounted in `App.tsx` (there is no toast provider) |
| `src/lib/repairStatus.ts` | The one definition of open and finished ticket statuses (mirrors the backend's `ticket-statuses.ts`); screens read it, never a list of their own |
| `src/lib/monitoring/`, `src/components/monitoring/` | VRMS spec 0025, Sentry (off with no `VITE_SENTRY_DSN`): `sentry.ts` (init from `main.tsx`, user context set in `session.ts`), `filters.ts` (what may be reported, the per page cap), `chunkReload.ts` (one silent reload when a lazy file vanished after a deploy), `CrashBoundary` and `CrashScreen` (one around the app, one around the page in `DashboardShell`). The `/debug/sentry` test page exists only in builds made with `VITE_SENTRY_TEST_ROUTES=true` |
| `src/features/analytics/` | Analytics page split into `hooks/`, `components/` (one per tab), `utils.ts`, `export.ts` (CSV and PDF) |

## Commands

```bash
npm install
npm run dev          # Vite on 8001
npm run lint         # ESLint 10 flat config (eslint.config.js)
npm run typecheck    # tsc --noEmit with the root tsconfig.json
npm run build        # typecheck then the production build; needs real https VITE_* values (CI, hosting)
npm run build:local  # typecheck then build with the committed .env.development (use this on your machine)
```

`npm run test` runs Vitest (node environment, `src/**/*.test.ts`): there is no jsdom or Testing Library, so a component is tested by rendering it to markup with `renderToStaticMarkup` (wrap anything with a `Link` in `MemoryRouter`), and a class component through its methods (`src/components/monitoring/*.test.ts`). Clicks and focus can't be tested here. Shared fixtures live in `src/test/`.

## Conventions

- `VITE_API_BASE_URL` and `VITE_PORTAL_URL` are checked by `env.schema.ts`, run from `vite.config.ts` before dev and every build (suite spec 0010): missing or malformed stops it, and a production build also refuses `http` and `localhost`. App code reads `import.meta.env.VITE_...` with no `||` fallback (`no-localhost-fallback.test.ts` fails on a local address outside comments). A new `VITE_*` name goes in `env.schema.ts`, `.env.example`, `.env.development` and `src/vite-env.d.ts` (the drift test checks the first three), plus `env:` in `ci.yml` and an `ARG` in `Dockerfile.prod`.
- Code is grouped by feature: `src/features/<feature>/{pages,components,hooks}`. Shared layout and widgets live in `src/components/`, API wrappers in `src/lib/api/`.
- Every backend call goes through the axios instance (via a wrapper in `src/lib/api/`), so it carries the token and the 401 handling. Don't use raw `fetch`.
- In `catch` blocks, leave the error untyped and read it with `getApiErrorMessage`; no `err: any`.
- Pages are named exports (`export function RepairListPage`). Imports mostly use relative paths; the `@` alias for `src` also works.
- Never check a role in the UI. Routes, nav and buttons use `<Can I="<key>">` or `useCan(...keys)`; ticket buttons use the ticket's `can` flags (`TicketCan`). Rules with conditions run on the server (spec 0011).
- Repair updates send `lastUpdatedAt` for optimistic locking; the backend rejects stale writes. Keep sending it on any new update call.
- `GET /vrms/repairs` may return an array or `{ data, total }`; `getRepairs` normalizes both.
- Colors: no hex in components (lint fails). Use `var(--token)` in inline styles and the `@theme inline` utilities in `className`; Tailwind's default palette is off. Tint with `color-mix(...)` (`tint()` in `features/analytics/utils.ts`).
- The lint config includes the React Compiler rules. Don't call `setState` synchronously inside `useEffect`: fetch in the effect and set state in `.then` with a `cancelled` flag, reset pagination inside the filter `onChange`, and adjust state from changed props during render.
- Live data refreshes through `useVisiblePoll`; don't add a page timer or a refetch on focus of your own. A background refetch updates the page but never an open edit dialog's form, which keeps the `lastUpdatedAt` it opened with (spec 0019).
- Motion uses the theme curves `ease-enter` (things arriving) and `ease-exit` (things leaving) with the duration tokens from `index.css` (suite `design.md`, Motion); `ease-snappy` and `ease-drawer` are old aliases of `ease-enter`. The lint config bans arbitrary values such as `ease-[cubic-bezier(...)]`, so add a token instead.
- `Button` variants are `default`, `outline`, `ghost`, `destructive` (quiet red text, never a solid red fill), `commit` (gold, only on the navy save bar) and `link`. There is no `secondary`; use `outline`.
- The mechanic pickers (Assign, new ticket, Reassign) share `mechanicDescription` and `sharedNames` in `features/repair/lib/mechanicOrder.ts`: a row shows only the open count, its email is the hover `title`, and the email shows inline only when two mechanics share a name. The shared `Combobox` takes an optional `title` per option.
- Drag and drop uses `@dnd-kit/core` and `@dnd-kit/sortable` (classic API) only. Start a drag from a handle (`setActivatorNodeRef`, `touch-none`), always add the `KeyboardSensor` with spoken `announcements`, and inside a dialog render the `DragOverlay` through `createPortal` to `document.body` (the dialog's transform would offset it) and hold Escape with `ResponsiveDialog`'s `onEscapeKeyDown` while a drag runs.
- Render crashes are reported only by `CrashBoundary` (spec 0025). Don't use Sentry's own `ErrorBoundary` (it would report each crash twice), and never report an API error from the browser: the server reports its own, and `filters.ts` drops anything axios raised. For a local test, put the `VITE_SENTRY_*` values in `.env.development.local`, never in the committed `.env.development`.
- Files that export components export only components (fast refresh). Put hooks, constants and helpers in their own `.ts` file.

## Gotchas

- Type sizes (`text-body`, `text-caption` and the rest) and theme shadows are registered in `extendTailwindMerge` in `src/lib/utils.ts`. Add any new size or shadow token there too, or `cn()` reads it as a color and drops the color class beside it.
- dnd-kit fires `onDragOver` at pickup with the picked up item itself as `over`, so an `onDragOver` announcement that speaks on every call replaces "Picked up …" before a screen reader reads it. Speak it only when `over` changes (`overTracker` in `features/repair/lib/checklist.ts`).
- `useRepairTicket`'s `reload` is a new function every render, so it must never sit in an effect's dependency list: it makes the effect refetch forever.
- Never put a token, the user or a last active stamp in `localStorage` or a URL (suite spec 0003, AC-19). The access token lives in the memory store only, so a reload costs one refresh before the first API call. The boot clears the old `welinc_token`, `welinc_user`, `welinc_last_active` and `welinc-auth-storage` keys. Calls to `/vrms/session/*` go through `api` with `sessionCall: true` and `withCredentials: true`.
- The analytics page never shows sample data: a failed section shows the shared error state with Retry, and CSV and PDF export stay disabled while any section is loading or failed. Peso fields arrive as `null` without `ticket.costs.view`, and the page hides money columns with a note.
- `src/lib/repairOptions.ts` holds the fixed priority, account type and root cause lists for the repair form. Corporations come from the `corporation` lookup list, and drivers from the server search (`GET /vrms/config/drivers?q=`), never from `localStorage` (spec 0016).
- shadcn components live in `src/components/ui/` (config in `components.json`). Check there before hand rolling a dialog, select, combobox or table.
- In development a Demo data pill (in `DashboardShell`, Alt+Shift+D, or `?data=worst`) swaps in break-ui datasets from `src/features/dev-ui/worst-case/`; saves are refused while a fixture shows. Production builds drop it.
- In the local Docker stack, `welinc_vrms_frontend` keeps its own `/app/node_modules` volume, so a package installed on the host is missing there and Vite shows "Failed to resolve import". After adding a dependency, run `docker exec welinc_vrms_frontend npm install`, then `docker restart welinc_vrms_frontend`.
- Seed logins for local testing are in `welinc-auth/prisma/seeds/people.json`, listed in the workspace's `docs/integration/seed-accounts.md` (for example `vrms.admin@welinc.com`). Sign in on the portal (`http://localhost:8000`).

## Agent skills

- Declined: an Agent Skill for `exifr` (photo taken time).

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
