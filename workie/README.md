# @moreplease/workie

Generate GitHub Actions workflows from a [Turborepo](https://turbo.build)
monorepo. Given a task like `test` or `push`, `workie` looks at the package
dependency graph and the task dependency graph (from `turbo.json`) to figure out
the minimal set of "root" packages that cover the task, then runs a
user-supplied template to produce one workflow for the task as a JSON object.
The workflow runs the task with a single `turbo` command, limited to the
packages the triggering change affects. The output is validated against the
SchemaStore [GitHub Actions
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

// Changes to these affect every package.
const ROOT_PATHS = ["package.json", "pnpm-lock.yaml", "turbo.json"];

const testWorkflow: WorkflowFunction = ({ paths, affected, env }) => ({
  name: "test",
  on: {
    workflow_dispatch: {},
    pull_request: { branches: ["main"], paths: [...ROOT_PATHS, ...paths] },
  },
  jobs: {
    test: {
      "runs-on": "ubuntu-latest",
      steps: [
        { uses: "actions/checkout@v6.0.2", with: { "fetch-depth": 0 } },
        // ...set up pnpm and install...
        {
          name: "turbo test",
          run: `pnpm exec turbo test ${affected}`,
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

The template gets the task's `roots`, their transitive `dependencies` (roots
included), the `paths` of those dependencies (`dir/**` globs, for the trigger's
path filter), `affected` and `env`. It's only called if the task has at least
one root, and it can return `null` to skip the workflow.

`affected` and `env` make turbo run the task only where the triggering change
matters, using [`turbo run
--affected`](https://turborepo.dev/docs/reference/run#--affected):

- `affected` is the arguments for the `turbo run` command: `--affected` on a
  pull request or push. Any other event, such as a manual run
  (`workflow_dispatch`), runs the task in every package.
- `env` goes on the step that runs turbo. It tells turbo which commit a pull
  request is compared against, and holds every secret declared in
  `workie.secrets` on any of `dependencies` that applies to the task, as
  `${{ secrets.NAME }}` expressions. Since every root runs in the same step, a
  secret one root declares is visible to the others' tasks too.

Turbo selects the packages with changed files, plus the packages that depend on
them, and `turbo.json` decides what else runs. Keep in mind:

- The checkout needs enough history to reach the commit turbo compares against:
  `fetch-depth: 0` is the simple choice. If turbo can't find it, it runs every
  package.
- Changes to `turbo.json` and the lockfile affect every package, and so does a
  change to any package the root `package.json` depends on. Other root files
  only affect packages if they're listed in `turbo.json`'s
  [`globalDependencies`](https://turborepo.dev/docs/reference/configuration#globaldependencies).
  List those files in the trigger's `paths` too, as `ROOT_PATHS` does above.

Every workflow must have a `workflow_dispatch` trigger, so it can be run by hand
for every package.

## Algorithm

For each task `T` in the config:

1. Find every package whose `package.json` declares a `T` script.
2. Consult `turbo.json` to decide whether running `T` in a parent package will
   transitively run `T` in its dependencies. If it does, a parent covers its
   children and only the "root" packages are kept.
3. Collect the roots' transitive dependencies and their paths.
4. Call the template with the roots, their dependencies and paths.
5. Validate the generated workflow against the SchemaStore schema.
6. Write the result as YAML.
