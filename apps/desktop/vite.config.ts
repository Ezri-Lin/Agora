import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist/renderer"),
  },
  resolve: {
    alias: {
      "@agora/shared": resolve(__dirname, "../../packages/shared/src"),
      "@agora/kernel": resolve(__dirname, "../../packages/kernel/src"),
      "@agora/room-store": resolve(__dirname, "../../packages/room-store/src"),
      "@agora/memory": resolve(__dirname, "../../packages/memory/src"),
      "@agora/roles": resolve(__dirname, "../../packages/roles/src"),
      "@agora/vault-adapter": resolve(__dirname, "../../packages/adapters/vault/src"),
      "@agora/ui": resolve(__dirname, "../../packages/ui/src"),
    },
  },
});
