import { type TurboGraph, transitiveDependencies } from "./turboGraph.ts";
import type { PackageInfo } from "./types.ts";

/**
 * Return the GitHub Actions secret names declared in `package.json`'s
 * `workie.secrets` field that apply to `task`. Supports both the flat
 * string-array form (applies to every task) and the object form (keyed
 * by task name).
 */
export function packageSecrets(pkg: PackageInfo, task: string): string[] {
  const secrets = pkg.manifest.workie?.secrets;
  if (!secrets) {
    return [];
  }
  if (Array.isArray(secrets)) {
    return secrets;
  }
  return secrets[task] ?? [];
}

/**
 * Collect every secret declared for `task` on the given package and all
 * of its transitive dependencies. Returned names are deduplicated and
 * sorted so the generated `env` blocks are deterministic.
 */
export function collectSecrets(
  graph: TurboGraph,
  pkg: PackageInfo,
  task: string,
): string[] {
  const seen = new Set<string>();
  for (const name of transitiveDependencies(graph, pkg.name)) {
    const dep = graph.byName.get(name);
    if (!dep) {
      continue;
    }
    for (const secret of packageSecrets(dep, task)) {
      seen.add(secret);
    }
  }
  return [...seen].sort();
}

/**
 * Build a `${{ secrets.NAME }}` map suitable for plugging straight into a
 * GitHub Actions `env:` block.
 */
export function secretsToEnv(secrets: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const name of secrets) {
    env[name] = `\${{ secrets.${name} }}`;
  }
  return env;
}
