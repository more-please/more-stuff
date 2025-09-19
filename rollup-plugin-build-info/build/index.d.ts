export { BuildInfo } from "./build-info";

import type { Plugin } from "vite";

export default function plugin(): Pick<
  Plugin,
  "name" | "buildStart" | "resolveId" | "load"
>;
