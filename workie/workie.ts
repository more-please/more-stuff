/**
 * Public API for `@moreplease/workie`. Import `defineConfig` and the types
 * from here in a `workie.config.ts`. The `workie` CLI lives in
 * `workie-cli.ts`.
 */

export { defineConfig } from "./src/defineConfig.ts";
export {
  type GenerateOptions,
  type GenerateResult,
  generate,
  workflowFilename,
} from "./src/generate.ts";
export { findConfig, loadConfig } from "./src/loadConfig.ts";
export {
  collectSecrets,
  packageSecrets,
  secretsToEnv,
} from "./src/secrets.ts";
export {
  taskPropagates,
  taskRoots,
  tasksRunOnDependencies,
} from "./src/taskRoots.ts";
export { loadTurboGraph, transitiveDependencies } from "./src/turboGraph.ts";
export type {
  Affected,
  AffectedOptions,
  PackageInfo,
  PackageManifest,
  TaskRoot,
  Workflow,
  WorkflowContext,
  WorkflowFunction,
  WorkflowJob,
  WorkflowOn,
  WorkflowPermissions,
  WorkflowStep,
  WorkieConfig,
} from "./src/types.ts";
export {
  type ValidationResult,
  validateWorkflow,
} from "./src/validateWorkflow.ts";
export { yaml } from "./src/yaml.ts";
