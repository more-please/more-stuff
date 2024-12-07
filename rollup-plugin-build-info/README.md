# rollup-plugin-build-info

Embed build metadata in your Rollup project (also compatible with Vite, Astro, etc).

## Installation

```sh
npm add @moreplease/rollup-plugin-build-info
```

## Usage

Add the plugin to your [Rollup](https://rollupjs.org/command-line-interface/#configuration-files) or [Vite](https://vite.dev/config/) configuration file:

```js
import buildInfo from "@moreplease/rollup-plugin-build-info";

export default {
  ...
  plugins: [
    buildInfo()
  ],
};
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
