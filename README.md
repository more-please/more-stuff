![GOSUB](assets/gosub.svg)

GOPROXY implementation that allows Go modules to live in subdirectories

[![Test](https://github.com/more-please/gosub-goproxy/actions/workflows/test.yml/badge.svg)](https://github.com/more-please/gosub-goproxy/actions/workflows/test.yml)

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
- Go source: [github.com/more-please/utf64/go](https://github.com/more-please/utf64/tree/main/go)

### `goproxy` mode (static config)

```TypeScript
type GoproxyConfig = {
  url: string; // Repo URL (currently only Github is supported)
  module?: string; // If set, Go module must match this
  directory?: string; // Subdirectory within the git repo
  tagPrefix?: string; // Prefix for version tags in git (default is "V")
  tagSuffix?: string; // Suffix for version tags in git
  githubToken?: string; // Optional GitHub API token
};

type Goproxy = (request: Request) => Promise<Response | undefined>

function goproxy(base: string, config: GoproxyConfig): Goproxy;
```

The `goproxy` factory returns an async handler function for a Request (from the Fetch API). The handler returns:

- `undefined` on requests that don't match its base path;
- 404 on matching but invalid requests;
- GOPROXY data on valid requests.

#### Example / demo

The [root page](https://github.com/more-please/utf64/blob/main/website/src/routes/%2Bpage.svelte) for my module's domain has the "vanity import" tag:

```HTML
  <meta
    name="go-import"
    content="utf64.moreplease.com mod https://utf64.moreplease.com/go"
  />
```

This instructs the Go toolchain to look for a `mod` (module server) at `/go` on the same domain. I [deploy the `goproxy` function](https://github.com/more-please/utf64/blob/main/website/src/routes/go/%5B...goproxy%5D/%2Bserver.ts) as follows:

```JavaScript
import { goproxy } from "gosub-goproxy";

const handler = goproxy("/go", {
  url: "https://github.com/more-please/utf64",
  module: "utf64.moreplease.com",
  directory: "go",
  tagPrefix: "go-",
});
```

The repo has version tags like `go-0.0.11`, etc. Goproxy ignores tags without the `go-` prefix.

The GOPROXY path to list module versions is `$base/$module/@v/list`, or in this case:

- [utf64.moreplease.com/go/utf64.moreplease.com/@v/list](https://utf64.moreplease.com/go/utf64.moreplease.com/@v/list)

### `gosub` mode (dynamic config)

```TypeScript
function gosubEncode(config: GoproxyConfig): string;
function gosubDecode(path: string): GoproxyConfig | undefined;
function gosub(base: string = "/"): Goproxy;
```

This is a wrapper for `goproxy` that takes its configuration from the URL. Call the `gosubEncode` function to convert a config struct into a URL pathname that `gosub` understands.

#### Example / demo

Recall the configuration for `utf64.moreplease.com`:

```TypeScript
{
  url: "https://github.com/more-please/utf64",
  module: "utf64.moreplease.com",
  directory: "go",
  tagPrefix: "go-",
}
```

This encodes to:

```
github.com/more-please/utf64:d=go&m=utf64.moreplease.com&p=go-;
```

Note that we can omit `module`, in which case we get:

```
github.com/more-please/utf64:d=go&p=go-;
```

Putting it all together, the module proxy path for `utf64.moreplease.com` using my `gosub` server deployed at `gosub.moreplease.com` is:

- [gosub.moreplease.com/github.com/more-please/utf64:d=go&p=go-;](https://gosub.moreplease.com/github.com/more-please/utf64:d=go&p=go-;)

The only advantage of setting `module` explicitly is that it blocks nonsense lookups like `wrong-module-name/@v/list`.

### Shared server

As noted above, you're welcome to use the `gosub` server at [gosub.moreplease.com](https://gosub.moreplease.com). That site also has a handy web form where you can plug in your repo URL and other config details to generate the proxy path.

That site uses a GitHub API key that is rate-limited to 5000 requests per hour, so it may get overloaded. However, once your Go module has been cached by [proxy.golang.org](https://proxy.golang.org) your users mostly won't be hitting my site directly.

## Acknowledgements

Partly [inspired by](https://mastodon.scot/@iainmerrick/111069329750890072) stumbling across [GitPkg](https://gitpkg.vercel.app), which solves a very similar problem in the NPM ecosystem. In particular, I copied the nifty idea of having a shared server that's programmable via URL parameters.
