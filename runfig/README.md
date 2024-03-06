![runfig](https://raw.githubusercontent.com/more-please/more-stuff/main/runfig/runfig.svg)

Down with YAML and TOML! Generate your config files from code, the way nature intended.

## Contents

<!-- toc -->

- [Overview](#overview)
- [Installation & usage](#installation--usage)
  * [Command-line options](#command-line-options)
  * [Supported formats & file extensions](#supported-formats--file-extensions)
- [Examples](#examples)
    + [Evaluate all config scripts in the current directory](#evaluate-all-config-scripts-in-the-current-directory)
    + [Evaluate `wrangler.toml.ts` and write `wrangler.toml` in the current directory](#evaluate-wranglertomlts-and-write-wranglertoml-in-the-current-directory)
    + [Read `wrangler.toml` and bootstrap `wrangler.toml.ts`](#read-wranglertoml-and-bootstrap-wranglertomlts)
    + [Process `config/wrangler.toml.ts` and generate `config/wrangler.toml`](#process-configwranglertomlts-and-generate-configwranglertoml)
    + [Process `config/wrangler.toml.ts` and generate `wrangler.toml`](#process-configwranglertomlts-and-generate-wranglertoml)
    + [Process all subfolders in `config` and generate matching configs in `build`](#process-all-subfolders-in-config-and-generate-matching-configs-in-build)

<!-- tocstop -->

## Overview

Like all developers, I've developed some strong opinions:

1. JSON is better for config files than "human-readable" formats like YAML and TOML;
1. JavaScript is better than JSON, because you can use code;
1. TypeScript is better than JavaScript, because you can type-check it.

I made Runfig so that I can use TypeScript instead of TOML/YAML.

For example, to generate `wrangler.toml`, write a `wrangler.toml.ts` module and run `runfig`. You can also run in reverse with `runfig -u` to bootstrap the `.ts` file from an existing config file.

## Installation & usage

Install `runfig` via your package manager of choice, e.g.:

```
pnpm install runfig
```

Executing `runfig` will then:

- Scan for config files with an additional `.js` or `.ts` extension
- Load each file and extract its default export
- Convert each export to the appropriate format (JSON, YAML or TOML)
- Write a corresponding output file for each input

Config scripts are currently executed using [tsx](https://github.com/privatenumber/tsx#readme). (I may add support for Bun and Deno in future.)

### Command-line options

- `--indir`, `-i`: set input directory (default is current directory)
- `--outdir`, `-o`: set output directory (default is curent directory)
- `--recursive`, `-r`: include subdirectories (default is false)
- `--unfig`, `-u`: run in reverse to bootstrap inputs

By default, all matching files in the input directory will be processed. However, if there are positional arguments, these will be interpreted as individual files to be processed (relative to `--indir`).

### Supported formats & file extensions

| JavaScript | TypeScript | Output  |
| ---------- | ---------- | ------- |
| `.json.js` | `.json.ts` | `.json` |
| `.toml.js` | `.toml.ts` | `.toml` |
| `.yaml.js` | `.yaml.ts` | `.yaml` |
| `.yml.js ` | `.yml.ts`  | `.yml`  |

For TOML support we use [smol-toml](https://github.com/squirrelchat/smol-toml).

For YAML support we use [yaml](https://eemeli.org/yaml/#yaml).

## Examples

#### Evaluate all config scripts in the current directory

```
runfig
```

#### Evaluate `wrangler.toml.ts` and write `wrangler.toml` in the current directory

```
runfig wrangler.toml.ts
```

#### Read `wrangler.toml` and bootstrap `wrangler.toml.ts`

```
runfig --unfig wrangler.toml
runfig -u wrangler.toml
```

#### Process `config/wrangler.toml.ts` and generate `config/wrangler.toml`

```
runfig config/wrangler.toml.ts
```

#### Process `config/wrangler.toml.ts` and generate `wrangler.toml`

```
runfig --indir config wrangler.toml.ts
runfig -i config wrangler.toml.ts
```

#### Process all subfolders in `config` and generate matching configs in `build`

```
runfig --recursive --indir config --outdir build
runfig -r -i config -o build
```
