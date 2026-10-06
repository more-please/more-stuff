import { describe, expect, test } from "vitest";
import {
  runnableTasks,
  samePackageTaskGraph,
  taskPropagates,
  taskRoots,
  tasksRunOnDependencies,
} from "./taskRoots.ts";
import type { TurboConfig, TurboGraph } from "./turboGraph.ts";
import type { PackageInfo } from "./types.ts";

function makePackage(
  name: string,
  path: string,
  {
    scripts = {},
    deps = [],
    parents = [],
  }: {
    scripts?: Record<string, string>;
    deps?: string[];
    parents?: string[];
  } = {},
): PackageInfo {
  return {
    name,
    path,
    manifest: { name, scripts },
    directDependencies: deps,
    directDependents: parents,
  };
}

function graph(packages: PackageInfo[], turbo: TurboConfig = {}): TurboGraph {
  const byName = new Map<string, PackageInfo>();
  const byPath = new Map<string, PackageInfo>();
  for (const p of packages) {
    byName.set(p.name, p);
    byPath.set(p.path, p);
  }
  return { packages, byName, byPath, turboConfig: turbo };
}

describe("tasksRunOnDependencies", () => {
  test("returns the direct ^-prefixed deps", () => {
    const turbo: TurboConfig = {
      tasks: { test: { dependsOn: ["^test", "build"] } },
    };
    expect([...tasksRunOnDependencies(turbo, "test")]).toEqual(["test"]);
  });

  test("follows same-package deps to reach ^-prefixed deps", () => {
    const turbo: TurboConfig = {
      tasks: {
        push: { dependsOn: ["push-edge"] },
        "push-edge": { dependsOn: ["^push-edge", "build"] },
      },
    };
    expect([...tasksRunOnDependencies(turbo, "push")]).toEqual(["push-edge"]);
  });

  test("handles undefined task", () => {
    expect([...tasksRunOnDependencies({}, "test")]).toEqual([]);
  });

  test("does not infinite-loop on cycles", () => {
    const turbo: TurboConfig = {
      tasks: {
        a: { dependsOn: ["b"] },
        b: { dependsOn: ["a", "^x"] },
      },
    };
    expect([...tasksRunOnDependencies(turbo, "a")]).toEqual(["x"]);
  });
});

describe("taskPropagates", () => {
  test("true for tasks with ^T directly", () => {
    const turbo: TurboConfig = { tasks: { test: { dependsOn: ["^test"] } } };
    expect(taskPropagates(turbo, "test")).toBe(true);
  });

  test("false for tasks without ^T in the chain", () => {
    const turbo: TurboConfig = {
      tasks: {
        push: { dependsOn: ["push-edge"] },
        "push-edge": { dependsOn: ["^push-edge"] },
      },
    };
    // `push` doesn't propagate `push` (only `push-edge`).
    expect(taskPropagates(turbo, "push")).toBe(false);
    expect(taskPropagates(turbo, "push-edge")).toBe(true);
  });
});

describe("samePackageTaskGraph", () => {
  test("includes the task itself plus non-^ deps transitively", () => {
    const turbo: TurboConfig = {
      tasks: {
        test: { dependsOn: ["^test", "build", "check"] },
        build: { dependsOn: ["^build", "codegen"] },
        check: { dependsOn: [] },
        codegen: { dependsOn: [] },
      },
    };
    expect([...samePackageTaskGraph(turbo, "test")].sort()).toEqual([
      "build",
      "check",
      "codegen",
      "test",
    ]);
  });

  test("ignores cross-package `//#task` syntax", () => {
    const turbo: TurboConfig = {
      tasks: {
        codegen: { dependsOn: ["//#codegen", "^codegen"] },
      },
    };
    expect([...samePackageTaskGraph(turbo, "codegen")]).toEqual(["codegen"]);
  });
});

describe("runnableTasks", () => {
  test("returns the subset of the graph matching defined scripts", () => {
    const p = makePackage("p", "p", { scripts: { build: "b", check: "c" } });
    const result = runnableTasks(p, new Set(["build", "check", "test"]));
    expect([...result].sort()).toEqual(["build", "check"]);
  });
});

describe("taskRoots", () => {
  const propagatingTest: TurboConfig = {
    tasks: { test: { dependsOn: ["^test"] } },
  };

  test("skips packages whose ancestors have the propagating task", () => {
    const A = makePackage("A", "a", { scripts: { test: "t" }, deps: ["B"] });
    const B = makePackage("B", "b", {
      scripts: { test: "t" },
      deps: ["C"],
      parents: ["A"],
    });
    const C = makePackage("C", "c", { scripts: { test: "t" }, parents: ["B"] });
    const g = graph([A, B, C], propagatingTest);
    expect(taskRoots(g, "test").map((p) => p.name)).toEqual(["A"]);
  });

  test("keeps every package with the task if it does not propagate", () => {
    const A = makePackage("A", "a", { scripts: { push: "p" }, deps: ["B"] });
    const B = makePackage("B", "b", { scripts: { push: "p" }, parents: ["A"] });
    const g = graph([A, B], { tasks: { push: { dependsOn: [] } } });
    expect(taskRoots(g, "push").map((p) => p.name)).toEqual(["A", "B"]);
  });

  test("omits packages whose scripts do not intersect the task graph", () => {
    const A = makePackage("A", "a", { scripts: { test: "t" } });
    const B = makePackage("B", "b", { scripts: { unrelated: "x" } });
    const g = graph([A, B], propagatingTest);
    expect(taskRoots(g, "test").map((p) => p.name)).toEqual(["A"]);
  });

  test("includes a package that has a script matching a dep of the task", () => {
    // test's same-package graph = {test, build}. A has only `build`, not
    // `test`, but running `turbo test --filter=A` still builds A.
    const turbo: TurboConfig = {
      tasks: {
        test: { dependsOn: ["^test", "build"] },
        build: { dependsOn: [] },
      },
    };
    const A = makePackage("A", "a", { scripts: { build: "b" } });
    const g = graph([A], turbo);
    expect(taskRoots(g, "test").map((p) => p.name)).toEqual(["A"]);
  });

  test("skips a coarser workflow when a finer-grained sibling covers it", () => {
    // test's chain = {test}. push's chain = {push, test}. P has only `test`
    // so both runnable sets are {test}; push workflow is redundant.
    const turbo: TurboConfig = {
      tasks: {
        test: { dependsOn: ["^test"] },
        push: { dependsOn: ["test"] },
      },
    };
    const A = makePackage("A", "a", { scripts: { test: "t" } });
    const g = graph([A], turbo);
    expect(
      taskRoots(g, "push", { otherTasks: ["test"] }).map((p) => p.name),
    ).toEqual([]);
    expect(
      taskRoots(g, "test", { otherTasks: ["push"] }).map((p) => p.name),
    ).toEqual(["A"]);
  });

  test("keeps a coarser workflow when it triggers extra work beyond the finer one", () => {
    const turbo: TurboConfig = {
      tasks: {
        test: { dependsOn: ["^test"] },
        push: { dependsOn: ["push-edge", "test"] },
        "push-edge": { dependsOn: [] },
      },
    };
    // A has test AND push-edge; push's runnable set = {test, push-edge}
    // differs from test's runnable set = {test}, so push stays.
    const A = makePackage("A", "a", {
      scripts: { test: "t", "push-edge": "e" },
    });
    const g = graph([A], turbo);
    expect(
      taskRoots(g, "push", { otherTasks: ["test"] }).map((p) => p.name),
    ).toEqual(["A"]);
  });

  test("skips a peer workflow whose work is a subset of another peer", () => {
    // docker-push and push have incomparable task graphs, but for a
    // package whose only push-family scripts are shared (`sync`), push's
    // runnable set is a strict superset of docker-push's, so docker-push
    // adds no value.
    const turbo: TurboConfig = {
      tasks: {
        test: { dependsOn: ["^test"] },
        push: { dependsOn: ["push-edge", "sync"] },
        "push-edge": { dependsOn: [] },
        "docker-push": { dependsOn: ["docker-sync"] },
        "docker-sync": { dependsOn: ["sync"] },
        sync: { dependsOn: [] },
      },
    };
    // Package has push + sync only -- docker-push would only run sync,
    // which push also runs (plus push-edge, plus push itself).
    const A = makePackage("A", "a", {
      scripts: { sync: "s", "push-edge": "e" },
    });
    const g = graph([A], turbo);
    expect(
      taskRoots(g, "docker-push", {
        otherTasks: ["test", "push"],
      }).map((p) => p.name),
    ).toEqual([]);
    expect(
      taskRoots(g, "push", {
        otherTasks: ["test", "docker-push"],
      }).map((p) => p.name),
    ).toEqual(["A"]);
  });

  test("keeps the finer task even when a coarser peer does the same work", () => {
    // For a package with only `test`, push/docker-push would both cover
    // its work -- but test is strictly finer than push, so test stays.
    const turbo: TurboConfig = {
      tasks: {
        test: { dependsOn: ["^test"] },
        push: { dependsOn: ["test"] },
      },
    };
    const A = makePackage("A", "a", { scripts: { test: "t" } });
    const g = graph([A], turbo);
    expect(
      taskRoots(g, "test", { otherTasks: ["push"] }).map((p) => p.name),
    ).toEqual(["A"]);
  });

  test("respects an explicit propagates override", () => {
    // `push` has no ^push in turbo.json, but caller opts into propagation.
    const A = makePackage("A", "a", { scripts: { push: "p" }, deps: ["B"] });
    const B = makePackage("B", "b", { scripts: { push: "p" }, parents: ["A"] });
    const g = graph([A, B], { tasks: { push: { dependsOn: [] } } });
    expect(
      taskRoots(g, "push", { propagates: true }).map((p) => p.name),
    ).toEqual(["A"]);
  });

  test("sorts the result by package path", () => {
    const A = makePackage("A", "z", { scripts: { test: "t" } });
    const B = makePackage("B", "a", { scripts: { test: "t" } });
    const g = graph([A, B], propagatingTest);
    expect(taskRoots(g, "test").map((p) => p.path)).toEqual(["a", "z"]);
  });
});
