![GOSUB](https://raw.githubusercontent.com/more-please/more-stuff/main/gosub/gosub.svg)

GOPROXY implementation that allows Go modules to live in subdirectories

## Contents

<!-- toc -->

- [Overview](#overview)
- [Installation & usage](#installation--usage)
  * [`goproxy` mode (static config)](#goproxy-mode-static-config)
    + [Example / demo](#example--demo)
  * [`gosub` mode (dynamic config)](#gosub-mode-dynamic-config)
    + [Example / demo](#example--demo-1)
  * [Shared server](#shared-server)
- [Acknowledgements](#acknowledgements)

<!-- tocstop -->

## Overview

Gosub is a [module proxy server](https://go.dev/ref/mod#goproxy-protocol) for the Go language. It's designed to solve this issue in the `go` command:

- [cmd/go: allow serving module under the subdirectory of git repository](https://github.com/golang/go/issues/34055)

It's a small (~10KB) standalone JS module, ideal for an edge runtime like Cloudflare, Netlify or Vercel. You're also welcome to use my shared server at [gosub.moreplease.com](https://gosub.moreplease.com).

Gosub currently only supports Github, but if you're interested in using it on Gitlab, Bitbucket, etc, please get in touch.

## Installation & usage

You'll need to set up an indirection, AKA "vanity import" for your Go module. This is a `<meta name="go-import" ...>` tag on your web server that tells the Go toolchain how to find your module.

You can point your vanity import at Gosub in three different ways:

- Deploy the `goproxy` function, configured to serve a specific Go module;
- Deploy the `gosub` function, which can dynamically serve any Go module;
- Use my shared server: [gosub.moreplease.com](https://gosub.moreplease.com)

Note that by default, all Go modules are cached by [proxy.golang.org](https://proxy.golang.org); most users will get your module from there, rather than directly from your proxy server.

I'll use my own "UTF-64" module as a worked example:

- Module name: [utf64.moreplease.com](https://utf64.moreplease.com)
- Git repo: [github.com/more-please/more-stuff](https://github.com/more-please/more-stuff)
- Go source dir: [utf64/go](https://github.com/more-please/more-stuff/tree/main/utf64/go)

### `goproxy` mode (static config)

```TypeScript
type GoproxyConfig = {
  url: string; // Repo URL (currently only Github is supported)
  module?: string; // If set, Go module must match this
  directory?: string; // Subdirectory within the git repo
  tagPrefix?: string; // Prefix for version tags in git (default is "V")
  tagSuffix?: string; // Suffix for version tags in git
};

type GoproxyEnv = {
  GITHUB_TOKEN?: string; // Optional API token for GitHub
}

type Goproxy = (request: Request) => Promise<Response | undefined>

function goproxy(
  base: string,
  config: GoproxyConfig,
  env?: GoproxyEnv
): Goproxy;
```

The `goproxy` factory returns an async handler function for a Request (from the Fetch API). The handler returns:

- `undefined` on requests that don't match its base path;
- 404 on matching but invalid requests;
- GOPROXY data on valid requests.

We call the GitHub API internally to fetch data. Any GitHub error responses are passed through without modification.

To avoid being rate-limited, you should pass a [GitHub API token](https://docs.github.com/en/rest/overview/authenticating-to-the-rest-api?apiVersion=2022-11-28) in the `GITHUB_TOKEN` environment variable. By default we'll try to use the system environment (we try both `process.env` and `Deno.env`). To set the environment explicitly, use the `env` parameter; to prevent any environment lookup, use the value `{}`.

#### Example / demo

The [root page](https://github.com/more-please/more-stuff/blob/main/utf64/website/src/routes/index.tsx) for my module's domain has the "vanity import" tag:

```HTML
  <meta
    name="go-import"
    content="utf64.moreplease.com mod https://utf64.moreplease.com/go"
  />
```

This instructs the Go toolchain to look for a `mod` (module server) at `/go` on the same domain. I [deploy the `goproxy` function](https://github.com/more-please/more-stuff/blob/main/utf64/website/src/routes/go/%5B...goproxy%5D.ts) as follows:

```JavaScript
import { goproxy } from "gosub-goproxy";

const handler = goproxy("/go", {
  url: "https://github.com/more-please/more-stuff",
  module: "utf64.moreplease.com",
  directory: "utf64/go",
  tagPrefix: "utf64-go-",
});
```

The repo has version tags like `utf64-go-0.0.11`, etc. Goproxy ignores tags without the `utf64-go-` prefix.

The GOPROXY path to list module versions is `$base/$module/@v/list`, or in this case:

- [utf64.moreplease.com/go/utf64.moreplease.com/@v/list](https://utf64.moreplease.com/go/utf64.moreplease.com/@v/list)

### `gosub` mode (dynamic config)

```TypeScript
function gosubEncode(config: GoproxyConfig): string;
function gosubDecode(path: string): GoproxyConfig | undefined;
function gosub(base: string = "/", env?: GoproxyEnv): Goproxy;
```

This is a wrapper for `goproxy` that takes its configuration from the URL. Call the `gosubEncode` function to convert a config struct into a URL pathname that `gosub` understands.

#### Example / demo

Recall the configuration for `utf64.moreplease.com`:

```TypeScript
{
  url: "https://github.com/more-please/more-stuff",
  module: "utf64.moreplease.com",
  directory: "utf64/go",
  tagPrefix: "utf64-go-",
}
```

This encodes to:

```
github.com/more-please/more-stuff:d=utf64%2Fgo&m=utf64.moreplease.com&p=utf64-go-;
```

Note that we can omit `module` from the config, in which case we get:

```
github.com/more-please/more-stuff:d=utf64%2Fgo&p=go-;
```

The only advantage of setting `module` explicitly is that it blocks nonsense lookups like `wrong-module-name/@v/list`.

Putting it all together, the `@v/list` command for `utf64.moreplease.com` using my `gosub` server deployed at [gosub.moreplease.com](https://gosub.moreplease.com) is:

- [gosub.moreplease.com/github.com/more-please/more-stuff:d=utf64%2Fgo&p=utf64-go-;/utf64.moreplease.com/@v/list](https://gosub.moreplease.com/github.com/more-please/more-stuff:d=utf64%2Fgo&p=utf64-go-;/utf64.moreplease.com/@v/list)

### Shared server

As noted above, you're welcome to use the `gosub` server at [gosub.moreplease.com](https://gosub.moreplease.com). That site also has a handy web form where you can plug in your repo URL and other config details to generate the proxy path.

All users share the same GitHub API key, so it may get overloaded. However, once your Go module has been cached by [proxy.golang.org](https://proxy.golang.org) your users mostly won't be hitting my site directly.

## Acknowledgements

Partly [inspired by](https://mastodon.scot/@iainmerrick/111069329750890072) stumbling across [GitPkg](https://gitpkg.vercel.app), which solves a very similar problem in the NPM ecosystem. In particular, I copied the nifty idea of having a shared server that's programmable via URL parameters.
