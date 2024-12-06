import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import buildInfo from "@moreplease/rollup-plugin-build-info";

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
    build: {
      minify: false,
    },
  },
});
