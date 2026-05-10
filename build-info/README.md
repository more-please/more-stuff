# @moreplease/build-info

Embed build metadata in your bundled code.

This is a placeholder for [@moreplease/esbuild-plugin-build-info](../esbuild-plugin-build-info) and [@moreplease/rollup-plugin-build-info](../rollup-plugin-build-info), which embed build metadata in your bundled code, via the virtual import `@moreplease/build-info`.

This package allows the virtual import to resolve without bundling, by initializing `branch`, `commit` and `timestamp` at runtime. This is handy when you want to be able to run scripts without bundling.

## Installation

```sh
pnpm add @moreplease/esbuild-plugin-build-info
```

## Usage

Add the plugin to your [esbuild](https://esbuild.github.io/plugins/#using-plugins) script:

```ts
import buildInfo from '@moreplease/esbuild-plugin-build-info';
import * as esbuild from 'esbuild';

await esbuild.build({
  ...
  plugins: [
    buildInfo()
  ],
});
```

At build time, we fetch the current time, git branch name and commit SHA. We get the git info from environment variables if possible (`GITHUB_REF_NAME` and `GITHUB_SHA`), otherwise we call `git` directly.

The build info looks like this:

```ts
type BuildInfo = {
  branch: string;
  commit: string;
  timestamp: Date;
}
```

Use it in your code by importing `build-info`:
```js
import buildInfo from "build-info";

// Or if you prefer, import each field separately
import { branch, commit, timestamp } from "build-info";
```
