import { readFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Heading, Html, Link, Node, Root, RootContent, Text } from "mdast";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import type { Plugin, Processor } from "unified";
import { unified } from "unified";
import { visit } from "unist-util-visit";

function getHeading(root: Root): Heading | null {
  let result: Heading | null = null;
  visit(root, "heading", (heading: Heading) => {
    if (result === null || result.depth > heading.depth) {
      result = heading;
    }
  });
  return result;
}

function getText(node: Node): string {
  const spans: string[] = [];
  visit(node, "text", (text: Text) => {
    spans.push(text.value);
  });
  return spans.join("");
}

/**
 * Options for the remark-bundle plugin.
 */
export type RemarkBundleOptions = {
  /** URL of the root file. Used to detect circular references and generate anchors. */
  baseUrl: URL;
  /** Load the given URL (will be pre-resolved against baseUrl) and parse as Markdown. */
  load: (url: URL) => Root;
};

/**
 * Remark plugin to bundle linked markdown files into a single document.
 *
 * Local markdown links are replaced with internal anchors, and the linked
 * content is appended to the document. Files referenced multiple times
 * only get inlined once - subsequent references become anchor links.
 */
const remarkBundle: Plugin<[RemarkBundleOptions], Root> =
  ({ baseUrl, load }) =>
  (root: Root) => {
    // Base URL, used to identify local links.
    const baseDir = new URL(dirname(baseUrl.pathname), baseUrl);

    // URLs we've already seen, mapped to their anchors.
    const urls = new Map<string, string>();
    const anchors = new Set<string>();
    const output: RootContent[] = [];

    function addHeading(): Heading {
      const heading: Heading = { type: "heading", depth: 1, children: [] };
      output.push(heading);
      return heading;
    }

    function newAnchor(name: string): string {
      name = basename(name, extname(name));
      name = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      let result = name;
      for (let i = 2; anchors.has(result); ++i) {
        result = `${name}-${i}`;
      }
      anchors.add(result);
      return result;
    }

    // Generate output for the given tree, and return its anchor.
    function process(treeUrl: URL, tree: Root): string {
      // Register my anchor.
      const heading: Heading = getHeading(tree) ?? addHeading();
      const anchor = newAnchor(getText(heading) || treeUrl.pathname);
      urls.set(treeUrl.href, anchor);

      // Modify header to use my anchor.
      const h = `h${heading.depth}`;
      const html = heading as unknown as Html;
      html.type = "html";
      html.value = `<${h} id="${anchor}">${getText(heading)}</${h}>`;

      // Append my content.
      output.push(...tree.children);
      output.push({ type: "thematicBreak" });

      // Recursively process all my local links.
      visit(tree, "link", (link: Link) => {
        const linkUrl = new URL(link.url, treeUrl);
        const isMarkdown =
          linkUrl.pathname.endsWith(".md") ||
          linkUrl.pathname.endsWith(".markdown");
        const isLocal = linkUrl.href.startsWith(baseDir.href);
        if (isMarkdown && isLocal) {
          link.url = urls.get(linkUrl.href) ?? process(linkUrl, load(linkUrl));
        }
      });

      return anchor;
    }

    process(baseUrl, root);
    root.children = output;
  };

export default remarkBundle;

/**
 * Loader that reads files from the file system.
 */
export function loadMarkdownFile(
  parser: Processor<Root> = unified().use(remarkParse),
): (url: URL) => Root {
  return (url: URL) => {
    const path = fileURLToPath(url);
    const content = readFileSync(path, "utf-8");
    return parser.parse(content);
  };
}

/**
 * Bundle a markdown file, resolving links using the given loader.
 * Returns the bundled markdown as a string.
 *
 * @param pathOrUrl - Filename or URL
 * @param load - Loader function (default uses readFileSync)
 * @returns Bundled markdown content
 */
export async function bundleMarkdownFile(
  pathOrUrl: string | URL,
  load = loadMarkdownFile(),
): Promise<string> {
  const baseUrl =
    typeof pathOrUrl === "string" ? pathToFileURL(pathOrUrl) : pathOrUrl;
  const processor = unified()
    .use(remarkBundle, {
      baseUrl,
      load,
    })
    .use(remarkStringify, {
      rule: "-",
      emphasis: "_",
      strong: "*",
    });
  const input = load(baseUrl);
  const tree = await processor.run(input);
  return processor.stringify(tree);
}
