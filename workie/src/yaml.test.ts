import { describe, expect, test } from "vitest";
import { yaml } from "./yaml.ts";

describe("yaml", () => {
  test("emits 2-space indented YAML preserving key order", () => {
    const out = yaml({
      name: "test",
      on: { push: { branches: ["main"] } },
      jobs: {
        t: { "runs-on": "ubuntu-latest", steps: [{ run: "echo hi" }] },
      },
    });
    expect(out).toBe(
      [
        "name: test",
        "on:",
        "  push:",
        "    branches:",
        "      - main",
        "jobs:",
        "  t:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - run: echo hi",
        "",
      ].join("\n"),
    );
  });

  test("double-quotes strings that need quoting", () => {
    const out = yaml({ key: "true" });
    expect(out).toContain('key: "true"');
  });

  test("does not wrap long lines", () => {
    const long = "x".repeat(200);
    const out = yaml({ value: long });
    expect(out).toContain(long);
  });
});
