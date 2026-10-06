import { describe, expect, test } from "vitest";
import { validateWorkflow } from "./validateWorkflow.ts";

describe("validateWorkflow", () => {
  test("accepts a minimal valid workflow", () => {
    const result = validateWorkflow({
      name: "minimal",
      on: "push",
      jobs: {
        t: {
          "runs-on": "ubuntu-latest",
          steps: [{ run: "echo hi" }],
        },
      },
    });
    expect(result).toEqual({ ok: true });
  });

  test("accepts jobs keyed by identifier", () => {
    const result = validateWorkflow({
      on: { workflow_dispatch: {} },
      jobs: {
        build: {
          "runs-on": "ubuntu-latest",
          steps: [{ uses: "actions/checkout@v6.0.2" }],
        },
      },
    });
    expect(result.ok).toBe(true);
  });

  test("rejects workflows with invalid values", () => {
    // `on` must be a string, array, or object -- a number is rejected.
    const result = validateWorkflow({
      on: 42 as unknown as string,
      jobs: { t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] } },
    });
    expect(result.ok).toBe(false);
  });

  test("rejects workflows missing `on`", () => {
    const result = validateWorkflow({
      jobs: { t: { "runs-on": "ubuntu-latest", steps: [{ run: "hi" }] } },
    } as unknown as Parameters<typeof validateWorkflow>[0]);
    expect(result.ok).toBe(false);
  });
});
