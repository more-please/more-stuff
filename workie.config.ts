import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  defineConfig,
  type PackageInfo,
  type WorkflowFunction,
  type WorkflowStep,
} from "@moreplease/workie";

// workie's paths only cover package directories. Changes at the root (a
// dependency bump, a turbo.json edit) can break any package, so they run
// every package.
const ROOT_PATHS = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
];

const PNPM_SETUP: WorkflowStep[] = [
  { uses: "pnpm/action-setup@v6" },
  {
    uses: "actions/setup-node@v7",
    with: { "node-version": 24, cache: "pnpm" },
  },
  { run: "pnpm install --frozen-lockfile" },
];

// Rust needs no setup: the runner image comes with cargo.
function toolchainSetup(packages: PackageInfo[]): WorkflowStep[] {
  const has = (file: string) =>
    packages.find((p) => existsSync(join(p.path, file)));
  const steps: WorkflowStep[] = [];
  const go = has("go.mod");
  if (go) {
    steps.push({
      uses: "actions/setup-go@v7",
      with: { "go-version-file": join(go.path, "go.mod") },
    });
  }
  if (has("pyproject.toml")) {
    steps.push({
      uses: "actions/setup-python@v7",
      with: { "python-version": "3.10" },
    });
  }
  return steps;
}

const test: WorkflowFunction = ({ paths, dependencies, env, affected }) => ({
  name: "test",
  on: {
    workflow_dispatch: {},
    pull_request: { branches: ["main"], paths: [...ROOT_PATHS, ...paths] },
  },
  jobs: {
    test: {
      // The job name is the check name. A bare "test" would collide with
      // test.yml's gate job, which is the check branch protection requires.
      name: "test packages",
      "runs-on": "ubuntu-latest",
      steps: [
        { uses: "actions/checkout@v7" },
        affected.step({ always: ROOT_PATHS }),
        ...toolchainSetup(dependencies),
        ...PNPM_SETUP,
        {
          name: "turbo test",
          if: affected.if(),
          run: `pnpm exec turbo test ${affected.filter} --log-order=stream`,
          env,
        },
      ],
    },
  },
});

export default defineConfig({ tasks: { test } });
