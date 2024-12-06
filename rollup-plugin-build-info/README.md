# rollup-plugin-build-info

Embed build metadata in your Rollup project (also compatible with Vite, Astro, etc).

## Installation

```sh
npm install @moreplease/rollup-plugin-build-info
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

At build time, we fetch the current time and git commit (using `git rev-parse HEAD`). Retrieve it in your code by importing `build-info`:

```js
import buildInfo from "build-info";
// {
//   timestamp: Date;
//   branch: string;
//   commit: {
//     hash: string;
//     author: {
//       name: string;
//       email: string;
//       timestamp: Date;
//     }
//   }
// }

// Or if you prefer, import each field separately
import { commit, timestamp } from "build-info";
```
