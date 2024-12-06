import { RollupOptions } from "rollup";
import typescript from "@rollup/plugin-typescript";

const config: RollupOptions = {
  input: "rollup-plugin-build-info.ts",
  plugins: [typescript()],
  external: ["node:child_process"],
  output: {
    file: "dist/index.js",
    format: "esm",
  },
};

export default config;
