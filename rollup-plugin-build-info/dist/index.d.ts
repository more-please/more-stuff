import "./build-info";

import type { Plugin } from "rollup";

export type BuildInfo = {
  timestamp: Date;
  branch: string;
  commit: {
    hash: string;
    author: {
      name: string;
      email: string;
      timestamp: Date;
    };
  };
};

export default function plugin(): Plugin;
