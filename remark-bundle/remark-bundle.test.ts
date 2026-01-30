import { dirname } from "node:path";
import { expect, test } from "vitest";
import { bundleMarkdownFile } from "./remark-bundle.ts";

test.each([
  "simple/main.md",
  "circular/a.md",
  "external/main.md",
  "noheader/main.md",
  "duplicate-anchors/main.md",
])("%s", async (path: string) => {
  const input = new URL(`test/input/${path}`, import.meta.url);
  const output = `test/output/${dirname(path)}.md`;
  const result = await bundleMarkdownFile(input);
  await expect(result).toMatchFileSnapshot(output);
});
