// GitHub API response types (just the ones we need)
// Note that we don't do any runtime type validation:
// - integration test ensures that normal usage is correct;
// - schema errors result in runtime exceptions, as desired.

export type Tags = { name: string }[];

export type Tag = {
  tagger: {
    date: string;
  };
};

export type Ref = {
  object: {
    sha: string;
    url: string;
  };
};

type TreeItemCommon = {
  mode: string;
  path: string;
  type: string;
  sha: string;
  url: string;
};

export type TreeItemBlob = TreeItemCommon & {
  type: "blob";
  size: number;
};

export type TreeItemTree = TreeItemCommon & {
  type: "tree";
};

export type TreeItem = TreeItemBlob | TreeItemTree;

export type Tree = {
  sha: string;
  tree: TreeItem[];
};

export function isBlob(i: TreeItem): i is TreeItemBlob {
  return i.type === "blob";
}

export function isTree(i: TreeItem): i is TreeItemTree {
  return i.type === "tree";
}
