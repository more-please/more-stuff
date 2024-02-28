import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  srcDir: ".",
  outDir: "./build",
  output: "server",
  adapter: cloudflare({ imageService: "passthrough"}),
});
