import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./lib/config"; // Initialize tenant config & global fetch interceptor early
import "./i18n/config"; // i18n: init and RTL
import App from "./App";
import "./index.css";

// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
    <App />
  </Suspense>
);
