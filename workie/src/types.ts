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

/** A package whose `task` run covers others', with what it depends on. */
export type TaskRoot = {
  pkg: PackageInfo;
  /** All packages reachable from `pkg` via `directDependencies` (including itself). */
  dependencies: PackageInfo[];
  /** `dependencies`' directories, expanded with the `/**` wildcard and sorted. */
  paths: string[];
};

/** Context passed to a `WorkflowFunction`. */
export type WorkflowContext = {
  /** The task this workflow implements (e.g. `"test"`, `"push"`). */
  task: string;
  /** The packages the workflow runs `task` in, sorted by path. */
  roots: TaskRoot[];
  /** Every package reachable from a root (roots included), sorted by path. */
  dependencies: PackageInfo[];
  /**
   * Path filters for this workflow's `on:` trigger: the union of every
   * root's `paths`, sorted alphabetically.
   */
  paths: string[];
  /**
   * GitHub Actions `env` block, pre-populated with all secrets declared
   * in `workie.secrets` on any root or its transitive dependencies that
   * apply to this task. Each value is a `${{ secrets.NAME }}` expression.
   * Plug it into any step (or the whole job) that needs the secrets.
   */
  env: Record<string, string>;
  /** Helpers for running `task` only in the roots a change affects. */
  affected: Affected;
};

/**
 * Selects the roots affected by the change set that triggered the
 * workflow. Put `step()` early in the job, then run turbo with `filter`
 * in a later step of the same job, guarded by `if()`.
 */
export type Affected = {
  /** A step (with id `workie`) that works out the affected roots. */
  step(options?: AffectedOptions): WorkflowStep;
  /** `--filter=` arguments for the affected roots, as an expression. */
  filter: string;
  /**
   * An `if:` condition that's true when any of `roots` (default: all of
   * them) is affected. Without it, an empty `filter` would make turbo run
   * the task in every package.
   */
  if(roots?: TaskRoot[]): string;
};

export type AffectedOptions = {
  /** Path globs (e.g. `pnpm-lock.yaml`) whose change affects every root. */
  always?: string[];
};

/** A function that produces a workflow JSON object, or `null` to skip. */
export type WorkflowFunction = (
  ctx: WorkflowContext,
) => Workflow | null | undefined;

export type WorkieConfig = {
  /** Map from task name to the function that produces its workflow. */
  tasks: Record<string, WorkflowFunction>;
};
