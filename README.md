# WeLinc VRMS Web Admin

A React + Vite frontend for the VRMS web admin, based on WeLinc developer guidelines.

## Setup

1. Install dependencies:
   ```powershell
   npm install
   ```

2. Environment: `npm run dev` and `npm run build:local` read the committed `.env.development`; see `.env.example` for what each variable means.

3. Start the dev server:
   ```powershell
   npm run dev
   ```

The app expects the backend to run at `http://localhost:3000`.

## Available pages

- `/dashboard` — VRMS dashboard and repair overview
- `/repairs` — open repair tickets
- `/repairs/new` — create a repair ticket
- `/history` — completed / cancelled repair history
