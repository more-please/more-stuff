/**
 * Compile the SchemaStore GitHub Actions workflow schema into a
 * standalone validator using ajv. Run this whenever
 * github-workflow.json changes:
 *
 *   node schemas/build.mjs
 *
 * The generated file (github-workflow.validator.cjs) is checked in so
 * the runtime never has to load ajv. CommonJS is used because ajv's
 * standalone ESM output emits `require()` calls that don't execute in
 * an ES module context.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import standaloneCode from "ajv/dist/standalone/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "github-workflow.json");
const outPath = join(here, "github-workflow.validator.cjs");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

// The SchemaStore schema isn't written in strict-compliant JSON Schema
// (some property definitions omit `type: "object"`), so we opt out of
// strict mode. `validateFormats` stays on for the formats ajv supports
// natively; the schema currently doesn't use any format keywords.
const ajv = new Ajv({
  strict: false,
  allErrors: true,
  code: { source: true },
});

const validate = ajv.compile(schema);
const moduleCode = standaloneCode(ajv, validate);

writeFileSync(outPath, moduleCode);

console.log(`wrote ${outPath} (${moduleCode.length} bytes)`);
