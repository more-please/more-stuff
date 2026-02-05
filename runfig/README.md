![runfig](https://raw.githubusercontent.com/more-please/more-stuff/main/runfig/runfig.svg)

Down with YAML and TOML! Generate your config files from code, the way nature intended.

## Contents

<!-- toc -->

- [Overview](#overview)
- [Installation & usage](#installation--usage)
- [Tutorial](#tutorial)
  * [List existing configs](#list-existing-configs)
  * [Print bootstrapped config script](#print-bootstrapped-config-script)
  * [Generate configs from scripts](#generate-configs-from-scripts)
  * [Suggested workflows](#suggested-workflows)
- [Reference](#reference)
  * [Command-line options](#command-line-options)
  * [Supported formats & file extensions](#supported-formats--file-extensions)
- [Notes & caveats](#notes--caveats)
  * [Possible future enhancements](#possible-future-enhancements)

<!-- tocstop -->

## Overview

Like all developers, I've developed some strong opinions:

1. JSON is better for config files than "human-readable" formats like YAML and TOML;
1. JavaScript is better than JSON, because you can use code;
1. TypeScript is better than JavaScript, because you can type-check it.

I made Runfig so that I can use TypeScript instead of TOML/YAML.

For example, see [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) in this monorepo. PNPM allows wildcards in this file, but the Turbo monorepo tool requires all the packages to be listed explicitly, so I added a script to scan for packages automatically: [`pnpm-workspace.yaml.ts`](../pnpm-workspace.yaml.ts). Executing `runfig` in the root directory regenerates the workspace file.

Why use Runfig rather than hand-rolling a script to generate configs?

- All the boilerplate file access is handled for you;
- JSON, TOML, YAML and Markdown supported out of the box;
- `--unfig` flag for easy bootstrapping.

## Installation & usage

Install `runfig` via your package manager of choice, e.g.:

```
pnpm install -g runfig
```

Executing `runfig` will then:

- Scan for config files with an additional `.js` or `.ts` extension
- Load each file and extract its default export
- Convert each export to the appropriate format (JSON, YAML, TOML or Markdown)
- Write a corresponding output file for each input

For example, if Runfig sees a `wrangler.toml.ts` script it will use that to generate `wrangler.toml`.

Execute `runfig -u` to run in the opposite direction, e.g. use `wrangler.toml` to generate `wrangler.toml.ts`. This is useful to bootstrap a Runfig setup from existing config files.

## Tutorial

Consider Cloudflare's [sample `wrangler.toml` configuration](https://developers.cloudflare.com/workers/wrangler/configuration/#sample-wranglertoml-configuration):

```
# Top-level configuration
name = "my-worker"
main = "src/index.js"
compatibility_date = "2022-07-12"

workers_dev = false
route = { pattern = "example.org/*", zone_name = "example.org" }

kv_namespaces = [
  { binding = "<MY_NAMESPACE>", id = "<KV_ID>" }
]

[env.staging]
name = "my-worker-staging"
route = { pattern = "staging.example.org/*", zone_name = "example.org" }

kv_namespaces = [
  { binding = "<MY_NAMESPACE>", id = "<STAGING_KV_ID>" }
]
```

I'm not keen on TOML as the syntax is overly subtle; for example, `[env.staging]` is doing a lot of work. It's "readable" but also error prone.

### List existing configs

Runfig understands TOML, so it should be able to parse this config. Let's check:

```
% runfig --unfig --list
wrangler.toml.ts
```

The `%` prompt here indicates the command to type, `runfig --unfig --list`. (I'm assuming that `runfig` has been installed globally.)

The `--unfig` flag says to run in reverse (bootstrap `.ts` scripts from configs). The `--list` flag prints the files that would be generated. (All flags can be abbreviated, so we could type just `runfig -u -l`.)

In this example, the output will consist of one file: `wrangler.toml.ts`.

### Print bootstrapped config script

Before generating that file, let's use `--print` to see what it will look like:

```
% runfig --unfig --print
// Auto-generated from wrangler.toml

export default {
  name: 'my-worker',
  main: 'src/index.js',
  compatibility_date: '2022-07-12',
  workers_dev: false,
  route: {
    pattern: 'example.org/*',
    zone_name: 'example.org',
  },
  kv_namespaces: [
    {
      binding: '<MY_NAMESPACE>',
      id: '<KV_ID>',
    },
  ],
  env: {
    staging: {
      name: 'my-worker-staging',
      route: {
        pattern: 'staging.example.org/*',
        zone_name: 'example.org',
      },
      kv_namespaces: [
        {
          binding: '<MY_NAMESPACE>',
          id: '<STAGING_KV_ID>',
        },
      ],
    },
  },
}
```

Looks good — let's go ahead and generate that file:

```
% runfig --unfig
wrangler.toml → wrangler.toml.ts
```

Runfig logs a line to stderr showing what was generated, and from where.

### Generate configs from scripts

Now we have a `.ts` script whose default export is a JSON object. We can modify this script, refactor it using imports and shared constants, and so on. The default behavior of Runfig is to regenerate configs, so we don't need any flags:

```
% runfig
wrangler.toml.ts → wrangler.toml
```

You can alternatively use `wrangler.toml.js` if you prefer JavaScript to TypeScript (although the `--unfig` flag always generates `.ts` files right now).

### Suggested workflows

There are various ways to fit Runfig into a development workflow, including:

- **Manual:** use Runfig ad-hoc when working with TOML and YAML files;
- **Fully automated:** store the `.ts` files in source control, and generate YAML/TOML configs as part of your build;
- **Semi-automated:** store both files in source control, and use a precommit hook or similar to keep the configs in sync.

An advantage of the semi-automated approach is that you can code review the config changes as they occur. I use this approach in this monorepo for [`pnpm-workspace.yaml`](../pnpm-workspace.yaml), where it also solves a chicken-and-egg problem: the file needs to be checked in for Turbo to work, but I use Turbo to regenerate the file!

## Reference

### Command-line options

- `--indir`, `-i`: set input directory (default is current directory)
- `--outdir`, `-o`: set output directory (default is curent directory)
- `--recursive`, `-r`: include subdirectories (default is false)
- `--unfig`, `-u`: run in reverse to bootstrap inputs
- `--print`, `-p`: print generated output to stdout, don't write files
- `--list`, `-l`: list output filenames to stdout, don't write files

By default, all matching files in the input directory will be processed. However, if there are positional arguments, these will be interpreted as individual files to be processed (relative to `--indir`).

If the `--recursive` flag is used, subdirectory paths are preserved in the output.

### Supported formats & file extensions

| JavaScript | TypeScript | →   | Output  |
| ---------- | ---------- | --- | ------- |
| `.json.js` | `.json.ts` |     | `.json` |
| `.toml.js` | `.toml.ts` |     | `.toml` |
| `.yaml.js` | `.yaml.ts` |     | `.yaml` |
| `.yml.js ` | `.yml.ts`  |     | `.yml`  |
| `.markdown.js` | `.markdown.ts` |     | `.markdown` |
| `.md.js ` | `.md.ts`  |     | `.md`  |

## Notes & caveats

I've tried to make this tool reasonably robust and flexible, but fundamentally Runfig is at a "works well enough for me" quality level, hence the 0.x version number. If you're interested in using it, please let me know!

Runfig requires Node 22 or later (as we rely on [native TypeScript support](https://nodejs.org/en/learn/typescript/run-natively)).

### Possible future enhancements

- Add `--bun` and `--deno` flags for different TS engines
- Avoid stomping on existing files; add `--force` flag to override
- Generate multiple configs from a single script
- Preserve comments in `--unfig` output
- TS types for configs — could we generate these from JSON schemas?
