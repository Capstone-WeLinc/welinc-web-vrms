import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { boot } from './lib/session/session';
import { CrashBoundary } from './components/monitoring/CrashBoundary';
import { installChunkReload } from './lib/monitoring/chunkReload';
import { initMonitoring, rootErrorHandlers } from './lib/monitoring/sentry';
import './fonts.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-ext-500.css';
import '@fontsource/ibm-plex-mono/latin-ext-600.css';
import './index.css';

// Spec 0025: error monitoring starts before React (off with no VITE_SENTRY_DSN), and a lazy file
// that vanished after a deploy reloads the page once (AC-8)
initMonitoring();
installChunkReload();

// A data router so pages can use useBlocker (spec 0005, AC-22). One splat route
// renders App, which keeps every route in its own <Routes>.
// Spec 0003, AC-20: the session boots once per page load, before React needs the token
void boot();

// The boundary sits inside the route: a data router catches render errors below it and shows its own
// default error page, so a boundary only around the router never sees a crash in App (spec 0028, AC-6)
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <CrashBoundary variant="full">
        <App />
      </CrashBoundary>
    ),
  },
]);

// Spec 0025, AC-7: a crash outside the shell (or in it) shows the full page crash screen
ReactDOM.createRoot(document.getElementById('root')!, rootErrorHandlers).render(
  <React.StrictMode>
    <CrashBoundary variant="full">
      <RouterProvider router={router} />
    </CrashBoundary>
  </React.StrictMode>,
);
