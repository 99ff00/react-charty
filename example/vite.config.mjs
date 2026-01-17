import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  base: "/react-charty/",
  resolve: {
    alias: {
      "react-charty": path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../dist/index.es.js"
      ),
    },
  },
  optimizeDeps: {
    entries: ["index.html"],
  },
});
