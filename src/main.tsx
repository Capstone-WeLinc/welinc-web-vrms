import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import '@fontsource-variable/inter';
import './index.css';

// A data router so pages can use useBlocker (spec 0005, AC-22). One splat route
// renders App, which keeps every route in its own <Routes>.
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
