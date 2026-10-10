import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import { affected, globToRegExp } from "./affected.ts";
import type { PackageInfo, TaskRoot } from "./types.ts";

function root(name: string, paths: string[]): TaskRoot {
  const pkg: PackageInfo = {
    name,
    path: name.toLowerCase(),
    manifest: { name },
    directDependencies: [],
    directDependents: [],
  };
  return { pkg, dependencies: [pkg], paths };
}

const A = root("A", ["a/**", "c/**"]);
const B = root("@x/b", ["b/**", "c/**"]);
const step = affected([A, B]).step({ always: ["package.json", "**/*.lock"] });

describe("globToRegExp", () => {
  const matches = (glob: string, path: string) =>
    new RegExp(`^${globToRegExp(glob)}$`).test(path);

  test("matches GitHub's path glob semantics", () => {
    expect(matches("a/**", "a/b/c.ts")).toBe(true);
    expect(matches("a/**", "ab/c.ts")).toBe(false);
    expect(matches("package.json", "package.json")).toBe(true);
    expect(matches("package.json", "a/package.json")).toBe(false);
    expect(matches("package.json", "packageXjson")).toBe(false);
    expect(matches("*.ts", "a.ts")).toBe(true);
    expect(matches("*.ts", "a/b.ts")).toBe(false);
    expect(matches("**/*.lock", "uv.lock")).toBe(true);
    expect(matches("**/*.lock", "a/b/uv.lock")).toBe(true);
    expect(matches("a?c", "abc")).toBe(true);
    expect(matches("a?c", "a/c")).toBe(false);
  });

  test("rejects negated globs", () => {
    expect(() => globToRegExp("!a/**")).toThrow(/negated/);
  });
});

describe("affected.step", () => {
  let origin: string;
  let base: string;

  function git(cwd: string, ...args: string[]): string {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "t",
        GIT_AUTHOR_EMAIL: "t@t",
        GIT_COMMITTER_NAME: "t",
        GIT_COMMITTER_EMAIL: "t@t",
      },
    }).trim();
  }

  function commit(work: string, files: string[]): string {
    for (const f of files) {
      execFileSync("mkdir", ["-p", dirname(join(work, f))]);
      writeFileSync(join(work, f), `${Math.random()}\n`);
    }
    git(work, "add", "-A");
    git(work, "commit", "-qm", files.join(" "));
    return git(work, "rev-parse", "HEAD");
  }

  // A pull request's GitHub-made merge commit, on top of the base branch.
  function pullRequest(files: string[]): string {
    const work = mkdtempSync(join(tmpdir(), "workie-pr-"));
    git(work, "clone", "-q", origin, ".");
    git(work, "checkout", "-qb", "topic");
    commit(work, files);
    git(work, "checkout", "-q", "main");
    commit(work, ["other/x"]);
    git(work, "merge", "-q", "--no-ff", "-m", "merge", "topic");
    const sha = git(work, "rev-parse", "HEAD");
    git(work, "push", "-q", "origin", `HEAD:refs/pull/${sha}/merge`);
    return sha;
  }

  // Run the step the way GitHub would, after a depth-1 actions/checkout.
  function run(event: string, sha: string, before = ""): string[] {
    const work = mkdtempSync(join(tmpdir(), "workie-run-"));
    git(work, "init", "-q");
    git(work, "remote", "add", "origin", `file://${origin}`);
    git(work, "fetch", "-q", "--depth=1", "origin", sha);
    git(work, "checkout", "-q", sha);
    const output = join(work, ".output");
    writeFileSync(output, "");
    execFileSync("bash", ["-eo", "pipefail", "-c", step.run as string], {
      cwd: work,
      stdio: "ignore",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: event,
        GITHUB_SHA: sha,
        GITHUB_OUTPUT: output,
        BEFORE: before,
      },
    });
    return readFileSync(output, "utf-8").trim().split("\n");
  }

  const all = ["roots=A @x/b", "filter=--filter=A --filter=@x/b"];

  beforeAll(() => {
    origin = mkdtempSync(join(tmpdir(), "workie-origin-"));
    git(origin, "init", "-q", "--bare", "-b", "main");
    git(origin, "config", "uploadpack.allowAnySHA1InWant", "true");
    const work = mkdtempSync(join(tmpdir(), "workie-work-"));
    git(work, "init", "-q", "-b", "main");
    base = commit(work, ["package.json", "a/x", "b/x", "c/x"]);
    git(work, "push", "-q", origin, "main");
  });

  test("selects the roots a pull request touches", () => {
    expect(run("pull_request", pullRequest(["a/x"]))).toEqual([
      "roots=A",
      "filter=--filter=A",
    ]);
    expect(run("pull_request", pullRequest(["c/y/z"]))).toEqual(all);
  });

  test("selects every root when an `always` path changes", () => {
    expect(run("pull_request", pullRequest(["package.json"]))).toEqual(all);
    expect(run("pull_request", pullRequest(["a/b/uv.lock"]))).toEqual(all);
  });

  test("selects nothing for unrelated changes", () => {
    expect(run("pull_request", pullRequest(["README.md"]))).toEqual([
      "roots=",
      "filter=",
    ]);
  });

  test("diffs a push against the previous commit", () => {
    const work = mkdtempSync(join(tmpdir(), "workie-push-"));
    git(work, "clone", "-q", origin, ".");
    commit(work, ["b/x"]);
    const after = commit(work, ["README.md"]);
    git(work, "push", "-q", "origin", "HEAD:refs/heads/pushed");
    expect(run("push", after, base)).toEqual([
      "roots=@x/b",
      "filter=--filter=@x/b",
    ]);
    expect(run("push", after, "0".repeat(40))).toEqual(all);
    expect(run("push", after, "1".repeat(40))).toEqual(all);
  });

  test("selects every root on a manual run", () => {
    expect(run("workflow_dispatch", base)).toEqual(all);
  });
});
