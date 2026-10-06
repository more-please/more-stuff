// The validator is a precompiled ajv standalone module, generated from
// schemas/github-workflow.json by schemas/build.mjs. Using the standalone
// form means the runtime has no dependency on ajv itself -- it just calls
// a plain function.
// @ts-expect-error -- the generated CommonJS module ships without declarations.
import validate from "../schemas/github-workflow.validator.cjs";
import type { Workflow } from "./types.ts";

type ValidateFn = {
  (data: unknown): boolean;
  errors?: Array<{ instancePath?: string; message?: string }> | null;
};

const validateFn = validate as ValidateFn;

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

/**
 * Validate a workflow object against the SchemaStore GitHub Actions schema.
 * Returns the result instead of throwing so callers can aggregate errors
 * across many workflows.
 */
export function validateWorkflow(workflow: Workflow): ValidationResult {
  if (validateFn(workflow)) {
    return { ok: true };
  }
  const errors = (validateFn.errors ?? []).map(
    (e) => `${e.instancePath || "/"} ${e.message ?? "validation error"}`,
  );
  return { ok: false, errors };
}
