import cloudflare from "@astrojs/cloudflare";
import buildInfo from "@moreplease/rollup-plugin-build-info";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://utf64.moreplease.com",
  srcDir: ".",
  outDir: "./build",
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  build: {
    assets: "assets",
  },
  vite: {
    plugins: [buildInfo()],
    // @astrojs/cloudflare >=14.2.0 routes `imageService: "passthrough"` through
    // the generic image endpoint in dev, so the noop image service is only
    // discovered once the dev server is already running. The re-optimization
    // that triggers invalidates modules the workerd runner has already loaded.
    // Pre-declaring it keeps the SSR deps stable across the dev server's life.
    ssr: {
      optimizeDeps: {
        include: ["astro/assets/services/noop"],
      },
    },
    build: {
      minify: false,
    },
  },
});
