import "./build-info";

import type { Plugin } from "rollup";

export type BuildInfo = {
  timestamp: Date;
  commit: string;
};

export default function plugin(): Plugin;
