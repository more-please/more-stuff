# @moreplease/workie

Generate GitHub Actions workflows from a [Turborepo](https://turbo.build)
monorepo. Given a task like `test` or `push`, `workie` looks at the package
dependency graph and the task dependency graph (from `turbo.json`) to figure out
the minimal set of "root" packages that cover the task, then runs a
user-supplied template to produce one workflow for the task as a JSON object.
At run time, the workflow works out which roots the change set affects and runs
the task in just those, with a single `turbo` command, so packages that several
roots share run once. The output is validated against the SchemaStore [GitHub
Actions schema](https://json.schemastore.org/github-workflow.json) and emitted
as YAML.

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

// Changes to these affect every package.
const ROOT_PATHS = ["package.json", "pnpm-lock.yaml", "turbo.json"];

const testWorkflow: WorkflowFunction = ({ paths, env, affected }) => ({
  name: "test",
  on: {
    workflow_dispatch: {},
    pull_request: { branches: ["main"], paths: [...ROOT_PATHS, ...paths] },
  },
  jobs: {
    test: {
      "runs-on": "ubuntu-latest",
      steps: [
        { uses: "actions/checkout@v6.0.2" },
        affected.step({ always: ROOT_PATHS }),
        // ...set up pnpm and install...
        {
          name: "turbo test",
          if: affected.if(),
          run: `pnpm exec turbo test ${affected.filter}`,
          env,
        },
      ],
    },
  },
});

export default defineConfig({
  tasks: { test: testWorkflow },
});
```

Then run `workie` from the monorepo root. Each task's workflow is written to
`.github/workflows/workie-<task>.yml`. Any existing `workie-*.yml` files that
are no longer needed are deleted. Files without the prefix are left alone.

### The template

The template gets the task's `roots`, each with its transitive `dependencies`
and their `paths` (`dir/**` globs), plus the union of those across all roots:
`dependencies`, `paths` (for the trigger's path filter), and an `env` of the
secrets they declare. It's only called if the task has at least one root, and
it can return `null` to skip the workflow.

`affected` connects the workflow to the change set:

- `affected.step({ always })` is a step (with id `workie`) that lists the files
  the triggering event changed and picks the roots whose `paths`, or the
  `always` globs, match one of them. For a pull request the change set is
  GitHub's merge commit against the base branch; for a push it's `before`
  against the pushed commit. It fetches the commits it needs, so it works after
  a shallow checkout. A manual run (`workflow_dispatch`), any other event, or a
  change set that can't be fetched selects every root.
- `affected.filter` is an expression for the `--filter=<root>` arguments of the
  selected roots, for use in later steps of the same job.
- `affected.if()` is an `if:` condition that's true when any root is selected.
  Guard the turbo step with it: with nothing selected the filter is empty, and
  turbo would run the task everywhere. `affected.if(roots)` is true when any of
  the given roots is selected, for steps only some roots need.

Every workflow must have a `workflow_dispatch` trigger, so it can be run by hand
for every package.

## Algorithm

For each task `T` in the config:

1. Find every package whose `package.json` declares a `T` script.
2. Consult `turbo.json` to decide whether running `T` in a parent package will
   transitively run `T` in its dependencies. If it does, a parent covers its
   children and only the "root" packages are kept.
3. For each root, collect paths for the package plus all its transitive
   dependencies.
4. Call the template with the roots, generating the step that matches a change
   set against each root's paths.
5. Validate the generated workflow against the SchemaStore schema.
6. Write the result as YAML.
