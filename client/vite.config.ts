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
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ["date-fns"],
  },

  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: true, // Allow connections from any hostname (for lvh.me subdomains)
    allowedHosts: true, // Allow all hosts including *.lvh.me
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
