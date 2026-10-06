// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub Actions ${{ ... }} expressions are tested as string literals.
import { describe, expect, test } from "vitest";
import { collectSecrets, packageSecrets, secretsToEnv } from "./secrets.ts";
import type { TurboGraph } from "./turboGraph.ts";
import type { PackageInfo } from "./types.ts";

function makePackage(
  name: string,
  opts: {
    workie?: PackageInfo["manifest"]["workie"];
    deps?: string[];
  } = {},
): PackageInfo {
  return {
    name,
    path: name,
    manifest: { name, workie: opts.workie },
    directDependencies: opts.deps ?? [],
    directDependents: [],
  };
}

function makeGraph(packages: PackageInfo[]): TurboGraph {
  const byName = new Map(packages.map((p) => [p.name, p] as const));
  const byPath = new Map(packages.map((p) => [p.path, p] as const));
  return { packages, byName, byPath, turboConfig: {} };
}

describe("packageSecrets", () => {
  test("returns the entries for the named task", () => {
    const p = makePackage("p", {
      workie: { secrets: { test: ["A"], push: ["B"] } },
    });
    expect(packageSecrets(p, "test")).toEqual(["A"]);
    expect(packageSecrets(p, "push")).toEqual(["B"]);
    expect(packageSecrets(p, "docker-push")).toEqual([]);
  });

  test("array form applies to every task", () => {
    const p = makePackage("p", { workie: { secrets: ["A", "B"] } });
    expect(packageSecrets(p, "test")).toEqual(["A", "B"]);
    expect(packageSecrets(p, "push")).toEqual(["A", "B"]);
  });

  test("returns an empty list when no workie section exists", () => {
    expect(packageSecrets(makePackage("p"), "test")).toEqual([]);
  });
});

describe("collectSecrets", () => {
  test("unions secrets across transitive deps and sorts the result", () => {
    const A = makePackage("A", {
      workie: { secrets: { push: ["MOREPLEASE_API_KEY", "BUNNY_ACCESS_KEY"] } },
      deps: ["B"],
    });
    const B = makePackage("B", {
      workie: { secrets: { push: ["BUNNY_ACCESS_KEY", "BOOT_STORAGE_KEY"] } },
    });
    const graph = makeGraph([A, B]);
    expect(collectSecrets(graph, A, "push")).toEqual([
      "BOOT_STORAGE_KEY",
      "BUNNY_ACCESS_KEY",
      "MOREPLEASE_API_KEY",
    ]);
  });

  test("ignores deps that don't declare secrets for the task", () => {
    const A = makePackage("A", {
      workie: { secrets: { push: ["A"] } },
      deps: ["B"],
    });
    const B = makePackage("B", {
      workie: { secrets: { test: ["B"] } },
    });
    expect(collectSecrets(makeGraph([A, B]), A, "push")).toEqual(["A"]);
  });
});

describe("secretsToEnv", () => {
  test("maps each name to the ${{ secrets.NAME }} expression", () => {
    expect(secretsToEnv(["FOO", "BAR"])).toEqual({
      FOO: "${{ secrets.FOO }}",
      BAR: "${{ secrets.BAR }}",
    });
  });

  test("returns an empty object for an empty input", () => {
    expect(secretsToEnv([])).toEqual({});
  });
});
