import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  outDir: "./dist",
  integrations: [mdx()],
  server: {
    host: "127.0.0.1",
    port: 4321,
  },
  preview: {
    host: "127.0.0.1",
    port: 4322,
  },
  vite: {
    server: {
      strictPort: true,
    },
    preview: {
      strictPort: true,
    },
  },
});
