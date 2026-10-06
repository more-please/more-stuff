import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Heading, Link, PhrasingContent, Root, RootContent, Text } from "mdast";

const processor = unified().use(remarkParse).use(remarkStringify);

const root = (...children: RootContent[]): Root => ({ type: "root", children });
const h2 = (...children: PhrasingContent[]): Heading => ({ type: "heading", depth: 2, children });
const link = (url: string, ...children: PhrasingContent[]): Link => ({ type: "link", url, children });
const text = (value: string): Text => ({ type: "text", value });

const readmes = readdirSync(".", { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map(dir => join(dir.name, "README.md"))
  .filter((path) => existsSync(path))
  .sort();

const rows = readmes.flatMap(path => {
  const readme = readFileSync(path, "utf-8");
  const tree = processor.parse(readme);
  const desc = tree.children[1];
  return [
    h2(link(path, text(dirname(path)))),
    desc
  ];
})

const body = processor.stringify(root(...rows));

export default `
# More Please! open source

[![test](https://github.com/more-please/more-stuff/actions/workflows/test.yml/badge.svg?event=pull_request)](https://github.com/more-please/more-stuff/actions/workflows/test.yml)

${body}
`;
