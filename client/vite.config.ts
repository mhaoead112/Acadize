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
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("face-api.js") || id.includes("@tensorflow")) {
            return "vendor-face-proctoring";
          }
          if (id.includes("html5-qrcode") || id.includes("@zxing")) {
            return "vendor-qr-scanner";
          }
          if (id.includes("katex") || id.includes("remark-math") || id.includes("rehype-katex")) {
            return "vendor-math";
          }
          // ⚠️ quill + react-quill removed from manualChunks:
          // react-quill accesses React.Component on init; when isolated in its
          // own chunk it executes before vendor-react-core, causing
          // "Cannot read properties of undefined (reading 'Component')".
          if (id.includes("@monaco-editor") || id.includes("monaco-editor")) {
            return "vendor-editor-code";
          }
          // ⚠️ recharts + d3 removed from manualChunks:
          // D3 has internal circular ES module refs that cause TDZ errors
          // ("Cannot access 'X' before initialization") when Rollup splits
          // them into an isolated chunk. Let Rollup resolve them naturally.
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("@tanstack/react-query")) {
            return "vendor-query";
          }
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("/wouter/")
          ) {
            return "vendor-react-core";
          }
          if (id.includes("@radix-ui/")) {
            return "vendor-ui-radix";
          }
          if (id.includes("i18next") || id.includes("react-i18next")) {
            return "vendor-i18n";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }

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
