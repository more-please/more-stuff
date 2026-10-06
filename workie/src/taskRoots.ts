import type { TurboConfig, TurboGraph } from "./turboGraph.ts";
import type { PackageInfo } from "./types.ts";

/**
 * Figure out whether running task `T` in a parent package transitively causes
 * task `T` to run in the parent's dependencies.
 *
 * A task `X`'s `dependsOn` may contain `^Y` entries (which mean "run Y in my
 * deps first") or plain `Y` entries (which mean "run Y in the same package
 * first"). Task `T` propagates across dependency edges if its `dependsOn`
 * chain — following plain entries within the same package — eventually lands
 * on `^T`.
 */
export function taskPropagates(turbo: TurboConfig, task: string): boolean {
  return tasksRunOnDependencies(turbo, task).has(task);
}

/**
 * Return the set of tasks that will run in a dependency package when `task`
 * is run in a parent package, according to `turbo.json`.
 */
export function tasksRunOnDependencies(
  turbo: TurboConfig,
  task: string,
): Set<string> {
  const visited = new Set<string>();
  const result = new Set<string>();
  function walk(t: string) {
    if (visited.has(t)) {
      return;
    }
    visited.add(t);
    const config = turbo.tasks?.[t];
    if (!config?.dependsOn) {
      return;
    }
    for (const dep of config.dependsOn) {
      if (dep.startsWith("^")) {
        result.add(dep.slice(1));
      } else if (!dep.includes("#")) {
        walk(dep);
      }
    }
  }
  walk(task);
  return result;
}

/**
 * Return the set of tasks that run in the *same* package when `task` runs
 * there. These are the tasks reachable by chaining through `dependsOn`
 * entries that aren't `^`-prefixed (and aren't the cross-package `//#foo`
 * syntax). `task` itself is always in the set.
 */
export function samePackageTaskGraph(
  turbo: TurboConfig,
  task: string,
): Set<string> {
  const chain = new Set<string>();
  function walk(t: string) {
    if (chain.has(t)) {
      return;
    }
    chain.add(t);
    const config = turbo.tasks?.[t];
    if (!config?.dependsOn) {
      return;
    }
    for (const dep of config.dependsOn) {
      if (dep.startsWith("^") || dep.includes("#")) {
        continue;
      }
      walk(dep);
    }
  }
  walk(task);
  return chain;
}

/**
 * Given a package's scripts and the set of tasks that could run in that
 * package for some top-level task, return only the tasks that actually have
 * a script defined. These are the tasks that would execute when the
 * workflow invokes turbo.
 */
export function runnableTasks(
  pkg: PackageInfo,
  taskGraph: Set<string>,
): Set<string> {
  const scripts = pkg.manifest.scripts ?? {};
  const result = new Set<string>();
  for (const t of taskGraph) {
    if (scripts[t] !== undefined) {
      result.add(t);
    }
  }
  return result;
}

/** Options for {@link taskRoots}. */
export type TaskRootsOptions = {
  /**
   * Other tasks declared in the same config. Used to decide whether a
   * workflow is redundant ("already covered by a finer-grained workflow").
   * Defaults to `[]` (no coverage check).
   */
  otherTasks?: string[];
  /**
   * Override the default propagation detection (which reads `turbo.json`).
   */
  propagates?: boolean;
};

/**
 * Return the packages that need their own workflow for `task`.
 *
 * A package `P` qualifies when:
 *
 * 1. Running `turbo <task> --filter=P` would actually execute at least one
 *    script in `P` -- that is, `P` has a script matching some task in
 *    `<task>`'s same-package task graph (see {@link samePackageTaskGraph}).
 * 2. The resulting work isn't already covered by another workflow in the
 *    same config. Specifically, `T` is skipped if some other task `T'`
 *    runs at least as much work as `T` in `P`, unless `T` is strictly
 *    finer-grained than `T'` (its task graph is a strict subset).
 *    The "strictly finer" carve-out means `test` survives when `push` does
 *    everything `test` does and more, because `test` has its own PR trigger.
 * 3. For tasks that propagate (`^T` in the chain), no ancestor package
 *    that also qualifies by (1) and (2) -- running the ancestor's workflow
 *    already covers `P` via propagation.
 *
 * Packages are sorted by path for deterministic output.
 */
export function taskRoots(
  graph: TurboGraph,
  task: string,
  options: TaskRootsOptions = {},
): PackageInfo[] {
  const turbo = graph.turboConfig;
  const propagates = options.propagates ?? taskPropagates(turbo, task);
  const otherTasks = (options.otherTasks ?? []).filter((t) => t !== task);

  const taskGraph = samePackageTaskGraph(turbo, task);
  const otherGraphs = new Map<string, Set<string>>();
  for (const other of otherTasks) {
    otherGraphs.set(other, samePackageTaskGraph(turbo, other));
  }

  const candidates: PackageInfo[] = [];
  for (const pkg of graph.packages) {
    const thisRun = runnableTasks(pkg, taskGraph);
    if (thisRun.size === 0) {
      continue;
    }
    let covered = false;
    for (const [, otherGraph] of otherGraphs) {
      // The other task keeps us from needing our own workflow if it runs
      // at least everything we would run AND we aren't strictly finer.
      if (isStrictSubset(taskGraph, otherGraph)) {
        continue;
      }
      const otherRun = runnableTasks(pkg, otherGraph);
      if (isSubsetOrEqual(thisRun, otherRun)) {
        covered = true;
        break;
      }
    }
    if (!covered) {
      candidates.push(pkg);
    }
  }

  if (!propagates) {
    return sortPackages(candidates);
  }

  // Task propagates through package deps: if an ancestor is also a
  // candidate, running its workflow will run `task` in us too.
  const candidateNames = new Set(candidates.map((p) => p.name));
  const roots = candidates.filter(
    (p) => !hasAncestorIn(graph, p.name, candidateNames),
  );
  return sortPackages(roots);
}

function hasAncestorIn(
  graph: TurboGraph,
  name: string,
  set: Set<string>,
): boolean {
  const visited = new Set<string>();
  function walk(n: string): boolean {
    if (visited.has(n)) {
      return false;
    }
    visited.add(n);
    const pkg = graph.byName.get(n);
    if (!pkg) {
      return false;
    }
    for (const parent of pkg.directDependents) {
      if (parent === name) {
        continue;
      }
      if (set.has(parent)) {
        return true;
      }
      if (walk(parent)) {
        return true;
      }
    }
    return false;
  }
  return walk(name);
}

function isStrictSubset<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size >= b.size) {
    return false;
  }
  for (const x of a) {
    if (!b.has(x)) {
      return false;
    }
  }
  return true;
}

function isSubsetOrEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size > b.size) {
    return false;
  }
  for (const x of a) {
    if (!b.has(x)) {
      return false;
    }
  }
  return true;
}

function sortPackages(packages: PackageInfo[]): PackageInfo[] {
  return [...packages].sort((a, b) => a.path.localeCompare(b.path));
}
