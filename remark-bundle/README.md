# remark-bundle

Bundles a set of linked Markdown files into a single file. We trace all the reachable files from the starting point and concatenate them.

I use this to gather all the docs for a large monorepo (not this one, although I may update it at some point) and join them into a one big setup prompt for AI coding agents.

## Installation

```
pnpm add @moreplease/remark-bundle
```

## Usage

### Command line

Once installed, you can use the `remark-bundle` command:

```bash
pnpm exec remark-bundle README.md > BUNDLE.md
```

### Programmatic

Also usable as a standalone JS function:

```ts
import { bundleMarkdownFile } from "@moreplease/remark-bundle";

const text = await bundleMarkdownFile("path/to/README.md");
```

### Remark plugin

Also usable as a Remark plugin. In this mode, you need to parse the root Markdown file yourself, and also provide a loader function that will be called every time we follow a new hyperlink. One option is `loadMarkdownFile` which just loads a file from disk.

```ts
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import remarkBundle, { loadMarkdownFile } from "@morepleae/remark-bundle";

const processor = unified()
  .use(remarkParse)
  .use(remarkBundle, {
    baseUrl: new URL("path/to/README.md", import.meta.url),
    load: loadMarkdownFile,
  })
  .use(remarkStringify);
```
