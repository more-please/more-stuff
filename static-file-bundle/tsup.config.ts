import { defineConfig } from "tsup";

// Tip from https://stackoverflow.com/a/77753164
const banner = `
import * as fs from "node:fs";
import * as path from "node:path";
const require = (m) => ({ fs, path }[m]);
`;

export default defineConfig({
  entry: ["static-file-bundle.ts"],
  external: ["node:fs", "node:path"],
  format: ["esm"],
  esbuildOptions(options) {
    options.banner = {
      js: banner,
    };
  },
  dts: true,
  target: "node18",
  minify: false,
  clean: true,
  outDir: "build",
});
