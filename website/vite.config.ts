import { defineConfig } from "vite";
import solid from "solid-start/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths({ root: ".." }), solid()],
});
