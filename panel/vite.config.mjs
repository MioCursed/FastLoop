import { fileURLToPath, URL } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { defineConfig } from "vite";

function cepHtmlPostBuild() {
  return {
    name: "fastloop-cep-html-post-build",
    apply: "build",
    async closeBundle() {
      const indexPath = fileURLToPath(new URL("./dist/index.html", import.meta.url));
      const html = await readFile(indexPath, "utf8");
      if (html.includes('src="./CSInterface.js"')) {
        return;
      }
      await writeFile(
        indexPath,
        html.replace(
          /(<title>FastLoop<\/title>)/,
          '$1\n    <script src="./CSInterface.js"></script>'
        ),
        "utf8"
      );
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [cepHtmlPostBuild()],
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
