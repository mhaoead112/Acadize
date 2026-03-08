import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./lib/config"; // Initialize tenant config & global fetch interceptor early
import "./i18n/config"; // i18n: init and RTL
import App from "./App";
import "./index.css";
import { BrandingProvider } from "./contexts/BrandingContext";
import { logger } from "./lib/logger";
import { StatePanel } from "./components/ui/state-panel";

// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        logger.info('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        logger.error('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <BrandingProvider>
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4"><StatePanel variant="loading" title="Loading app" description="Initializing workspace..." className="w-full max-w-sm" /></div>}>
      <App />
    </Suspense>
  </BrandingProvider>
);
