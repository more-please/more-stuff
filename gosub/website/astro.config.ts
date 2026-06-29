import cloudflare from "@astrojs/cloudflare";
import solid from "@astrojs/solid-js";
import buildInfo from "@moreplease/rollup-plugin-build-info";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://gosub.moreplease.com",
  srcDir: ".",
  outDir: "./build",
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  build: {
    assets: "assets",
  },
  integrations: [solid()],
  vite: {
    plugins: [buildInfo()],
    build: {
      sourcemap: true,
    },
  },
});
