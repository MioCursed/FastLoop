import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@fastloop/shared": fileURLToPath(new URL("../shared/dist/index.js", import.meta.url)),
      "@fastloop/shared/": fileURLToPath(new URL("../shared/dist/", import.meta.url))
    }
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL("..", import.meta.url))]
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
