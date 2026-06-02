# WeLinc VRMS Web Admin

A React + Vite frontend for the VRMS web admin, based on WeLinc developer guidelines.

## Setup

1. Install dependencies:
   ```powershell
   npm install
   ```

2. Copy the environment example:
   ```powershell
   copy .env.example .env
   ```

3. Start the dev server:
   ```powershell
   npm run dev
   ```

The app expects the backend to run at `http://localhost:3000`.

## Available pages

- `/login` — login page
- `/dashboard` — VRMS dashboard and repair overview
- `/repairs` — open repair tickets
- `/repairs/new` — create a repair ticket
- `/history` — completed / cancelled repair history
