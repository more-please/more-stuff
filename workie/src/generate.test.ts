// biome-ignore-all lint/suspicious/noTemplateCurlyInString: GitHub Actions ${{ ... }} expressions are tested as string literals.
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { generate, workflowFilename } from "./generate.ts";
import type { TurboConfig, TurboGraph } from "./turboGraph.ts";
import type { PackageInfo } from "./types.ts";

function makePackage(
  name: string,
  path: string,
  scripts: Record<string, string> = {},
  deps: string[] = [],
): PackageInfo {
  return {
    name,
    path,
    manifest: { name, scripts },
    directDependencies: deps,
    directDependents: [],
  };
}

function makeGraph(
  packages: PackageInfo[],
  turboConfig: TurboConfig = {},
): TurboGraph {
  // Fill in reverse deps.
  for (const p of packages) {
    p.directDependents = packages
      .filter((q) => q.directDependencies.includes(p.name))
      .map((q) => q.name);
  }
  const byName = new Map(packages.map((p) => [p.name, p] as const));
  const byPath = new Map(packages.map((p) => [p.path, p] as const));
  return { packages, byName, byPath, turboConfig };
}

function tempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "workie-test-"));
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  return dir;
}

describe("generate", () => {
  test("writes a workflow for each root package", async () => {
    const cwd = tempRepo();
    const graph = makeGraph(
      [
        makePackage("A", "a", { test: "t" }, ["B"]),
        makePackage("B", "b", { test: "t" }),
      ],
      { tasks: { test: { dependsOn: ["^test"] } } },
    );
    const result = await generate(
      {
        tasks: {
          test: ({ pkg, paths }) => ({
            name: `test ${pkg.name}`,
            on: { push: { branches: ["main"] } },
            jobs: {
              test: {
                "runs-on": "ubuntu-latest",
                steps: [{ run: `echo ${paths.join(",")}` }],
              },
            },
          }),
        },
      },
      { cwd, graph, log: false },
    );
    expect(result.written).toEqual(["workie-a-test.yml"]);
    const body = readFileSync(
      join(cwd, ".github/workflows/workie-a-test.yml"),
      "utf-8",
    );
    expect(body).toContain("name: test A");
    // Paths include A's own path plus its dependency B's, each wildcarded.
    expect(body).toContain("echo a/**,b/**");
  });

  test("passes an env of collected secrets into the template", async () => {
    const cwd = tempRepo();
    const A: PackageInfo = {
      name: "A",
      path: "a",
      manifest: {
        name: "A",
        scripts: { test: "t" },
        workie: { secrets: { test: ["FOO"] } },
      },
      directDependencies: ["B"],
      directDependents: [],
    };
    const B: PackageInfo = {
      name: "B",
      path: "b",
      manifest: {
        name: "B",
        scripts: { test: "t" },
        workie: { secrets: ["BAR"] },
      },
      directDependencies: [],
      directDependents: ["A"],
    };
    const graph = makeGraph([A, B], {
      tasks: { test: { dependsOn: ["^test"] } },
    });
    await generate(
      {
        tasks: {
          test: ({ env }) => ({
            on: "push",
            jobs: {
              t: {
                "runs-on": "ubuntu-latest",
                steps: [{ run: "echo", env }],
              },
            },
          }),
        },
      },
      { cwd, graph, log: false },
    );
    const body = readFileSync(
      join(cwd, ".github/workflows/workie-a-test.yml"),
      "utf-8",
    );
    expect(body).toContain("BAR: ${{ secrets.BAR }}");
    expect(body).toContain("FOO: ${{ secrets.FOO }}");
  });

  test("removes stale workflows with the prefix", async () => {
    const cwd = tempRepo();
    writeFileSync(
      join(cwd, ".github/workflows/workie-stale-test.yml"),
      "old\n",
    );
    writeFileSync(
      join(cwd, ".github/workflows/keep-me.yml"),
      "name: keep-me\non: push\njobs: {}\n",
    );
    const graph = makeGraph([makePackage("A", "a", { test: "t" })], {
      tasks: { test: { dependsOn: ["^test"] } },
    });
    const result = await generate(
      {
        tasks: {
          test: ({ pkg }) => ({
            name: pkg.name,
            on: "push",
            jobs: {
              t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] },
            },
          }),
        },
      },
      { cwd, graph, log: false },
    );
    expect(result.removed).toEqual(["workie-stale-test.yml"]);
    // The unrelated file is left alone.
    expect(readdirSync(join(cwd, ".github/workflows")).sort()).toEqual([
      "keep-me.yml",
      "workie-a-test.yml",
    ]);
  });

  test("leaves files unchanged when content matches", async () => {
    const cwd = tempRepo();
    const graph = makeGraph([makePackage("A", "a", { test: "t" })], {
      tasks: { test: { dependsOn: ["^test"] } },
    });
    const config = {
      tasks: {
        test: () => ({
          on: "push" as const,
          jobs: {
            t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] },
          },
        }),
      },
    };
    const first = await generate(config, { cwd, graph, log: false });
    expect(first.written).toEqual(["workie-a-test.yml"]);
    const second = await generate(config, { cwd, graph, log: false });
    expect(second.written).toEqual([]);
    expect(second.unchanged).toEqual(["workie-a-test.yml"]);
  });

  test("throws when the workflows dir is missing", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "workie-nodir-"));
    const graph = makeGraph([]);
    await expect(
      generate({ tasks: {} }, { cwd, graph, log: false }),
    ).rejects.toThrow(/workflows directory not found/);
  });

  test("throws when a template produces an invalid workflow", async () => {
    const cwd = tempRepo();
    const graph = makeGraph([makePackage("A", "a", { test: "t" })], {
      tasks: { test: { dependsOn: ["^test"] } },
    });
    await expect(
      generate(
        {
          tasks: {
            test: () =>
              ({
                // Missing `on` -- invalid.
                jobs: {
                  t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] },
                },
              }) as never,
          },
        },
        { cwd, graph, log: false },
      ),
    ).rejects.toThrow(/invalid workflow/);
  });

  test("allows templates to return null to skip", async () => {
    const cwd = tempRepo();
    const graph = makeGraph(
      [
        makePackage("A", "a", { test: "t" }),
        makePackage("B", "b", { test: "t" }),
      ],
      { tasks: { test: { dependsOn: ["^test"] } } },
    );
    const result = await generate(
      {
        tasks: {
          test: ({ pkg }) =>
            pkg.name === "A"
              ? null
              : {
                  on: "push",
                  jobs: {
                    t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] },
                  },
                },
        },
      },
      { cwd, graph, log: false },
    );
    expect(result.written).toEqual(["workie-b-test.yml"]);
  });
});

describe("workflowFilename", () => {
  test("slugs slashes in the package path", () => {
    const pkg = makePackage("x", "tools/foo");
    expect(workflowFilename("test", pkg)).toBe("workie-tools-foo-test.yml");
  });
});
