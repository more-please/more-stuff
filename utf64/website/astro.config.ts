import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import solid from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  srcDir: ".",
  outDir: "./build",
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough"
  }),
  integrations: [solid()]
});
