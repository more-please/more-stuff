import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackageInfo, PackageManifest } from "./types.ts";

/** The subset of `turbo.json` that `workie` cares about. */
export type TurboConfig = {
  tasks?: Record<string, TurboTaskConfig>;
};

export type TurboTaskConfig = {
  dependsOn?: string[];
};

/** Query turbo for the package graph and read each package's `package.json`. */
export type TurboGraph = {
  packages: PackageInfo[];
  byName: Map<string, PackageInfo>;
  byPath: Map<string, PackageInfo>;
  turboConfig: TurboConfig;
};

type RawPackage = {
  name: string;
  path: string;
  directDependencies: { items: { name: string }[] };
  directDependents: { items: { name: string }[] };
};

const QUERY =
  "query { packages { items { name path" +
  " directDependencies { items { name } }" +
  " directDependents { items { name } }" +
  " } } }";

/** Run `turbo query` in the given working directory and parse the result. */
export function loadTurboGraph(cwd: string): TurboGraph {
  const raw = execFileSync("pnpm", ["exec", "turbo", "query", QUERY], {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  const parsed = JSON.parse(raw) as {
    data: { packages: { items: RawPackage[] } };
  };
  const rawPackages = parsed.data.packages.items;

  const packages: PackageInfo[] = [];
  for (const raw of rawPackages) {
    // Skip the root `//` pseudo-package; it has no path of its own.
    if (raw.name === "//" || raw.path === "") {
      continue;
    }
    const manifestPath = join(cwd, raw.path, "package.json");
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf-8"),
    ) as PackageManifest;
    packages.push({
      name: raw.name,
      path: raw.path,
      manifest,
      directDependencies: raw.directDependencies.items
        .map((d) => d.name)
        .filter((n) => n !== "//"),
      directDependents: raw.directDependents.items
        .map((d) => d.name)
        .filter((n) => n !== "//"),
    });
  }

  const byName = new Map<string, PackageInfo>();
  const byPath = new Map<string, PackageInfo>();
  for (const pkg of packages) {
    byName.set(pkg.name, pkg);
    byPath.set(pkg.path, pkg);
  }

  const turboConfig = loadTurboConfig(cwd);

  return { packages, byName, byPath, turboConfig };
}

function loadTurboConfig(cwd: string): TurboConfig {
  const path = join(cwd, "turbo.json");
  const text = readFileSync(path, "utf-8");
  return JSON.parse(text) as TurboConfig;
}

/**
 * Return the set of package names reachable from `start` via
 * `directDependencies` (including `start` itself).
 */
export function transitiveDependencies(
  graph: TurboGraph,
  start: string,
): Set<string> {
  const visited = new Set<string>();
  function walk(name: string) {
    if (visited.has(name)) {
      return;
    }
    visited.add(name);
    const pkg = graph.byName.get(name);
    if (!pkg) {
      return;
    }
    for (const dep of pkg.directDependencies) {
      walk(dep);
    }
  }
  walk(start);
  return visited;
}
