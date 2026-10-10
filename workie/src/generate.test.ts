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

const MANUAL = { workflow_dispatch: {} };

describe("generate", () => {
  test("writes one workflow per task covering every root", async () => {
    const cwd = tempRepo();
    const graph = makeGraph(
      [
        makePackage("A", "a", { test: "t" }, ["C"]),
        makePackage("B", "b", { test: "t" }, ["C"]),
        makePackage("C", "c", { test: "t" }),
      ],
      { tasks: { test: { dependsOn: ["^test"] } } },
    );
    const result = await generate(
      {
        tasks: {
          test: ({ task, roots, paths, affected }) => ({
            name: task,
            on: { ...MANUAL, push: { branches: ["main"], paths } },
            jobs: {
              test: {
                "runs-on": "ubuntu-latest",
                steps: [
                  affected.step(),
                  {
                    if: affected.if(),
                    run: `echo ${roots.map((r) => r.pkg.name).join(",")} ${affected.filter}`,
                  },
                ],
              },
            },
          }),
        },
      },
      { cwd, graph, log: false },
    );
    expect(result.written).toEqual(["workie-test.yml"]);
    const body = readFileSync(
      join(cwd, ".github/workflows/workie-test.yml"),
      "utf-8",
    );
    expect(body).toContain("name: test");
    // C is shared by both roots, so it's covered rather than a root itself.
    expect(body).toContain("echo A,B ${{ steps.workie.outputs.filter }}");
    expect(body).toContain("      - a/**\n      - b/**\n      - c/**\n");
    expect(body).toContain("if: steps.workie.outputs.filter != ''");
  });

  test("merges the secrets of every root into env", async () => {
    const cwd = tempRepo();
    const A: PackageInfo = {
      name: "A",
      path: "a",
      manifest: {
        name: "A",
        scripts: { test: "t" },
        workie: { secrets: { test: ["FOO"] } },
      },
      directDependencies: [],
      directDependents: [],
    };
    const B: PackageInfo = {
      name: "B",
      path: "b",
      manifest: {
        name: "B",
        scripts: { test: "t" },
        workie: { secrets: ["BAR", "FOO"] },
      },
      directDependencies: [],
      directDependents: [],
    };
    const graph = makeGraph([A, B], {
      tasks: { test: { dependsOn: ["^test"] } },
    });
    await generate(
      {
        tasks: {
          test: ({ env }) => ({
            on: MANUAL,
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
      join(cwd, ".github/workflows/workie-test.yml"),
      "utf-8",
    );
    expect(body).toContain(
      "BAR: ${{ secrets.BAR }}\n          FOO: ${{ secrets.FOO }}\n",
    );
  });

  test("removes stale workflows with the prefix", async () => {
    const cwd = tempRepo();
    writeFileSync(join(cwd, ".github/workflows/workie-a-test.yml"), "old\n");
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
          test: () => ({
            on: "workflow_dispatch",
            jobs: {
              t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] },
            },
          }),
        },
      },
      { cwd, graph, log: false },
    );
    expect(result.removed).toEqual(["workie-a-test.yml"]);
    // The unrelated file is left alone.
    expect(readdirSync(join(cwd, ".github/workflows")).sort()).toEqual([
      "keep-me.yml",
      "workie-test.yml",
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
          on: ["push" as const, "workflow_dispatch" as const],
          jobs: {
            t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] },
          },
        }),
      },
    };
    const first = await generate(config, { cwd, graph, log: false });
    expect(first.written).toEqual(["workie-test.yml"]);
    const second = await generate(config, { cwd, graph, log: false });
    expect(second.written).toEqual([]);
    expect(second.unchanged).toEqual(["workie-test.yml"]);
  });

  test("skips a task with no roots", async () => {
    const cwd = tempRepo();
    const graph = makeGraph([makePackage("A", "a", { build: "b" })]);
    const result = await generate(
      {
        tasks: {
          test: () => {
            throw new Error("not called");
          },
        },
      },
      { cwd, graph, log: false },
    );
    expect(result.written).toEqual([]);
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

  test("throws when a workflow can't be run manually", async () => {
    const cwd = tempRepo();
    const graph = makeGraph([makePackage("A", "a", { test: "t" })]);
    await expect(
      generate(
        {
          tasks: {
            test: () => ({
              on: { push: {} },
              jobs: {
                t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] },
              },
            }),
          },
        },
        { cwd, graph, log: false },
      ),
    ).rejects.toThrow(/workflow_dispatch/);
  });

  test("throws when a job uses the affected filter without the step", async () => {
    const cwd = tempRepo();
    const graph = makeGraph([makePackage("A", "a", { test: "t" })]);
    await expect(
      generate(
        {
          tasks: {
            test: ({ affected }) => ({
              on: MANUAL,
              jobs: {
                t: {
                  "runs-on": "ubuntu-latest",
                  steps: [{ run: `turbo test ${affected.filter}` }],
                },
              },
            }),
          },
        },
        { cwd, graph, log: false },
      ),
    ).rejects.toThrow(/without affected.step/);
  });

  test("allows templates to return null to skip", async () => {
    const cwd = tempRepo();
    const graph = makeGraph(
      [makePackage("A", "a", { test: "t", build: "b" })],
      { tasks: { test: { dependsOn: ["build"] } } },
    );
    const result = await generate(
      {
        tasks: {
          build: () => null,
          test: () => ({
            on: MANUAL,
            jobs: {
              t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] },
            },
          }),
        },
      },
      { cwd, graph, log: false },
    );
    expect(result.written).toEqual(["workie-test.yml"]);
  });
});

describe("workflowFilename", () => {
  test("slugs slashes in the task name", () => {
    expect(workflowFilename("test")).toBe("workie-test.yml");
    expect(workflowFilename("a/b")).toBe("workie-a-b.yml");
  });
});
