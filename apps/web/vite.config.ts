import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// scripts/dev.sh exports WEB_HOST/WEB_PORT from the worktree port allocator.
export default defineConfig({
  plugins: [svelte()],
  base: "./",
  server: {
    host: process.env.WEB_HOST ?? "127.0.0.1",
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: Boolean(process.env.WEB_PORT),
  },
});
