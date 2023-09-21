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

const ItemCommon = object({
  mode: string(),
  path: string(),
  type: string(),
  sha: string(),
  url: string(),
});
const ItemBlob = object({ type: literal("blob"), size: number() });
const ItemTree = object({ type: literal("tree") });
const Item = union([
  merge([ItemCommon, ItemBlob]),
  merge([ItemCommon, ItemTree]),
]);

type Item = Output<typeof Item>;

export const Tree = object({
  sha: string(),
  tree: array(Item),
});

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
