/** Types for defining a `workie.config.ts`. */

/** A GitHub Actions workflow, as a JSON object. */
export type Workflow = {
  name?: string;
  "run-name"?: string;
  on: WorkflowOn;
  env?: Record<string, string>;
  permissions?: WorkflowPermissions;
  jobs: Record<string, WorkflowJob>;
  [key: string]: unknown;
};

export type WorkflowOn =
  | string
  | string[]
  | Record<string, Record<string, unknown> | null>;

export type WorkflowPermissions =
  | "read-all"
  | "write-all"
  | Record<string, string>;

export type WorkflowJob = {
  name?: string;
  "runs-on"?: string | string[];
  "timeout-minutes"?: number;
  permissions?: WorkflowPermissions;
  env?: Record<string, string>;
  needs?: string | string[];
  steps?: WorkflowStep[];
  [key: string]: unknown;
};

export type WorkflowStep = {
  name?: string;
  id?: string;
  if?: string;
  uses?: string;
  run?: string;
  with?: Record<string, string | number | boolean>;
  env?: Record<string, string>;
  shell?: string;
  [key: string]: unknown;
};

/** Information about a package discovered in the Turbo monorepo. */
export type PackageInfo = {
  /** Package name from `package.json` (e.g. `@moreplease/foo`). */
  name: string;
  /** Path relative to the monorepo root (e.g. `tools/foo`). */
  path: string;
  /** Parsed contents of `package.json`. */
  manifest: PackageManifest;
  /** Names of packages this one directly depends on. */
  directDependencies: string[];
  /** Names of packages that directly depend on this one. */
  directDependents: string[];
};

export type PackageManifest = {
  name?: string;
  scripts?: Record<string, string>;
  /**
   * Optional workie-specific metadata. Templates and root selection use
   * this to wire up GitHub Actions secrets into workflow environments.
   */
  workie?: {
    /**
     * GitHub Actions secret names that should be wired into the `env` of
     * any workflow generated for this package. The string-array form
     * applies to every task; the object form lets you target specific
     * tasks (keys are task names as declared in the config, e.g. `"test"`,
     * `"push"`, `"docker-push"`).
     */
    secrets?: string[] | Record<string, string[]>;
  };
  [key: string]: unknown;
};

/** Context passed to a `WorkflowFunction`. */
export type WorkflowContext = {
  /** The task this workflow implements (e.g. `"test"`, `"push"`). */
  task: string;
  /** The package this workflow runs for. */
  pkg: PackageInfo;
  /**
   * Path filters for this workflow's `on:` trigger, already expanded with
   * the `/**` wildcard. Covers the package itself plus every transitive
   * dependency; sorted alphabetically so the output is deterministic.
   */
  paths: string[];
  /** All packages reachable from `pkg` via `directDependencies` (including itself). */
  dependencies: PackageInfo[];
  /**
   * GitHub Actions `env` block, pre-populated with all secrets declared
   * in `workie.secrets` on this package and its transitive dependencies
   * that apply to this task. Each value is a `${{ secrets.NAME }}`
   * expression. Plug it into any step (or the whole job) that needs the
   * secrets.
   */
  env: Record<string, string>;
};

/** A function that produces a workflow JSON object, or `null` to skip. */
export type WorkflowFunction = (
  ctx: WorkflowContext,
) => Workflow | null | undefined;

export type WorkieConfig = {
  /** Map from task name to the function that produces its workflow. */
  tasks: Record<string, WorkflowFunction>;
};
