import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "recharts",
      "d3-shape",
      "d3-scale",
      "d3-color",
      "quill",
      "react-quill",
    ],
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // ────────────────────────────────────────────────────────────────
        // MANUAL CHUNKS — Only isolate libraries with ZERO React dependency.
        //
        // Any library that internally imports React (createContext, Component,
        // hooks, JSX runtime) MUST NOT be in its own manualChunk, because
        // Rollup cannot guarantee vendor-react-core executes first.
        // Symptoms: "Cannot read properties of undefined (reading 'Component')"
        //           "Cannot access 'X' before initialization" (TDZ)
        //
        // SAFE to isolate  → pure libs with no React import chain
        // UNSAFE to isolate → recharts, d3, quill, react-quill, monaco,
        //   framer-motion, react-query, radix-ui, react-i18next, lucide-react
        // ────────────────────────────────────────────────────────────────
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          // ✅ SAFE: TensorFlow / face-api — zero React dependency
          if (id.includes("face-api.js") || id.includes("@tensorflow")) {
            return "vendor-face-proctoring";
          }

          // ✅ SAFE: QR scanning — pure WASM / canvas library
          if (id.includes("html5-qrcode") || id.includes("@zxing")) {
            return "vendor-qr-scanner";
          }

          // ✅ SAFE: KaTeX math rendering — pure library
          if (id.includes("katex") || id.includes("remark-math") || id.includes("rehype-katex")) {
            return "vendor-math";
          }

          // Everything else (React, React-DOM, i18next, recharts, d3, quill,
          // monaco, framer-motion, radix, lucide, tanstack, etc.) is left
          // for Rollup to resolve naturally — it will produce correct chunk
          // execution order automatically.
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
