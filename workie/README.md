# @moreplease/workie

Generate GitHub Actions workflows from a [Turborepo](https://turbo.build)
monorepo. Given a task like `test` or `push`, `workie` looks at the package
dependency graph and the task dependency graph (from `turbo.json`) to figure out
the minimal set of packages that need their own workflow, then runs a
user-supplied template to produce each workflow as a JSON object. The output is
validated against the SchemaStore [GitHub Actions
schema](https://json.schemastore.org/github-workflow.json) and emitted as YAML.

## Usage

Install it as a dev dependency in the monorepo root:

```sh
pnpm add -D @moreplease/workie
```

Node 22.18 or later is required, so that `workie.config.ts` can be loaded
without a separate TypeScript compiler.

Create a `workie.config.ts` in the monorepo root:

```ts
import { defineConfig, type WorkflowFunction } from "@moreplease/workie";

const testWorkflow: WorkflowFunction = ({ pkg, paths }) => ({
  name: `test ${pkg.name}`,
  on: {
    workflow_dispatch: {},
    pull_request: { branches: ["main"], paths },
  },
  jobs: {
    test: {
      "runs-on": "ubuntu-latest",
      steps: [
        { uses: "actions/checkout@v6.0.2" },
        {
          name: "turbo test",
          run: `pnpm exec turbo test --filter=${pkg.name}`,
        },
      ],
    },
  },
});

export default defineConfig({
  tasks: { test: testWorkflow },
});
```

Then run `workie` from the monorepo root. Generated files are written to
`.github/workflows/` with a `workie-` prefix. Any existing `workie-*.yml` files
that are no longer needed are deleted. Files without the prefix are left alone.

## Algorithm

For each task `T` in the config:

1. Find every package whose `package.json` declares a `T` script.
2. Consult `turbo.json` to decide whether running `T` in a parent package will
   transitively run `T` in its dependencies. If it does, a parent workflow
   covers its children and only the "root" packages get a workflow.
3. For each root, call the template with paths for the package plus all its
   transitive dependencies.
4. Validate each generated workflow against the SchemaStore schema.
5. Write the result as YAML.
