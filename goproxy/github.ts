import {
  Output,
  array,
  literal,
  merge,
  number,
  object,
  string,
  union,
} from "valibot";

export const Tags = array(
  object({
    name: string(),
  }),
);

export const Tag = object({
  tagger: object({
    date: string(),
  }),
});

export const Ref = object({
  object: object({
    sha: string(),
    url: string(),
  }),
});

const TreeItemCommon = object({
  mode: string(),
  path: string(),
  type: string(),
  sha: string(),
  url: string(),
});

export const TreeItemBlob = merge([
  TreeItemCommon,
  object({ type: literal("blob"), size: number() }),
]);
export type TreeItemBlob = Output<typeof TreeItemBlob>;

export const TreeItemTree = merge([
  TreeItemCommon,
  object({ type: literal("tree") }),
]);
export type TreeItemTree = Output<typeof TreeItemTree>;

export const TreeItem = union([TreeItemBlob, TreeItemTree]);
export type TreeItem = Output<typeof TreeItem>;

export const Tree = object({
  sha: string(),
  tree: array(TreeItem),
});
export type Tree = Output<typeof Tree>;

export function isBlob(i: TreeItem): i is TreeItemBlob {
  return i.type === "blob";
}

export function isTree(i: TreeItem): i is TreeItemTree {
  return i.type === "tree";
}

const NEXT_LINK = /(?<=<)([\S]*)(?=>; rel="Next")/i;

export const API = "https://api.github.com";

export async function* paginate(
  url: string,
  options?: RequestInit,
): AsyncGenerator<Response> {
  while (url) {
    const response = await fetch(url, options);
    const link = response.headers.get("link");
    yield response;
    url = (link && link.match(NEXT_LINK)?.[0]) ?? "";
  }
}
