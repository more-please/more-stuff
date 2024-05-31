import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  vite: {
    build: {
      sourcemap: true,
    },
  },
  server: {
    preset: "cloudflare-pages",
    output: {
      dir: "build"
    },
    esbuild: {
      options: {
        target: "esnext"
      }
    }
  },
});
