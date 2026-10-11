import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  defineConfig,
  type PackageInfo,
  type WorkflowFunction,
  type WorkflowStep,
} from "@moreplease/workie";

// Root files whose changes can affect any package, so they trigger the
// workflow too. turbo.json and the lockfile are global to turbo already; the
// others are listed as globalDependencies in turbo.json, so that `--affected`
// treats them the same way.
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
    packages.find((p) => existsSync(join(import.meta.dirname, p.path, file)));
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

const test: WorkflowFunction = ({ paths, dependencies, affected, env }) => ({
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
        // `--affected` needs the history back to the commit it compares with.
        { uses: "actions/checkout@v7", with: { "fetch-depth": 0 } },
        ...toolchainSetup(dependencies),
        ...PNPM_SETUP,
        {
          name: "turbo test",
          run: `pnpm exec turbo test ${affected} --log-order=stream`,
          env,
        },
      ],
    },
  },
});

export default defineConfig({ tasks: { test } });
